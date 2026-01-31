"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Brain,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface Patient {
  _id: string;
  name: string;
  condition: string;
}

interface Match {
  nct_id: string;
  trial_title?: string;
  match_score: number;
  reasoning?: string;
}

interface MatchResult {
  success: boolean;
  patient_id: string;
  matches: Match[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

export default function MatchPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/patients/${patientId}`);
      if (!res.ok) throw new Error("Patient not found");
      const data = await res.json();
      setPatient(data.patient || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  const runMatching = async () => {
    setMatching(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 2000);

    try {
      const gatewayUrl = GATEWAY_URL || window.location.origin;
      const res = await fetch(`${gatewayUrl}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.detail || "Matching failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Matching failed");
    } finally {
      setMatching(false);
    }
  };

  const formatCondition = (condition: string) => {
    return condition
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "secondary";
  };

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Link href="/patients">
              <Button variant="outline">Back to Patients</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Link
        href={`/patients/${patientId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patient
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Trial Matching</CardTitle>
              <CardDescription>
                Finding clinical trials for {patient?.name} ({formatCondition(patient?.condition || "")})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!matching && !result && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Find Matches</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Our AI agent will analyze the patient profile against thousands of clinical trials
                to find the best matches.
              </p>
              <Button onClick={runMatching} size="lg" className="gap-2">
                <Brain className="h-4 w-4" />
                Start Matching
              </Button>
            </div>
          )}

          {matching && (
            <div className="py-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-lg font-medium">AI Agent Working...</span>
              </div>
              <Progress value={progress} className="mb-4" />
              <p className="text-center text-sm text-muted-foreground">
                Analyzing eligibility criteria and matching patient profile...
                <br />
                This may take 30-60 seconds.
              </p>
            </div>
          )}

          {error && !matching && (
            <div className="py-8">
              <div className="flex flex-col items-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">Matching Failed</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
                <Button onClick={runMatching} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {result && result.matches && result.matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">
              Found {result.matches.length} Matching Trial{result.matches.length > 1 ? "s" : ""}
            </h2>
          </div>

          {result.matches.map((match, index) => (
            <Card key={match.nct_id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <Badge variant={getScoreBadge(match.match_score) as "success" | "warning" | "secondary"}>
                        {match.match_score}% Match
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {match.trial_title || match.nct_id}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Trial ID: {match.nct_id}
                    </CardDescription>
                  </div>
                  <a
                    href={`https://clinicaltrials.gov/study/${match.nct_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      View Trial
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </CardHeader>
              {match.reasoning && (
                <>
                  <Separator />
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-2">Why This Matches</h4>
                    <p className="text-sm text-muted-foreground">{match.reasoning}</p>
                  </CardContent>
                </>
              )}
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Match Score:</span>
                  <Progress value={match.match_score} className="flex-1 h-2" />
                  <span className={`text-sm font-medium ${getScoreColor(match.match_score)}`}>
                    {match.match_score}%
                  </span>
                </div>
              </div>
            </Card>
          ))}

          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground text-center">
                Match results have been saved and notification emails sent to the patient and doctor.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
