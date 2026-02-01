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
  Stethoscope,
  ChevronDown,
  FlaskConical,
  Scale,
  ShieldAlert,
  Syringe,
  FileText,
  Users,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  defaultOpen = false, 
  badge,
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">{title}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-xs">{badge}</Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
          {children}
        </div>
      </div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex justify-between items-center py-1.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value || "N/A"}</span>
    </div>
  );
}

interface Medication {
  name: string;
  rxnorm_code?: string;
  start_date?: string;
  reason?: string;
  dose?: string;
}

interface Condition {
  name: string;
  snomed_code?: string;
  onset_date?: string;
  is_active?: boolean;
  is_primary?: boolean;
}

interface Patient {
  _id: string;
  name: string;
  email: string;
  synthea_id?: string;
  age: number;
  birth_date?: string;
  sex?: string;
  race?: string;
  ethnicity?: string;
  condition: string;
  location: string;
  location_details?: {
    city?: string;
    state?: string;
    zip?: string;
  };
  primary_diagnosis?: {
    condition?: string;
    snomed_code?: string;
    diagnosis_date?: string;
    years_since_diagnosis?: number;
  };
  disease_activity?: {
    das28?: number;
    cdai?: number;
    sdai?: number;
    disease_severity?: string;
  } | null;
  labs?: {
    wbc?: number;
    hemoglobin?: number;
    platelets?: number;
    esr?: number;
    crp?: number;
    egfr?: number;
    rf_positive?: boolean;
    anti_ccp_positive?: boolean;
    alt?: number;
    ast?: number;
  };
  vitals?: {
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    height_cm?: number;
    weight_kg?: number;
    bmi?: number;
  };
  treatments?: {
    conventional_dmards?: string[];
    conventional_dmards_failed?: number;
    biologics?: string[];
    biologics_failed?: number;
    jak_inhibitors?: string[];
    jak_inhibitors_failed?: number;
    current_medications?: Medication[];
    total_failed_therapies?: number;
    biologic_naive?: boolean;
  };
  prior_treatments?: string[];
  conditions?: Condition[];
  comorbidities?: string[];
  exclusions?: {
    pregnancy_status?: string;
    nursing?: boolean;
    recent_infections?: boolean;
    active_malignancy?: boolean;
    hiv_positive?: boolean;
    hepatitis_b?: boolean;
    hepatitis_c?: boolean;
    tb_history?: boolean;
    recent_live_vaccine?: boolean;
    recent_surgery?: boolean;
  };
  allergies?: Array<{ allergen: string; severity?: string }>;
  time_commitment?: string;
  doctor_name?: string;
  doctor_email?: string;
  data_source?: string;
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
  cached?: boolean;
  cached_at?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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
    fetchPatientAndCachedMatches();
  }, [patientId]);

  const fetchPatientAndCachedMatches = async () => {
    setLoading(true);
    try {
      const [patientRes, cachedRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/patients/${patientId}`),
        fetch(`${BACKEND_URL}/api/patients/${patientId}/cached-matches`),
      ]);

      if (!patientRes.ok) throw new Error("Patient not found");
      const patientData = await patientRes.json();
      setPatient(patientData.patient || patientData);

      if (cachedRes.ok) {
        const cachedData = await cachedRes.json();
        if (cachedData.has_cached && cachedData.matches?.length > 0) {
          setResult({
            success: true,
            patient_id: patientId,
            matches: cachedData.matches,
            cached: true,
            cached_at: cachedData.updated_at,
          });
        }
      }
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
      const res = await fetch(`/api/match`, {
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCachedTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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

  const labs = patient?.labs || {};
  const vitals = patient?.vitals || {};
  const treatments = patient?.treatments || {};
  const exclusions = patient?.exclusions || {};
  const primaryDx = patient?.primary_diagnosis || {};
  const diseaseActivity = patient?.disease_activity || {};

  return (
    <div className="container py-6 max-w-7xl">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{patient?.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge>{formatCondition(patient?.condition || "")}</Badge>
              <span>•</span>
              <span>{patient?.age}yo {patient?.sex === "F" ? "Female" : patient?.sex === "M" ? "Male" : ""}</span>
              <span>•</span>
              <span>{patient?.location}</span>
            </div>
          </div>
        </div>
        {patient?.data_source && (
          <Badge variant="outline" className="text-xs">
            {patient.data_source}
          </Badge>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column - Patient Profile (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {/* Demographics - Always Open */}
          <CollapsibleSection title="Demographics" icon={Users} defaultOpen>
            <div className="space-y-1">
              <InfoRow label="Age" value={`${patient?.age} years`} />
              <InfoRow label="Sex" value={patient?.sex === "F" ? "Female" : patient?.sex === "M" ? "Male" : patient?.sex} />
              <InfoRow label="Birth Date" value={formatDate(patient?.birth_date)} />
              <InfoRow label="Race" value={<span className="capitalize">{patient?.race}</span>} />
              <InfoRow label="Ethnicity" value={<span className="capitalize">{patient?.ethnicity}</span>} />
              <InfoRow label="Location" value={patient?.location} />
            </div>
          </CollapsibleSection>

          {/* Primary Diagnosis */}
          <CollapsibleSection title="Primary Diagnosis" icon={Activity} defaultOpen>
            <div className="space-y-2">
              <Badge className="mb-2">{formatCondition(patient?.condition || "")}</Badge>
              <div className="space-y-1">
                <InfoRow label="SNOMED Code" value={<code className="text-[10px]">{primaryDx.snomed_code}</code>} />
                <InfoRow label="Diagnosis Date" value={formatDate(primaryDx.diagnosis_date)} />
                <InfoRow label="Duration" value={primaryDx.years_since_diagnosis ? `${primaryDx.years_since_diagnosis.toFixed(1)} years` : "N/A"} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Disease Activity */}
          <CollapsibleSection title="Disease Activity" icon={Activity}>
            {diseaseActivity && Object.keys(diseaseActivity).length > 0 ? (
              <div className="space-y-1">
                <InfoRow label="DAS28" value={diseaseActivity.das28} />
                <InfoRow label="CDAI" value={diseaseActivity.cdai} />
                <InfoRow label="SDAI" value={diseaseActivity.sdai} />
                <InfoRow label="Severity" value={
                  diseaseActivity.disease_severity && (
                    <Badge variant="outline" className="text-xs capitalize">{diseaseActivity.disease_severity}</Badge>
                  )
                } />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No disease activity data</p>
            )}
          </CollapsibleSection>

          {/* Labs */}
          <CollapsibleSection title="Laboratory Values" icon={FlaskConical}>
            <div className="space-y-2">
              <div className="flex gap-2 mb-2">
                <Badge variant={labs.rf_positive ? "default" : "secondary"} className="text-xs">
                  RF {labs.rf_positive === true ? "+" : labs.rf_positive === false ? "-" : "?"}
                </Badge>
                <Badge variant={labs.anti_ccp_positive ? "default" : "secondary"} className="text-xs">
                  CCP {labs.anti_ccp_positive === true ? "+" : labs.anti_ccp_positive === false ? "-" : "?"}
                </Badge>
              </div>
              <div className="space-y-1">
                <InfoRow label="WBC" value={labs.wbc} />
                <InfoRow label="Hemoglobin" value={labs.hemoglobin ? `${labs.hemoglobin} g/dL` : undefined} />
                <InfoRow label="Platelets" value={labs.platelets} />
                <InfoRow label="ESR" value={labs.esr ? `${labs.esr} mm/hr` : undefined} />
                <InfoRow label="CRP" value={labs.crp ? `${labs.crp} mg/L` : undefined} />
                <InfoRow label="eGFR" value={labs.egfr ? `${labs.egfr} mL/min` : undefined} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Vitals */}
          <CollapsibleSection title="Vitals" icon={Scale}>
            <div className="space-y-1">
              <InfoRow 
                label="Blood Pressure" 
                value={vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic 
                  ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg` 
                  : undefined} 
              />
              <InfoRow label="BMI" value={vitals.bmi?.toFixed(1)} />
              <InfoRow label="Height" value={vitals.height_cm ? `${vitals.height_cm} cm` : undefined} />
              <InfoRow label="Weight" value={vitals.weight_kg ? `${vitals.weight_kg} kg` : undefined} />
            </div>
          </CollapsibleSection>

          {/* Treatments */}
          <CollapsibleSection 
            title="Treatment History" 
            icon={Syringe}
            badge={treatments.biologic_naive ? "Biologic Naive" : undefined}
          >
            <div className="space-y-3">
              {/* DMARDs */}
              <div>
                <p className="text-xs font-medium mb-1">Conventional DMARDs</p>
                {treatments.conventional_dmards && treatments.conventional_dmards.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {treatments.conventional_dmards.map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] capitalize">{d}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
                {treatments.conventional_dmards_failed !== undefined && (
                  <p className="text-[10px] text-muted-foreground mt-1">Failed: {treatments.conventional_dmards_failed}</p>
                )}
              </div>

              {/* Biologics */}
              <div>
                <p className="text-xs font-medium mb-1">Biologics</p>
                {treatments.biologics && treatments.biologics.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {treatments.biologics.map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] capitalize">{d}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>

              {/* Current Meds */}
              {treatments.current_medications && treatments.current_medications.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Current Medications</p>
                  <div className="space-y-1">
                    {treatments.current_medications.slice(0, 5).map((med, i) => (
                      <div key={i} className="text-[10px] p-1.5 rounded bg-background">
                        {med.name}
                      </div>
                    ))}
                    {treatments.current_medications.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+{treatments.current_medications.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Exclusions */}
          <CollapsibleSection title="Exclusion Screening" icon={ShieldAlert}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Pregnancy", value: exclusions.pregnancy_status, isStatus: true },
                { label: "Nursing", value: exclusions.nursing },
                { label: "Recent Infections", value: exclusions.recent_infections },
                { label: "Malignancy", value: exclusions.active_malignancy },
                { label: "HIV", value: exclusions.hiv_positive },
                { label: "Hepatitis B", value: exclusions.hepatitis_b },
                { label: "Hepatitis C", value: exclusions.hepatitis_c },
                { label: "TB History", value: exclusions.tb_history },
                { label: "Live Vaccine", value: exclusions.recent_live_vaccine },
                { label: "Recent Surgery", value: exclusions.recent_surgery },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  {item.isStatus ? (
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                  ) : item.value ? (
                    <XCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  )}
                  <span>{item.label}: </span>
                  <span className="font-medium">
                    {item.isStatus ? (item.value || "Unknown") : (item.value ? "Yes" : "No")}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Comorbidities */}
          {patient?.comorbidities && patient.comorbidities.length > 0 && (
            <CollapsibleSection title="Comorbidities" icon={Heart} badge={patient.comorbidities.length}>
              <div className="flex flex-wrap gap-1">
                {patient.comorbidities.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Medical History */}
          {patient?.conditions && patient.conditions.length > 0 && (
            <CollapsibleSection title="Medical History" icon={FileText} badge={patient.conditions.length}>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {patient.conditions
                  .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                  .slice(0, 10)
                  .map((cond, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                    <div className="flex items-center gap-1">
                      {cond.is_primary && <Badge className="text-[8px] px-1">Primary</Badge>}
                      {cond.is_active && !cond.is_primary && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                      <span className={cond.is_active ? "font-medium" : "text-muted-foreground"}>
                        {cond.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground">{formatDate(cond.onset_date)}</span>
                  </div>
                ))}
                {patient.conditions.length > 10 && (
                  <p className="text-[10px] text-muted-foreground pt-1">+{patient.conditions.length - 10} more conditions</p>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* Right Column - Matching Results (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Trial Matching
          </h2>

          {/* Matching Control Card */}
          <Card>
            <CardContent className="pt-6">
              {!matching && !result && !error && (
                <div className="text-center py-6">
                  <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Ready to Find Matches</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    AI will analyze this patient's profile against available clinical trials
                  </p>
                  <Button onClick={runMatching} size="lg" className="gap-2">
                    <Brain className="h-5 w-5" />
                    Start Matching
                  </Button>
                </div>
              )}

              {matching && (
                <div className="py-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="font-medium text-lg">AI Agent Analyzing...</span>
                  </div>
                  <Progress value={progress} className="mb-4 h-2" />
                  <p className="text-center text-sm text-muted-foreground">
                    Matching patient criteria against clinical trials (10-30 seconds)
                  </p>
                </div>
              )}

              {error && !matching && (
                <div className="py-6 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Matching Failed</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
                  <Button onClick={runMatching} variant="outline" size="lg" className="gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Try Again
                  </Button>
                </div>
              )}

              {result && result.matches && result.matches.length > 0 && !matching && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <span className="font-semibold text-lg text-green-600">
                        {result.matches.length} Match{result.matches.length > 1 ? "es" : ""} Found
                      </span>
                      {result.cached && result.cached_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Cached {formatCachedTime(result.cached_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button onClick={runMatching} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Re-run
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match Results */}
          {result && result.matches && result.matches.length > 0 && !matching && (
            <div className="space-y-4">
              {result.matches.map((match, index) => (
                <Card key={match.nct_id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                            match.match_score >= 80 ? "bg-green-500" :
                            match.match_score >= 60 ? "bg-yellow-500" : "bg-orange-500"
                          )}>
                            {index + 1}
                          </div>
                          <Badge 
                            variant={getScoreBadge(match.match_score) as "success" | "warning" | "secondary"}
                            className="text-sm px-3"
                          >
                            {match.match_score}% Match
                          </Badge>
                        </div>
                        <CardTitle className="text-base leading-snug">
                          {match.trial_title || match.nct_id}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1 font-mono">
                          {match.nct_id}
                        </CardDescription>
                      </div>
                      <a
                        href={`https://clinicaltrials.gov/study/${match.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="gap-2">
                          View Trial
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </CardHeader>
                  {match.reasoning && (
                    <>
                      <Separator />
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {match.reasoning}
                        </p>
                      </CardContent>
                    </>
                  )}
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-3">
                      <Progress value={match.match_score} className="flex-1 h-2" />
                      <span className={cn("text-sm font-semibold", getScoreColor(match.match_score))}>
                        {match.match_score}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))}

              <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Results saved to patient record</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty state */}
          {!matching && !result && !error && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Click "Start Matching" to find clinical trials for this patient
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
