"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible } from "@/components/ui/collapsible";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

const CONDITIONS = [
  { value: "Rheumatoid Arthritis", label: "Rheumatoid Arthritis" },
  { value: "Lupus", label: "Lupus (SLE)" },
  { value: "Multiple Sclerosis", label: "Multiple Sclerosis" },
  { value: "Psoriatic Arthritis", label: "Psoriatic Arthritis" },
  { value: "Ankylosing Spondylitis", label: "Ankylosing Spondylitis" },
  { value: "Crohns Disease", label: "Crohn's Disease" },
  { value: "Ulcerative Colitis", label: "Ulcerative Colitis" },
  { value: "Type 2 Diabetes", label: "Type 2 Diabetes" },
  { value: "Breast Cancer", label: "Breast Cancer" },
  { value: "Lung Cancer", label: "Lung Cancer" },
  { value: "Other", label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "moderate-severe", label: "Moderate to Severe" },
  { value: "severe", label: "Severe" },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface FormData {
  // Basic
  name: string;
  email: string;
  age: string;
  sex: string;
  race: string;
  ethnicity: string;
  // Location
  city: string;
  state: string;
  zip: string;
  // Diagnosis
  condition: string;
  diagnosis_date: string;
  disease_severity: string;
  das28: string;
  cdai: string;
  // Labs
  rf_positive: string;
  anti_ccp_positive: string;
  esr: string;
  crp: string;
  egfr: string;
  hemoglobin: string;
  alt: string;
  ast: string;
  // Vitals
  height_cm: string;
  weight_kg: string;
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  // Treatment
  conventional_dmards: string;
  conventional_dmards_failed: string;
  biologics: string;
  biologics_failed: string;
  current_medications: string;
  biologic_naive: string;
  // Comorbidities & Allergies
  comorbidities: string;
  allergies: string;
  // Exclusions
  pregnancy_status: string;
  recent_infections: string;
  active_malignancy: string;
  hepatitis_b: string;
  hepatitis_c: string;
  tb_history: string;
  recent_live_vaccine: string;
  // Provider
  doctor_name: string;
  doctor_email: string;
  // Preferences
  time_commitment: string;
  max_travel_miles: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  age: "",
  sex: "",
  race: "",
  ethnicity: "",
  city: "",
  state: "",
  zip: "",
  condition: "",
  diagnosis_date: "",
  disease_severity: "",
  das28: "",
  cdai: "",
  rf_positive: "",
  anti_ccp_positive: "",
  esr: "",
  crp: "",
  egfr: "",
  hemoglobin: "",
  alt: "",
  ast: "",
  height_cm: "",
  weight_kg: "",
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  conventional_dmards: "",
  conventional_dmards_failed: "",
  biologics: "",
  biologics_failed: "",
  current_medications: "",
  biologic_naive: "true",
  comorbidities: "",
  allergies: "",
  pregnancy_status: "unknown",
  recent_infections: "false",
  active_malignancy: "false",
  hepatitis_b: "false",
  hepatitis_c: "false",
  tb_history: "false",
  recent_live_vaccine: "false",
  doctor_name: "",
  doctor_email: "",
  time_commitment: "",
  max_travel_miles: "",
};

// Helper to parse comma-separated strings
const parseList = (str: string): string[] =>
  str ? str.split(",").map((s) => s.trim()).filter(Boolean) : [];

// Helper to calculate BMI
const calculateBMI = (heightCm: string, weightKg: string): number | null => {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (h > 0 && w > 0) {
    return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
  }
  return null;
};

// Helper to calculate years since diagnosis
const calculateYearsSinceDiagnosis = (diagnosisDate: string): number | null => {
  if (!diagnosisDate) return null;
  const dx = new Date(diagnosisDate);
  const now = new Date();
  const years = (now.getTime() - dx.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
};

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build the extended patient payload with sensible defaults
      const bmi = calculateBMI(formData.height_cm, formData.weight_kg);
      const yearsSinceDx = calculateYearsSinceDiagnosis(formData.diagnosis_date);
      
      const payload = {
        // Basic info
        name: formData.name,
        email: formData.email || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        sex: formData.sex || undefined,
        race: formData.race || undefined,
        ethnicity: formData.ethnicity || undefined,
        
        // Location (backward compatible string format)
        location: formData.city && formData.state 
          ? `${formData.city}, ${formData.state}` 
          : formData.state || undefined,
        // Structured location details
        location_details: {
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
        },
        
        // Primary condition (required)
        condition: formData.condition,
        
        // Primary diagnosis with details
        primary_diagnosis: {
          condition: formData.condition,
          diagnosis_date: formData.diagnosis_date || undefined,
          years_since_diagnosis: yearsSinceDx,
        },
        
        // Disease activity (for autoimmune)
        disease_activity: {
          das28: formData.das28 ? parseFloat(formData.das28) : undefined,
          cdai: formData.cdai ? parseFloat(formData.cdai) : undefined,
          disease_severity: formData.disease_severity || undefined,
        },
        
        // Labs with sensible defaults for missing values
        labs: {
          rf_positive: formData.rf_positive === "true" ? true : 
                       formData.rf_positive === "false" ? false : undefined,
          anti_ccp_positive: formData.anti_ccp_positive === "true" ? true :
                             formData.anti_ccp_positive === "false" ? false : undefined,
          esr: formData.esr ? parseFloat(formData.esr) : undefined,
          crp: formData.crp ? parseFloat(formData.crp) : undefined,
          egfr: formData.egfr ? parseFloat(formData.egfr) : 90, // Default: normal kidney function
          hemoglobin: formData.hemoglobin ? parseFloat(formData.hemoglobin) : undefined,
          alt: formData.alt ? parseFloat(formData.alt) : undefined,
          ast: formData.ast ? parseFloat(formData.ast) : undefined,
        },
        
        // Vitals
        vitals: {
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
          bmi: bmi || undefined,
          blood_pressure_systolic: formData.blood_pressure_systolic 
            ? parseInt(formData.blood_pressure_systolic) : undefined,
          blood_pressure_diastolic: formData.blood_pressure_diastolic 
            ? parseInt(formData.blood_pressure_diastolic) : undefined,
        },
        
        // Treatment history
        treatments: {
          conventional_dmards: parseList(formData.conventional_dmards),
          conventional_dmards_failed: formData.conventional_dmards_failed 
            ? parseInt(formData.conventional_dmards_failed) : 0,
          biologics: parseList(formData.biologics),
          biologics_failed: formData.biologics_failed 
            ? parseInt(formData.biologics_failed) : 0,
          biologic_naive: formData.biologic_naive !== "false",
          current_medications: formData.current_medications 
            ? parseList(formData.current_medications).map(name => ({ name }))
            : [],
          total_failed_therapies: 
            (formData.conventional_dmards_failed ? parseInt(formData.conventional_dmards_failed) : 0) +
            (formData.biologics_failed ? parseInt(formData.biologics_failed) : 0),
        },
        
        // Backward compatible arrays
        prior_treatments: [
          ...parseList(formData.conventional_dmards),
          ...parseList(formData.biologics),
        ],
        comorbidities: parseList(formData.comorbidities),
        
        // Allergies
        allergies: parseList(formData.allergies).map(allergen => ({ allergen })),
        
        // Exclusion criteria with safe defaults (assume negative unless specified)
        exclusions: {
          pregnancy_status: formData.pregnancy_status || "unknown",
          recent_infections: formData.recent_infections === "true",
          active_malignancy: formData.active_malignancy === "true",
          hepatitis_b: formData.hepatitis_b === "true",
          hepatitis_c: formData.hepatitis_c === "true",
          tb_history: formData.tb_history === "true",
          recent_live_vaccine: formData.recent_live_vaccine === "true",
          nursing: false,
          hiv_positive: false,
          recent_surgery: false,
        },
        
        // Provider info
        provider: {
          name: formData.doctor_name || undefined,
          email: formData.doctor_email || undefined,
        },
        doctor_name: formData.doctor_name || undefined,
        doctor_email: formData.doctor_email || undefined,
        
        // Preferences
        preferences: {
          max_travel_miles: formData.max_travel_miles 
            ? parseInt(formData.max_travel_miles) : 50, // Default 50 miles
          willing_to_use_placebo: true,
        },
        time_commitment: formData.time_commitment || undefined,
        
        // Metadata
        data_source: "manual",
      };

      const res = await fetch(`${BACKEND_URL}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create patient");
      }

      const data = await res.json();
      setPatientId(data.patient_id);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success && patientId) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Patient Registered!</h2>
            <p className="text-muted-foreground text-center mb-6">
              {formData.name} has been successfully added to the system.
            </p>
            <div className="flex gap-4">
              <Link href={`/patients/${patientId}/match`}>
                <Button>Find Matching Trials</Button>
              </Link>
              <Link href="/patients">
                <Button variant="outline">View All Patients</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Register New Patient</CardTitle>
          <CardDescription>
            Enter patient details to find matching clinical trials. 
            Fields left empty will use sensible defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* === BASIC INFORMATION (Always Open) === */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Basic Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="34"
                    min="0"
                    max="120"
                    value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sex *</Label>
                  <Select value={formData.sex} onValueChange={(v) => handleChange("sex", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ethnicity">Ethnicity</Label>
                  <Select value={formData.ethnicity} onValueChange={(v) => handleChange("ethnicity", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hispanic">Hispanic/Latino</SelectItem>
                      <SelectItem value="non-hispanic">Non-Hispanic</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="San Francisco"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="CA"
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    placeholder="94102"
                    value={formData.zip}
                    onChange={(e) => handleChange("zip", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* === PRIMARY DIAGNOSIS (Always Open) === */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Primary Diagnosis</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select 
                    value={formData.condition} 
                    onValueChange={(v) => handleChange("condition", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis_date">Diagnosis Date</Label>
                  <Input
                    id="diagnosis_date"
                    type="date"
                    value={formData.diagnosis_date}
                    onChange={(e) => handleChange("diagnosis_date", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="disease_severity">Disease Severity</Label>
                  <Select 
                    value={formData.disease_severity} 
                    onValueChange={(v) => handleChange("disease_severity", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="das28">DAS28 Score</Label>
                  <Input
                    id="das28"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 5.1"
                    value={formData.das28}
                    onChange={(e) => handleChange("das28", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cdai">CDAI Score</Label>
                  <Input
                    id="cdai"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 22"
                    value={formData.cdai}
                    onChange={(e) => handleChange("cdai", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* === LABORATORY VALUES (Collapsible) === */}
            <Collapsible 
              title="Laboratory Values" 
              description="Disease markers and organ function tests"
            >
              <div className="space-y-4 pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rheumatoid Factor (RF)</Label>
                    <Select 
                      value={formData.rf_positive} 
                      onValueChange={(v) => handleChange("rf_positive", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Positive</SelectItem>
                        <SelectItem value="false">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Anti-CCP Antibodies</Label>
                    <Select 
                      value={formData.anti_ccp_positive} 
                      onValueChange={(v) => handleChange("anti_ccp_positive", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Positive</SelectItem>
                        <SelectItem value="false">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="esr">ESR (mm/hr)</Label>
                    <Input
                      id="esr"
                      type="number"
                      placeholder="28"
                      value={formData.esr}
                      onChange={(e) => handleChange("esr", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crp">CRP (mg/L)</Label>
                    <Input
                      id="crp"
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      value={formData.crp}
                      onChange={(e) => handleChange("crp", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="egfr">eGFR (mL/min)</Label>
                    <Input
                      id="egfr"
                      type="number"
                      placeholder="90"
                      value={formData.egfr}
                      onChange={(e) => handleChange("egfr", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
                    <Input
                      id="hemoglobin"
                      type="number"
                      step="0.1"
                      placeholder="13.5"
                      value={formData.hemoglobin}
                      onChange={(e) => handleChange("hemoglobin", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alt">ALT (U/L)</Label>
                    <Input
                      id="alt"
                      type="number"
                      placeholder="25"
                      value={formData.alt}
                      onChange={(e) => handleChange("alt", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ast">AST (U/L)</Label>
                    <Input
                      id="ast"
                      type="number"
                      placeholder="22"
                      value={formData.ast}
                      onChange={(e) => handleChange("ast", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Collapsible>

            {/* === VITALS (Collapsible) === */}
            <Collapsible 
              title="Vitals" 
              description="Height, weight, and blood pressure"
            >
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height_cm">Height (cm)</Label>
                    <Input
                      id="height_cm"
                      type="number"
                      placeholder="170"
                      value={formData.height_cm}
                      onChange={(e) => handleChange("height_cm", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight_kg">Weight (kg)</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      placeholder="70"
                      value={formData.weight_kg}
                      onChange={(e) => handleChange("weight_kg", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood_pressure_systolic">BP Systolic</Label>
                    <Input
                      id="blood_pressure_systolic"
                      type="number"
                      placeholder="120"
                      value={formData.blood_pressure_systolic}
                      onChange={(e) => handleChange("blood_pressure_systolic", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood_pressure_diastolic">BP Diastolic</Label>
                    <Input
                      id="blood_pressure_diastolic"
                      type="number"
                      placeholder="80"
                      value={formData.blood_pressure_diastolic}
                      onChange={(e) => handleChange("blood_pressure_diastolic", e.target.value)}
                    />
                  </div>
                </div>
                {formData.height_cm && formData.weight_kg && (
                  <p className="text-sm text-muted-foreground">
                    Calculated BMI: {calculateBMI(formData.height_cm, formData.weight_kg)}
                  </p>
                )}
              </div>
            </Collapsible>

            {/* === TREATMENT HISTORY (Collapsible) === */}
            <Collapsible 
              title="Treatment History" 
              description="Prior and current medications"
              defaultOpen={true}
            >
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="conventional_dmards">Conventional DMARDs Tried</Label>
                  <Textarea
                    id="conventional_dmards"
                    placeholder="methotrexate, sulfasalazine, hydroxychloroquine"
                    value={formData.conventional_dmards}
                    onChange={(e) => handleChange("conventional_dmards", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separate with commas</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conventional_dmards_failed">cDMARDs Failed</Label>
                    <Input
                      id="conventional_dmards_failed"
                      type="number"
                      min="0"
                      placeholder="1"
                      value={formData.conventional_dmards_failed}
                      onChange={(e) => handleChange("conventional_dmards_failed", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Biologic-Naive?</Label>
                    <Select 
                      value={formData.biologic_naive} 
                      onValueChange={(v) => handleChange("biologic_naive", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes - Never received biologics</SelectItem>
                        <SelectItem value="false">No - Has received biologics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biologics">Biologics Tried</Label>
                  <Textarea
                    id="biologics"
                    placeholder="adalimumab, etanercept, infliximab"
                    value={formData.biologics}
                    onChange={(e) => handleChange("biologics", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separate with commas</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biologics_failed">Biologics Failed</Label>
                  <Input
                    id="biologics_failed"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.biologics_failed}
                    onChange={(e) => handleChange("biologics_failed", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_medications">Current Medications</Label>
                  <Textarea
                    id="current_medications"
                    placeholder="methotrexate 15mg weekly, folic acid 1mg daily"
                    value={formData.current_medications}
                    onChange={(e) => handleChange("current_medications", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separate with commas</p>
                </div>
              </div>
            </Collapsible>

            {/* === COMORBIDITIES & ALLERGIES (Collapsible) === */}
            <Collapsible 
              title="Comorbidities & Allergies" 
              description="Other conditions and known allergies"
            >
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="comorbidities">Comorbidities</Label>
                  <Textarea
                    id="comorbidities"
                    placeholder="hypertension, type 2 diabetes, obesity"
                    value={formData.comorbidities}
                    onChange={(e) => handleChange("comorbidities", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separate with commas</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    placeholder="penicillin, sulfa drugs"
                    value={formData.allergies}
                    onChange={(e) => handleChange("allergies", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separate with commas</p>
                </div>
              </div>
            </Collapsible>

            {/* === EXCLUSION SCREENING (Collapsible) === */}
            <Collapsible 
              title="Exclusion Screening" 
              description="Common trial exclusion criteria (defaults to No)"
            >
              <div className="space-y-4 pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pregnancy Status</Label>
                    <Select 
                      value={formData.pregnancy_status} 
                      onValueChange={(v) => handleChange("pregnancy_status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_pregnant">Not Pregnant</SelectItem>
                        <SelectItem value="pregnant">Pregnant</SelectItem>
                        <SelectItem value="unknown">Unknown / N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recent Infections (past 4 weeks)</Label>
                    <Select 
                      value={formData.recent_infections} 
                      onValueChange={(v) => handleChange("recent_infections", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Active Malignancy</Label>
                    <Select 
                      value={formData.active_malignancy} 
                      onValueChange={(v) => handleChange("active_malignancy", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>TB History</Label>
                    <Select 
                      value={formData.tb_history} 
                      onValueChange={(v) => handleChange("tb_history", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hepatitis B</Label>
                    <Select 
                      value={formData.hepatitis_b} 
                      onValueChange={(v) => handleChange("hepatitis_b", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No / Negative</SelectItem>
                        <SelectItem value="true">Yes / Positive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hepatitis C</Label>
                    <Select 
                      value={formData.hepatitis_c} 
                      onValueChange={(v) => handleChange("hepatitis_c", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No / Negative</SelectItem>
                        <SelectItem value="true">Yes / Positive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recent Live Vaccine (past 4-6 weeks)</Label>
                  <Select 
                    value={formData.recent_live_vaccine} 
                    onValueChange={(v) => handleChange("recent_live_vaccine", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Collapsible>

            {/* === PROVIDER & PREFERENCES (Collapsible) === */}
            <Collapsible 
              title="Provider & Preferences" 
              description="Doctor info and trial preferences"
            >
              <div className="space-y-4 pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctor_name">Doctor Name</Label>
                    <Input
                      id="doctor_name"
                      placeholder="Dr. Sarah Johnson"
                      value={formData.doctor_name}
                      onChange={(e) => handleChange("doctor_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctor_email">Doctor Email</Label>
                    <Input
                      id="doctor_email"
                      type="email"
                      placeholder="doctor@hospital.com"
                      value={formData.doctor_email}
                      onChange={(e) => handleChange("doctor_email", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time_commitment">Time Availability</Label>
                    <Input
                      id="time_commitment"
                      placeholder="Flexible, Weekdays only"
                      value={formData.time_commitment}
                      onChange={(e) => handleChange("time_commitment", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_travel_miles">Max Travel Distance (miles)</Label>
                    <Input
                      id="max_travel_miles"
                      type="number"
                      placeholder="50"
                      value={formData.max_travel_miles}
                      onChange={(e) => handleChange("max_travel_miles", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Collapsible>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Registering..." : "Register Patient"}
              </Button>
              <Link href="/patients">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
