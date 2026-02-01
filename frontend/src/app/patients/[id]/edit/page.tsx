"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Save,
  Loader2,
  User,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Trash2
} from "lucide-react";

interface Patient {
  _id: string;
  name: string;
  email: string;
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
    rf_positive?: boolean;
    anti_ccp_positive?: boolean;
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
    biologics?: string[];
    biologic_naive?: boolean;
  };
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
  time_commitment?: string;
  doctor_name?: string;
  doctor_email?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: 0,
    sex: "",
    race: "",
    ethnicity: "",
    condition: "",
    location: "",
    city: "",
    state: "",
    das28: "",
    cdai: "",
    disease_severity: "",
    wbc: "",
    hemoglobin: "",
    esr: "",
    crp: "",
    rf_positive: "unknown",
    anti_ccp_positive: "unknown",
    bp_systolic: "",
    bp_diastolic: "",
    height_cm: "",
    weight_kg: "",
    bmi: "",
    biologic_naive: "unknown",
    pregnancy_status: "unknown",
    doctor_name: "",
    doctor_email: "",
    time_commitment: "",
  });
  
  const [dmards, setDmards] = useState<string[]>([]);
  const [biologics, setBiologics] = useState<string[]>([]);
  const [comorbidities, setComorbidities] = useState<string[]>([]);
  const [newDmard, setNewDmard] = useState("");
  const [newBiologic, setNewBiologic] = useState("");
  const [newComorbidity, setNewComorbidity] = useState("");

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/patients/${patientId}`);
      if (!res.ok) throw new Error("Patient not found");
      const data = await res.json();
      const p = data.patient || data;
      setPatient(p);
      
      // Populate form
      setFormData({
        name: p.name || "",
        email: p.email || "",
        age: p.age || 0,
        sex: p.sex || "",
        race: p.race || "",
        ethnicity: p.ethnicity || "",
        condition: p.condition || "",
        location: p.location || "",
        city: p.location_details?.city || "",
        state: p.location_details?.state || "",
        das28: p.disease_activity?.das28?.toString() || "",
        cdai: p.disease_activity?.cdai?.toString() || "",
        disease_severity: p.disease_activity?.disease_severity || "",
        wbc: p.labs?.wbc?.toString() || "",
        hemoglobin: p.labs?.hemoglobin?.toString() || "",
        esr: p.labs?.esr?.toString() || "",
        crp: p.labs?.crp?.toString() || "",
        rf_positive: p.labs?.rf_positive === true ? "true" : p.labs?.rf_positive === false ? "false" : "unknown",
        anti_ccp_positive: p.labs?.anti_ccp_positive === true ? "true" : p.labs?.anti_ccp_positive === false ? "false" : "unknown",
        bp_systolic: p.vitals?.blood_pressure_systolic?.toString() || "",
        bp_diastolic: p.vitals?.blood_pressure_diastolic?.toString() || "",
        height_cm: p.vitals?.height_cm?.toString() || "",
        weight_kg: p.vitals?.weight_kg?.toString() || "",
        bmi: p.vitals?.bmi?.toString() || "",
        biologic_naive: p.treatments?.biologic_naive === true ? "true" : p.treatments?.biologic_naive === false ? "false" : "unknown",
        pregnancy_status: p.exclusions?.pregnancy_status || "unknown",
        doctor_name: p.doctor_name || "",
        doctor_email: p.doctor_email || "",
        time_commitment: p.time_commitment || "",
      });
      
      setDmards(p.treatments?.conventional_dmards || []);
      setBiologics(p.treatments?.biologics || []);
      setComorbidities(p.comorbidities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Build update payload
      const updates: Record<string, any> = {
        name: formData.name,
        email: formData.email,
        age: Number(formData.age),
        sex: formData.sex || undefined,
        race: formData.race || undefined,
        ethnicity: formData.ethnicity || undefined,
        condition: formData.condition,
        location: formData.location,
        doctor_name: formData.doctor_name || undefined,
        doctor_email: formData.doctor_email || undefined,
        time_commitment: formData.time_commitment || undefined,
      };

      // Location details
      if (formData.city || formData.state) {
        updates.location_details = {
          city: formData.city || undefined,
          state: formData.state || undefined,
        };
      }

      // Disease activity
      if (formData.das28 || formData.cdai || formData.disease_severity) {
        updates.disease_activity = {
          das28: formData.das28 ? Number(formData.das28) : undefined,
          cdai: formData.cdai ? Number(formData.cdai) : undefined,
          disease_severity: formData.disease_severity || undefined,
        };
      }

      // Labs
      const labs: Record<string, any> = {};
      if (formData.wbc) labs.wbc = Number(formData.wbc);
      if (formData.hemoglobin) labs.hemoglobin = Number(formData.hemoglobin);
      if (formData.esr) labs.esr = Number(formData.esr);
      if (formData.crp) labs.crp = Number(formData.crp);
      if (formData.rf_positive !== "unknown") labs.rf_positive = formData.rf_positive === "true";
      if (formData.anti_ccp_positive !== "unknown") labs.anti_ccp_positive = formData.anti_ccp_positive === "true";
      if (Object.keys(labs).length > 0) updates.labs = labs;

      // Vitals
      const vitals: Record<string, any> = {};
      if (formData.bp_systolic) vitals.blood_pressure_systolic = Number(formData.bp_systolic);
      if (formData.bp_diastolic) vitals.blood_pressure_diastolic = Number(formData.bp_diastolic);
      if (formData.height_cm) vitals.height_cm = Number(formData.height_cm);
      if (formData.weight_kg) vitals.weight_kg = Number(formData.weight_kg);
      if (formData.bmi) vitals.bmi = Number(formData.bmi);
      if (Object.keys(vitals).length > 0) updates.vitals = vitals;

      // Treatments
      updates.treatments = {
        conventional_dmards: dmards,
        biologics: biologics,
        biologic_naive: formData.biologic_naive === "unknown" ? undefined : formData.biologic_naive === "true",
      };

      // Comorbidities
      updates.comorbidities = comorbidities;

      // Exclusions
      updates.exclusions = {
        ...patient?.exclusions,
        pregnancy_status: formData.pregnancy_status,
      };

      const res = await fetch(`${BACKEND_URL}/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to save");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/patients/${patientId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addItem = (list: string[], setList: (items: string[]) => void, item: string, setItem: (s: string) => void) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
      setItem("");
    }
  };

  const removeItem = (list: string[], setList: (items: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
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
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
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

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Edit Patient</h1>
            <p className="text-muted-foreground">Update patient information</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700 dark:text-green-300">Patient updated successfully! Redirecting...</span>
          </CardContent>
        </Card>
      )}

      {error && patient && (
        <Card className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Patient demographics and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <Select value={formData.sex} onValueChange={(v) => handleInputChange("sex", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="race">Race</Label>
                <Input
                  id="race"
                  value={formData.race}
                  onChange={(e) => handleInputChange("race", e.target.value)}
                  placeholder="e.g., white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ethnicity">Ethnicity</Label>
                <Input
                  id="ethnicity"
                  value={formData.ethnicity}
                  onChange={(e) => handleInputChange("ethnicity", e.target.value)}
                  placeholder="e.g., nonhispanic"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="City, State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Condition */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Condition</CardTitle>
            <CardDescription>Primary diagnosis and disease activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition">Primary Condition *</Label>
                <Select value={formData.condition} onValueChange={(v) => handleInputChange("condition", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rheumatoid_arthritis">Rheumatoid Arthritis</SelectItem>
                    <SelectItem value="lupus">Lupus</SelectItem>
                    <SelectItem value="multiple_sclerosis">Multiple Sclerosis</SelectItem>
                    <SelectItem value="psoriatic_arthritis">Psoriatic Arthritis</SelectItem>
                    <SelectItem value="ankylosing_spondylitis">Ankylosing Spondylitis</SelectItem>
                    <SelectItem value="crohns_disease">Crohn's Disease</SelectItem>
                    <SelectItem value="ulcerative_colitis">Ulcerative Colitis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disease_severity">Disease Severity</Label>
                <Select value={formData.disease_severity} onValueChange={(v) => handleInputChange("disease_severity", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="das28">DAS28 Score</Label>
                <Input
                  id="das28"
                  type="number"
                  step="0.1"
                  value={formData.das28}
                  onChange={(e) => handleInputChange("das28", e.target.value)}
                  placeholder="e.g., 4.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cdai">CDAI Score</Label>
                <Input
                  id="cdai"
                  type="number"
                  step="0.1"
                  value={formData.cdai}
                  onChange={(e) => handleInputChange("cdai", e.target.value)}
                  placeholder="e.g., 22"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labs */}
        <Card>
          <CardHeader>
            <CardTitle>Laboratory Values</CardTitle>
            <CardDescription>Recent lab results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RF Status</Label>
                <Select value={formData.rf_positive} onValueChange={(v) => handleInputChange("rf_positive", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="true">Positive</SelectItem>
                    <SelectItem value="false">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Anti-CCP Status</Label>
                <Select value={formData.anti_ccp_positive} onValueChange={(v) => handleInputChange("anti_ccp_positive", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="true">Positive</SelectItem>
                    <SelectItem value="false">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wbc">WBC</Label>
                <Input
                  id="wbc"
                  type="number"
                  step="0.1"
                  value={formData.wbc}
                  onChange={(e) => handleInputChange("wbc", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hemoglobin">Hemoglobin (g/dL)</Label>
                <Input
                  id="hemoglobin"
                  type="number"
                  step="0.1"
                  value={formData.hemoglobin}
                  onChange={(e) => handleInputChange("hemoglobin", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esr">ESR (mm/hr)</Label>
                <Input
                  id="esr"
                  type="number"
                  value={formData.esr}
                  onChange={(e) => handleInputChange("esr", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crp">CRP (mg/L)</Label>
                <Input
                  id="crp"
                  type="number"
                  step="0.1"
                  value={formData.crp}
                  onChange={(e) => handleInputChange("crp", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vitals */}
        <Card>
          <CardHeader>
            <CardTitle>Vitals</CardTitle>
            <CardDescription>Physical measurements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bp_systolic">BP Systolic</Label>
                <Input
                  id="bp_systolic"
                  type="number"
                  value={formData.bp_systolic}
                  onChange={(e) => handleInputChange("bp_systolic", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp_diastolic">BP Diastolic</Label>
                <Input
                  id="bp_diastolic"
                  type="number"
                  value={formData.bp_diastolic}
                  onChange={(e) => handleInputChange("bp_diastolic", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange("height_cm", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Weight (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={(e) => handleInputChange("weight_kg", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bmi">BMI</Label>
                <Input
                  id="bmi"
                  type="number"
                  step="0.1"
                  value={formData.bmi}
                  onChange={(e) => handleInputChange("bmi", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Treatments */}
        <Card>
          <CardHeader>
            <CardTitle>Treatment History</CardTitle>
            <CardDescription>Medications and therapies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Biologic Status</Label>
              <Select value={formData.biologic_naive} onValueChange={(v) => handleInputChange("biologic_naive", v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="true">Biologic Naive</SelectItem>
                  <SelectItem value="false">Biologic Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* DMARDs */}
            <div className="space-y-2">
              <Label>Conventional DMARDs</Label>
              <div className="flex gap-2">
                <Input
                  value={newDmard}
                  onChange={(e) => setNewDmard(e.target.value)}
                  placeholder="e.g., methotrexate"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem(dmards, setDmards, newDmard, setNewDmard))}
                />
                <Button type="button" variant="outline" onClick={() => addItem(dmards, setDmards, newDmard, setNewDmard)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {dmards.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {dmards.map((d, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {d}
                      <button onClick={() => removeItem(dmards, setDmards, i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Biologics */}
            <div className="space-y-2">
              <Label>Biologics</Label>
              <div className="flex gap-2">
                <Input
                  value={newBiologic}
                  onChange={(e) => setNewBiologic(e.target.value)}
                  placeholder="e.g., adalimumab"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem(biologics, setBiologics, newBiologic, setNewBiologic))}
                />
                <Button type="button" variant="outline" onClick={() => addItem(biologics, setBiologics, newBiologic, setNewBiologic)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {biologics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {biologics.map((b, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {b}
                      <button onClick={() => removeItem(biologics, setBiologics, i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comorbidities */}
        <Card>
          <CardHeader>
            <CardTitle>Comorbidities</CardTitle>
            <CardDescription>Other medical conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={newComorbidity}
                onChange={(e) => setNewComorbidity(e.target.value)}
                placeholder="e.g., Hypertension"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem(comorbidities, setComorbidities, newComorbidity, setNewComorbidity))}
              />
              <Button type="button" variant="outline" onClick={() => addItem(comorbidities, setComorbidities, newComorbidity, setNewComorbidity)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {comorbidities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {comorbidities.map((c, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1">
                    {c}
                    <button onClick={() => removeItem(comorbidities, setComorbidities, i)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exclusions & Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Exclusion criteria and provider details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pregnancy Status</Label>
                <Select value={formData.pregnancy_status} onValueChange={(v) => handleInputChange("pregnancy_status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="not_pregnant">Not Pregnant</SelectItem>
                    <SelectItem value="pregnant">Pregnant</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_commitment">Time Commitment</Label>
                <Select value={formData.time_commitment} onValueChange={(v) => handleInputChange("time_commitment", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (1-2 visits)</SelectItem>
                    <SelectItem value="moderate">Moderate (monthly)</SelectItem>
                    <SelectItem value="intensive">Intensive (weekly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctor_name">Treating Physician</Label>
                <Input
                  id="doctor_name"
                  value={formData.doctor_name}
                  onChange={(e) => handleInputChange("doctor_name", e.target.value)}
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor_email">Physician Email</Label>
                <Input
                  id="doctor_email"
                  type="email"
                  value={formData.doctor_email}
                  onChange={(e) => handleInputChange("doctor_email", e.target.value)}
                  placeholder="doctor@hospital.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Link href={`/patients/${patientId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
