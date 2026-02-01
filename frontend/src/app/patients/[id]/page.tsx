"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  ArrowRight,
  User, 
  Mail, 
  MapPin, 
  Calendar,
  Activity,
  Pill,
  Heart,
  Clock,
  Stethoscope,
  Loader2,
  FlaskConical,
  Scale,
  ShieldAlert,
  FileText,
  Users,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";

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
    lat?: number;
    lon?: number;
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
  created_at?: string;
  updated_at?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error || "Patient not found"}</p>
            <Link href="/patients">
              <Button variant="outline">Back to Patients</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exclusions = patient.exclusions || {};
  const labs = patient.labs || {};
  const vitals = patient.vitals || {};
  const treatments = patient.treatments || {};
  const primaryDx = patient.primary_diagnosis || {};
  const diseaseActivity = patient.disease_activity || {};

  return (
    <div className="container max-w-6xl py-8">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      <div className="grid gap-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{patient.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {patient.email}
                  </CardDescription>
                  {patient.data_source && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Source: {patient.data_source}
                    </Badge>
                  )}
                </div>
              </div>
              <Link href={`/patients/${patientId}/match`}>
                <Button className="gap-2">
                  Find Matches
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Demographics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Demographics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Age</p>
                  <p className="font-medium">{patient.age} years</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sex</p>
                  <p className="font-medium">{patient.sex === "F" ? "Female" : patient.sex === "M" ? "Male" : patient.sex || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Birth Date</p>
                  <p className="font-medium">{formatDate(patient.birth_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Race</p>
                  <p className="font-medium capitalize">{patient.race || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Ethnicity</p>
                  <p className="font-medium capitalize">{patient.ethnicity || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{patient.location}</p>
              </div>
              {patient.location_details && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">City</p>
                      <p className="font-medium">{patient.location_details.city || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">State</p>
                      <p className="font-medium">{patient.location_details.state || "N/A"}</p>
                    </div>
                  </div>
                  {patient.location_details.zip && patient.location_details.zip !== "00000" && (
                    <div>
                      <p className="text-muted-foreground">ZIP Code</p>
                      <p className="font-medium">{patient.location_details.zip}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Primary Diagnosis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Primary Diagnosis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Badge className="mb-2">{formatCondition(patient.condition)}</Badge>
              </div>
              {primaryDx.snomed_code && (
                <div>
                  <p className="text-muted-foreground">SNOMED Code</p>
                  <p className="font-medium font-mono text-xs">{primaryDx.snomed_code}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Diagnosis Date</p>
                  <p className="font-medium">{formatDate(primaryDx.diagnosis_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {primaryDx.years_since_diagnosis 
                      ? `${primaryDx.years_since_diagnosis.toFixed(1)} years` 
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disease Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Disease Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {diseaseActivity && Object.keys(diseaseActivity).length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-muted-foreground">DAS28</p>
                      <p className="font-medium">{diseaseActivity.das28 ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CDAI</p>
                      <p className="font-medium">{diseaseActivity.cdai ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">SDAI</p>
                      <p className="font-medium">{diseaseActivity.sdai ?? "N/A"}</p>
                    </div>
                  </div>
                  {diseaseActivity.disease_severity && (
                    <div>
                      <p className="text-muted-foreground">Severity</p>
                      <Badge variant="outline" className="capitalize">
                        {diseaseActivity.disease_severity}
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">No disease activity data available</p>
              )}
            </CardContent>
          </Card>

          {/* Vitals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Blood Pressure</p>
                  <p className="font-medium">
                    {vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic 
                      ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">BMI</p>
                  <p className="font-medium">{vitals.bmi ? vitals.bmi.toFixed(1) : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Height</p>
                  <p className="font-medium">{vitals.height_cm ? `${vitals.height_cm} cm` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Weight</p>
                  <p className="font-medium">{vitals.weight_kg ? `${vitals.weight_kg} kg` : "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Laboratory Values
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-muted-foreground">WBC</p>
                  <p className="font-medium">{labs.wbc ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hemoglobin</p>
                  <p className="font-medium">{labs.hemoglobin ? `${labs.hemoglobin} g/dL` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platelets</p>
                  <p className="font-medium">{labs.platelets ?? "N/A"}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">RF Status</p>
                  <Badge variant={labs.rf_positive ? "default" : "secondary"}>
                    {labs.rf_positive === true ? "Positive" : labs.rf_positive === false ? "Negative" : "Unknown"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Anti-CCP</p>
                  <Badge variant={labs.anti_ccp_positive ? "default" : "secondary"}>
                    {labs.anti_ccp_positive === true ? "Positive" : labs.anti_ccp_positive === false ? "Negative" : "Unknown"}
                  </Badge>
                </div>
              </div>
              {(labs.esr || labs.crp) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">ESR</p>
                      <p className="font-medium">{labs.esr ? `${labs.esr} mm/hr` : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CRP</p>
                      <p className="font-medium">{labs.crp ? `${labs.crp} mg/L` : "N/A"}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Treatment History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="h-5 w-5" />
              Treatment History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* DMARDs */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Conventional DMARDs</h4>
                {treatments.conventional_dmards && treatments.conventional_dmards.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {treatments.conventional_dmards.map((drug, i) => (
                      <Badge key={i} variant="secondary" className="capitalize">
                        {drug}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None</p>
                )}
                {treatments.conventional_dmards_failed !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Failed: {treatments.conventional_dmards_failed}
                  </p>
                )}
              </div>

              {/* Biologics */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Biologics</h4>
                {treatments.biologics && treatments.biologics.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {treatments.biologics.map((drug, i) => (
                      <Badge key={i} variant="secondary" className="capitalize">
                        {drug}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant={treatments.biologic_naive ? "default" : "outline"}>
                    {treatments.biologic_naive ? "Biologic Naive" : "Biologic Experienced"}
                  </Badge>
                </div>
              </div>

              {/* JAK Inhibitors */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">JAK Inhibitors</h4>
                {treatments.jak_inhibitors && treatments.jak_inhibitors.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {treatments.jak_inhibitors.map((drug, i) => (
                      <Badge key={i} variant="secondary" className="capitalize">
                        {drug}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None</p>
                )}
              </div>
            </div>

            {/* Current Medications */}
            {treatments.current_medications && treatments.current_medications.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-3">Current Medications</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {treatments.current_medications.map((med, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm">
                        <p className="font-medium">{med.name}</p>
                        {med.start_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Started: {formatDate(med.start_date)}
                          </p>
                        )}
                        {med.reason && (
                          <p className="text-xs text-muted-foreground">
                            For: {med.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Exclusion Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Exclusion Screening
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                { label: "Pregnancy", value: exclusions.pregnancy_status, isStatus: true },
                { label: "Nursing", value: exclusions.nursing },
                { label: "Recent Infections", value: exclusions.recent_infections },
                { label: "Active Malignancy", value: exclusions.active_malignancy },
                { label: "HIV", value: exclusions.hiv_positive },
                { label: "Hepatitis B", value: exclusions.hepatitis_b },
                { label: "Hepatitis C", value: exclusions.hepatitis_c },
                { label: "TB History", value: exclusions.tb_history },
                { label: "Recent Live Vaccine", value: exclusions.recent_live_vaccine },
                { label: "Recent Surgery", value: exclusions.recent_surgery },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {item.isStatus ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : item.value ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">{item.label}</p>
                    <p className="font-medium text-xs">
                      {item.isStatus 
                        ? (item.value || "Unknown")
                        : (item.value ? "Yes" : "No")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comorbidities */}
        {patient.comorbidities && patient.comorbidities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Comorbidities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {patient.comorbidities.map((condition, i) => (
                  <Badge key={i} variant="outline">
                    {condition}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Conditions */}
        {patient.conditions && patient.conditions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Medical History ({patient.conditions.length} conditions)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {patient.conditions
                  .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                  .map((condition, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      condition.is_primary ? "bg-primary/10" : condition.is_active ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {condition.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      {condition.is_active && !condition.is_primary && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                      <span className={condition.is_active ? "font-medium" : "text-muted-foreground"}>
                        {condition.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(condition.onset_date)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Allergies */}
        {patient.allergies && patient.allergies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Allergies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((allergy, i) => (
                  <Badge key={i} variant="destructive">
                    {allergy.allergen}
                    {allergy.severity && ` (${allergy.severity})`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Info */}
        {(patient.doctor_name || patient.time_commitment) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Care Team & Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patient.doctor_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Treating Physician</p>
                  <p className="font-medium">{patient.doctor_name}</p>
                  {patient.doctor_email && (
                    <p className="text-sm text-muted-foreground">{patient.doctor_email}</p>
                  )}
                </div>
              )}
              {patient.time_commitment && (
                <div>
                  <p className="text-sm text-muted-foreground">Time Commitment</p>
                  <p className="font-medium">{patient.time_commitment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
