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
  RefreshCw,
  User,
  Mail,
  MapPin,
  Calendar,
  Activity,
  Pill,
  Heart,
  Clock,
  Stethoscope
} from "lucide-react";

interface Patient {
  _id: string;
  name: string;
  email: string;
  age: number;
  condition: string;
  location: string;
  prior_treatments?: string[];
  comorbidities?: string[];
  time_commitment?: string;
  doctor_name?: string;
  doctor_email?: string;
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
      <div className="container py-8 flex items-center justify-center min-h-[60vh]">
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
    <div className="container py-8">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      {/* Side-by-side layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Patient Profile */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Profile
          </h2>

          {/* Patient Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{patient?.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3" />
                    {patient?.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge className="text-sm">{formatCondition(patient?.condition || "")}</Badge>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm"><strong>Age:</strong> {patient?.age} years</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm"><strong>Location:</strong> {patient?.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm"><strong>Time Commitment:</strong> {patient?.time_commitment || "Not specified"}</span>
              </div>
              {patient?.doctor_name && (
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm"><strong>Physician:</strong> {patient.doctor_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prior Treatments */}
          {patient?.prior_treatments && patient.prior_treatments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Prior Treatments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {patient.prior_treatments.map((treatment, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {treatment}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comorbidities */}
          {patient?.comorbidities && patient.comorbidities.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Comorbidities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {patient.comorbidities.map((condition, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Matching Results */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Trial Matching
          </h2>

          {/* Matching Control Card */}
          <Card>
            <CardContent className="pt-6">
              {!matching && !result && (
                <div className="text-center py-4">
                  <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Ready to Find Matches</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI will analyze this patient against clinical trials
                  </p>
                  <Button onClick={runMatching} className="gap-2">
                    <Brain className="h-4 w-4" />
                    Start Matching
                  </Button>
                </div>
              )}

              {matching && (
                <div className="py-4">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">AI Agent Working...</span>
                  </div>
                  <Progress value={progress} className="mb-3" />
                  <p className="text-center text-xs text-muted-foreground">
                    Analyzing eligibility criteria... (30-60 seconds)
                  </p>
                </div>
              )}

              {error && !matching && (
                <div className="py-4 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Matching Failed</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">{error}</p>
                  <Button onClick={runMatching} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              )}

              {result && result.matches && result.matches.length > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    Found {result.matches.length} Matching Trial{result.matches.length > 1 ? "s" : ""}
                  </span>
                  <Button 
                    onClick={runMatching} 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Re-run
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match Results */}
          {result && result.matches && result.matches.length > 0 && (
            <div className="space-y-3">
              {result.matches.map((match, index) => (
                <Card key={match.nct_id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                          <Badge 
                            variant={getScoreBadge(match.match_score) as "success" | "warning" | "secondary"}
                            className="text-xs"
                          >
                            {match.match_score}%
                          </Badge>
                        </div>
                        <CardTitle className="text-sm leading-tight">
                          {match.trial_title || match.nct_id}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {match.nct_id}
                        </CardDescription>
                      </div>
                      <a
                        href={`https://clinicaltrials.gov/study/${match.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                          View
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    </div>
                  </CardHeader>
                  {match.reasoning && (
                    <>
                      <Separator />
                      <CardContent className="pt-3 pb-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {match.reasoning}
                        </p>
                      </CardContent>
                    </>
                  )}
                  <div className="px-6 pb-3">
                    <div className="flex items-center gap-2">
                      <Progress value={match.match_score} className="flex-1 h-1.5" />
                      <span className={`text-xs font-medium ${getScoreColor(match.match_score)}`}>
                        {match.match_score}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))}

              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground text-center">
                    Results saved. Notifications sent to patient and doctor.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty state when no results yet and not loading */}
          {!matching && !result && !error && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Start Matching" to find clinical trials
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
