/**
 * POST /api/match
 * Body: { patient_id: string }
 * Fetches patient and trials filesystem from Python backend, runs Vercel AI SDK
 * agent (bash-tool + OpenAI), parses top 3 matches, posts to Python /api/matches.
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createBashTool } from "bash-tool";
import { NextResponse } from "next/server";
import { z } from "zod";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const MatchItemSchema = z.object({
  nct_id: z.string(),
  trial_title: z.string().optional(),
  match_score: z.number().min(0).max(100),
  reasoning: z.string().optional(),
});

const TopMatchesSchema = z.object({
  matches: z.array(MatchItemSchema).min(1).max(3),
});

function extractJsonBlock(text: string): string | null {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return null;
}

export async function POST(request: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body: { patient_id: string };
  try {
    body = await request.json();
    if (!body?.patient_id) {
      return NextResponse.json(
        { error: "Missing patient_id in body" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { patient_id } = body;

  // 1. Fetch patient from Python backend
  const patientRes = await fetch(`${BACKEND_URL}/api/patients/${patient_id}`);
  if (!patientRes.ok) {
    const msg = await patientRes.text();
    const status = patientRes.status;
    if (status === 400 && msg.includes("Invalid patient ID format")) {
      return NextResponse.json(
        {
          error: "Invalid patient ID format",
          detail: "patient_id must be a valid MongoDB ObjectId (24 hex characters). Create a patient via POST /api/patients and use the returned patient_id.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch patient", detail: msg },
      { status: status === 404 ? 404 : 502 }
    );
  }
  const patientData = await patientRes.json();
  const patient = patientData.patient || patientData;
  const condition = patient.condition || "";

  if (!condition) {
    return NextResponse.json(
      { error: "Patient has no condition" },
      { status: 400 }
    );
  }

  // 2. Fetch trials filesystem from Python backend
  const normCondition = condition.replace(/\s+/g, "_");
  const fsRes = await fetch(
    `${BACKEND_URL}/api/trials/filesystem/${encodeURIComponent(normCondition)}`
  );
  if (!fsRes.ok) {
    const msg = await fsRes.text();
    return NextResponse.json(
      { error: "Failed to fetch trials filesystem", detail: msg },
      { status: 502 }
    );
  }
  const fsData = await fsRes.json();
  const filesystem: Record<string, string> = fsData.filesystem || fsData.files || {};

  if (Object.keys(filesystem).length === 0) {
    return NextResponse.json(
      { error: "No trials found for condition", condition },
      { status: 404 }
    );
  }

  // 3. Build bash-tool with in-memory filesystem
  const { tools } = await createBashTool({ files: filesystem });

  // 4. OpenAI model (AI SDK 4 – no v2 requirement; works with gpt-5-mini)
  const model = openai(OPENAI_MODEL);

  const systemPrompt = `You are a clinical trial matching agent. You have access to a read-only filesystem containing markdown files of clinical trials. Each file is at a path like trials/{condition}/{phase}/NCT12345678.md.

Your task: Given a patient profile, use the bash tool to explore the filesystem (e.g. ls, find, cat, grep) and identify the top 3 clinical trials that best match the patient. Consider eligibility, phase, location, and relevance to their condition.

At the end, respond with a single JSON block (no other text) in this exact format:
\`\`\`json
{
  "matches": [
    { "nct_id": "NCT...", "trial_title": "...", "match_score": 0-100, "reasoning": "..." },
    ...
  ]
}
\`\`\`
Include exactly 1 to 3 matches, ordered by match_score descending.`;

  const userPrompt = `Patient profile:
- Name: ${patient.name || "N/A"}
- Age: ${patient.age ?? "N/A"}
- Condition: ${patient.condition || "N/A"}
- Location: ${patient.location || "N/A"}
- Prior treatments: ${(patient.prior_treatments || []).join(", ") || "None"}
- Comorbidities: ${(patient.comorbidities || []).join(", ") || "None"}
- Time commitment: ${patient.time_commitment || "N/A"}

Find the top 3 matching trials and return the JSON block.`;

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      tools: { bash: tools.bash },
      maxSteps: 20,
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Agent run failed", detail: err },
      { status: 500 }
    );
  }

  const text = result.text || "";
  const jsonStr = extractJsonBlock(text);
  if (!jsonStr) {
    return NextResponse.json(
      { error: "Agent did not return valid JSON block", raw: text.slice(0, 500) },
      { status: 500 }
    );
  }

  let parsed: z.infer<typeof TopMatchesSchema>;
  try {
    const raw = JSON.parse(jsonStr);
    parsed = TopMatchesSchema.parse(raw);
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid matches JSON", detail: String(e) },
      { status: 500 }
    );
  }

  // 5. Post matches to Python backend
  const matchesPayload = {
    patient_id,
    matches: parsed.matches.map((m) => ({
      nct_id: m.nct_id,
      trial_title: m.trial_title,
      match_score: m.match_score,
      reasoning: m.reasoning,
    })),
    send_email: true,
  };

  const postRes = await fetch(`${BACKEND_URL}/api/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(matchesPayload),
  });

  if (!postRes.ok) {
    const msg = await postRes.text();
    return NextResponse.json(
      { error: "Failed to store matches in backend", detail: msg, matches: parsed.matches },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    patient_id,
    matches: parsed.matches,
    stored: true,
  });
}
