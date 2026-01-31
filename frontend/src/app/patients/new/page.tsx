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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

const CONDITIONS = [
  { value: "multiple_sclerosis", label: "Multiple Sclerosis" },
  { value: "breast_cancer", label: "Breast Cancer" },
  { value: "lung_cancer", label: "Lung Cancer" },
  { value: "diabetes_type_2", label: "Type 2 Diabetes" },
  { value: "alzheimers", label: "Alzheimer's Disease" },
  { value: "parkinsons", label: "Parkinson's Disease" },
  { value: "rheumatoid_arthritis", label: "Rheumatoid Arthritis" },
  { value: "depression", label: "Major Depression" },
  { value: "heart_failure", label: "Heart Failure" },
  { value: "other", label: "Other" },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: "",
    condition: "",
    location: "",
    prior_treatments: "",
    comorbidities: "",
    time_commitment: "",
    doctor_name: "",
    doctor_email: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        age: parseInt(formData.age),
        condition: formData.condition,
        location: formData.location,
        prior_treatments: formData.prior_treatments
          ? formData.prior_treatments.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        comorbidities: formData.comorbidities
          ? formData.comorbidities.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        time_commitment: formData.time_commitment || undefined,
        doctor_name: formData.doctor_name || undefined,
        doctor_email: formData.doctor_email || undefined,
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
            Enter patient details to find matching clinical trials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="35"
                    min="0"
                    max="120"
                    value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Medical Information</h3>
              <div className="space-y-2">
                <Label htmlFor="condition">Primary Condition *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => handleChange("condition", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        {condition.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prior_treatments">Prior Treatments</Label>
                <Textarea
                  id="prior_treatments"
                  placeholder="Enter treatments separated by commas (e.g., Interferon beta-1a, Glatiramer acetate)"
                  value={formData.prior_treatments}
                  onChange={(e) => handleChange("prior_treatments", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple treatments with commas
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comorbidities">Comorbidities</Label>
                <Textarea
                  id="comorbidities"
                  placeholder="Enter conditions separated by commas (e.g., Hypertension, Type 2 Diabetes)"
                  value={formData.comorbidities}
                  onChange={(e) => handleChange("comorbidities", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple conditions with commas
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_commitment">Time Commitment</Label>
                <Input
                  id="time_commitment"
                  placeholder="e.g., Flexible, Weekends only, Limited"
                  value={formData.time_commitment}
                  onChange={(e) => handleChange("time_commitment", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Doctor Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Doctor Information (Optional)</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor_name">Doctor Name</Label>
                  <Input
                    id="doctor_name"
                    placeholder="Dr. Jane Smith"
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
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
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
