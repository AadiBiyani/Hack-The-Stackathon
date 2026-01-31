/**
 * POST /api/match
 * Body: { patient_id: string }
 * Fetches patient and trials filesystem from Python backend, runs Vercel AI SDK
 * agent (bash-tool + OpenAI), parses top 3 matches, posts to Python /api/matches.
 */

import { openai } from "@ai-sdk/openai";
import { Output, ToolLoopAgent, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";
import { NextResponse } from "next/server";
import { z } from "zod";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

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
  // Try to find a code block containing "matches" or "top_matches"
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.includes('"matches"') || content.includes('"top_matches"')) {
      return content;
    }
  }

  // Try to extract a complete JSON object from the text
  // Find the first { and match braces to find the complete object
  const start = text.indexOf("{");
  if (start !== -1) {
    let braceCount = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") braceCount++;
      if (text[i] === "}") braceCount--;
      if (braceCount === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

// Normalize the agent response to our expected format
function normalizeMatches(raw: Record<string, unknown>): { matches: Array<Record<string, unknown>> } {
  // Handle "top_matches" key (agent sometimes uses this)
  const matchesArray = raw.matches || raw.top_matches;
  
  if (!Array.isArray(matchesArray)) {
    throw new Error("No matches array found in response");
  }

  // Normalize each match item
  const normalized = matchesArray.slice(0, 3).map((item: Record<string, unknown>) => ({
    nct_id: item.nct_id || item.nctId || item.id || "",
    trial_title: item.trial_title || item.title || item.name || "",
    match_score: typeof item.match_score === "number" ? item.match_score : 
                 typeof item.score === "number" ? item.score : 80,
    reasoning: item.reasoning || item.reason || item.rationale || 
               item.match_reason || item.description || "",
  }));

  return { matches: normalized };
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

  // 4. OpenAI model with AI SDK v6 ToolLoopAgent
  const model = openai(OPENAI_MODEL);

  const systemPrompt = `You are a clinical trial matching agent. You have access to a read-only filesystem containing markdown files of clinical trials.

Your task: Given a patient profile, use the bash tool to explore the filesystem (e.g. ls, find, cat, grep) and identify the top 3 clinical trials that best match the patient. Consider eligibility, phase, location, and relevance to their condition.

IMPORTANT: Your final response MUST be ONLY a JSON object in this EXACT format (no markdown, no explanation, just the JSON):
{
  "matches": [
    {"nct_id": "NCT12345678", "trial_title": "Trial Name", "match_score": 85, "reasoning": "Why this matches"},
    {"nct_id": "NCT87654321", "trial_title": "Another Trial", "match_score": 75, "reasoning": "Why this matches"}
  ]
}

Rules:
- Return 1-3 matches maximum
- nct_id must be the NCT identifier from the filename
- match_score is 0-100
- Order by match_score descending
- DO NOT include any text before or after the JSON`;

  const userPrompt = `Patient profile:
- Name: ${patient.name || "N/A"}
- Age: ${patient.age ?? "N/A"}
- Condition: ${patient.condition || "N/A"}
- Location: ${patient.location || "N/A"}
- Prior treatments: ${(patient.prior_treatments || []).join(", ") || "None"}
- Comorbidities: ${(patient.comorbidities || []).join(", ") || "None"}
- Time commitment: ${patient.time_commitment || "N/A"}

Find the top 3 matching trials and return the JSON block.`;

  let resultText: string;
  try {
    // Use ToolLoopAgent from AI SDK v6 as shown in bash-tool docs
    const agent = new ToolLoopAgent({
      model,
      tools,
      stopWhen: stepCountIs(20),
    });

    // Combine system and user prompts since ToolLoopAgent doesn't have a system parameter
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    const result = await agent.generate({
      prompt: fullPrompt,
    });

    resultText = result.text || "";
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Agent run failed", detail: err },
      { status: 500 }
    );
  }

  const jsonStr = extractJsonBlock(resultText);
  if (!jsonStr) {
    return NextResponse.json(
      { error: "Agent did not return valid JSON block", raw: resultText.slice(0, 500) },
      { status: 500 }
    );
  }

  let parsed: z.infer<typeof TopMatchesSchema>;
  try {
    const raw = JSON.parse(jsonStr);
    const normalized = normalizeMatches(raw);
    parsed = TopMatchesSchema.parse(normalized);
  } catch (e) {
    return NextResponse.json(
      { 
        error: "Invalid matches JSON", 
        detail: String(e),
        extracted_json: jsonStr.slice(0, 1000),
        raw_text_end: resultText.slice(-2000),
      },
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
