"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  User, 
  MapPin, 
  Calendar,
  Activity,
  ArrowRight,
  Loader2,
  Syringe,
  FlaskConical
} from "lucide-react";

interface Patient {
  _id: string;
  name: string;
  email: string;
  age: number;
  sex?: string;
  condition: string;
  location: string;
  prior_treatments?: string[];
  comorbidities?: string[];
  treatments?: {
    conventional_dmards?: string[];
    biologics?: string[];
    biologic_naive?: boolean;
    current_medications?: Array<{ name: string }>;
  };
  labs?: {
    rf_positive?: boolean;
    anti_ccp_positive?: boolean;
  };
  primary_diagnosis?: {
    years_since_diagnosis?: number;
  };
  data_source?: string;
  created_at?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/patients`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.condition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCondition = (condition: string) => {
    return condition
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Manage patient profiles and run trial matching
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, condition, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={fetchPatients}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No patients found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Get started by adding your first patient"}
            </p>
            {!searchQuery && (
              <Link href="/patients/new">
                <Button>Add Patient</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card key={patient._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{patient.name}</CardTitle>
                      <CardDescription className="text-xs">{patient.email}</CardDescription>
                    </div>
                  </div>
                  {patient.data_source && (
                    <Badge variant="outline" className="text-[10px]">
                      {patient.data_source}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Condition Badge */}
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">
                    {formatCondition(patient.condition)}
                  </Badge>
                  {patient.primary_diagnosis?.years_since_diagnosis && (
                    <span className="text-xs text-muted-foreground">
                      {patient.primary_diagnosis.years_since_diagnosis.toFixed(1)}y
                    </span>
                  )}
                </div>

                {/* Demographics Row */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{patient.age}yo</span>
                  </div>
                  {patient.sex && (
                    <span>{patient.sex === "F" ? "Female" : patient.sex === "M" ? "Male" : patient.sex}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{patient.location}</span>
                  </div>
                </div>

                {/* Treatment Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {patient.treatments?.biologic_naive !== undefined && (
                    <Badge variant={patient.treatments.biologic_naive ? "default" : "outline"} className="text-xs">
                      {patient.treatments.biologic_naive ? "Biologic Naive" : "Bio-Experienced"}
                    </Badge>
                  )}
                  {patient.treatments?.conventional_dmards && patient.treatments.conventional_dmards.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Syringe className="h-3 w-3 mr-1" />
                      {patient.treatments.conventional_dmards.length} DMARD{patient.treatments.conventional_dmards.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {/* Lab Status */}
                {(patient.labs?.rf_positive !== undefined || patient.labs?.anti_ccp_positive !== undefined) && (
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-3 w-3 text-muted-foreground" />
                    {patient.labs.rf_positive !== undefined && (
                      <Badge variant={patient.labs.rf_positive ? "default" : "secondary"} className="text-xs">
                        RF{patient.labs.rf_positive ? "+" : "-"}
                      </Badge>
                    )}
                    {patient.labs.anti_ccp_positive !== undefined && (
                      <Badge variant={patient.labs.anti_ccp_positive ? "default" : "secondary"} className="text-xs">
                        CCP{patient.labs.anti_ccp_positive ? "+" : "-"}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Current Medications Preview */}
                {patient.treatments?.current_medications && patient.treatments.current_medications.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {patient.treatments.current_medications.slice(0, 2).map((med, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-normal">
                        {med.name.split(" ").slice(0, 2).join(" ")}
                      </Badge>
                    ))}
                    {patient.treatments.current_medications.length > 2 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{patient.treatments.current_medications.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 flex gap-2">
                  <Link href={`/patients/${patient._id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2 text-sm">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/patients/${patient._id}/match`}>
                    <Button className="gap-2 text-sm">
                      Match
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
