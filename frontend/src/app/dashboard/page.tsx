"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Activity,
  ArrowRight,
  Brain,
  Database,
  ExternalLink,
  FlaskConical,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users
} from "lucide-react";

interface Patient {
  _id: string;
  name: string;
  email: string;
  condition: string;
}

interface Trial {
  _id: string;
  nct_id: string;
  title: string;
  condition: string;
  phase: string;
  status: string;
}

interface Match {
  _id: string;
  patient_id: string;
  nct_id: string;
  trial_title?: string;
  match_score: number;
  reasoning?: string;
  created_at?: string;
}

interface Stats {
  patients: number;
  trials: number;
  matches: number;
  avgScore: number;
}

interface BulkCrawlResult {
  success: boolean;
  conditions_crawled: string[];
  summary: {
    total_fetched: number;
    new_added: number;
    updated: number;
    duplicates_skipped: number;
  };
  details: Array<{
    condition: string;
    fetched: number;
    new: number;
    updated: number;
    skipped: number;
    error?: string;
  }>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [bulkCrawling, setBulkCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<{ total: number; new: number } | null>(null);
  const [bulkCrawlResult, setBulkCrawlResult] = useState<BulkCrawlResult | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patientsRes, trialsRes, matchesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/patients`),
        fetch(`${BACKEND_URL}/api/trials`),
        fetch(`${BACKEND_URL}/api/matches`).catch(() => null),
      ]);

      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients || []);
      }

      if (trialsRes.ok) {
        const data = await trialsRes.json();
        setTrials(data.trials || []);
      }

      if (matchesRes?.ok) {
        const data = await matchesRes.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const runBulkCrawl = async () => {
    setBulkCrawling(true);
    setBulkCrawlResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/trials/crawl/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Auto-detect conditions from patients
      });

      if (res.ok) {
        const data: BulkCrawlResult = await res.json();
        setBulkCrawlResult(data);
        // Refresh data
        await fetchData();
      } else {
        const error = await res.json();
        console.error("Bulk crawl failed:", error);
      }
    } catch (err) {
      console.error("Bulk crawl failed:", err);
    } finally {
      setBulkCrawling(false);
    }
  };

  const runCrawl = async (condition: string) => {
    setCrawling(true);
    setCrawlResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/trials/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition }),
      });

      if (res.ok) {
        const data = await res.json();
        setCrawlResult({ total: data.stats?.total_fetched || 0, new: data.stats?.new_trials || 0 });
        // Refresh trials list
        const trialsRes = await fetch(`${BACKEND_URL}/api/trials`);
        if (trialsRes.ok) {
          const trialsData = await trialsRes.json();
          setTrials(trialsData.trials || []);
        }
      }
    } catch (err) {
      console.error("Crawl failed:", err);
    } finally {
      setCrawling(false);
    }
  };

  const stats: Stats = {
    patients: patients.length,
    trials: trials.length,
    matches: matches.length,
    avgScore: matches.length > 0
      ? Math.round(matches.reduce((acc, m) => acc + m.match_score, 0) / matches.length)
      : 0,
  };

  const formatCondition = (condition: string) => {
    return condition
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of patients, trials, and matches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={runBulkCrawl} 
            disabled={bulkCrawling || patients.length === 0}
            className="gap-2"
          >
            {bulkCrawling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {bulkCrawling ? "Updating..." : "Update Knowledge Base"}
          </Button>
          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Crawl Result Banner */}
      {bulkCrawlResult && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Knowledge Base Updated
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Crawled {bulkCrawlResult.conditions_crawled.length} condition(s): {" "}
                  <span className="font-medium">
                    {bulkCrawlResult.summary.new_added} new trials added
                  </span>
                  , {bulkCrawlResult.summary.updated} updated, {" "}
                  {bulkCrawlResult.summary.duplicates_skipped} already up-to-date
                </p>
                {bulkCrawlResult.details.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {bulkCrawlResult.details.map((detail) => (
                      <Badge 
                        key={detail.condition} 
                        variant={detail.error ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {formatCondition(detail.condition)}: +{detail.new}
                        {detail.error && " (error)"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBulkCrawlResult(null)}
                className="text-green-700 hover:text-green-800 hover:bg-green-100"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patients}</div>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clinical Trials</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trials}</div>
            <p className="text-xs text-muted-foreground">In database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matches}</div>
            <p className="text-xs text-muted-foreground">Generated by AI</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}%</div>
            <Progress value={stats.avgScore} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patients" className="gap-2">
            <Users className="h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="trials" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Trials
          </TabsTrigger>
          <TabsTrigger value="matches" className="gap-2">
            <Brain className="h-4 w-4" />
            Matches
          </TabsTrigger>
        </TabsList>

        {/* Patients Tab */}
        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Patients</CardTitle>
                  <CardDescription>Latest registered patients</CardDescription>
                </div>
                <Link href="/patients/new">
                  <Button size="sm">Add Patient</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No patients registered yet
                </p>
              ) : (
                <div className="space-y-4">
                  {patients.slice(0, 5).map((patient) => (
                    <div
                      key={patient._id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">{patient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {formatCondition(patient.condition)}
                        </Badge>
                        <Link href={`/patients/${patient._id}/match`}>
                          <Button size="sm" variant="ghost" className="gap-1">
                            Match
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trials Tab */}
        <TabsContent value="trials">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Clinical Trials Database</CardTitle>
                  <CardDescription>Trials available for matching</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {crawlResult && (
                    <Badge variant="outline">
                      {crawlResult.new} new / {crawlResult.total} total
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runCrawl("multiple_sclerosis")}
                    disabled={crawling}
                    className="gap-2"
                  >
                    {crawling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    {crawling ? "Crawling..." : "Crawl Trials"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trials.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No trials in database. Run a crawl to fetch trials from ClinicalTrials.gov
                  </p>
                  <Button
                    onClick={() => runCrawl("multiple_sclerosis")}
                    disabled={crawling}
                  >
                    {crawling ? "Crawling..." : "Crawl Multiple Sclerosis Trials"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trials.slice(0, 5).map((trial) => (
                    <div
                      key={trial._id}
                      className="flex items-start justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium line-clamp-1">{trial.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{trial.nct_id}</Badge>
                          {trial.phase && (
                            <Badge variant="secondary">{trial.phase}</Badge>
                          )}
                          {trial.status && (
                            <Badge
                              variant={trial.status === "RECRUITING" ? "success" : "outline"}
                            >
                              {trial.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <a
                        href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                  {trials.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground">
                      And {trials.length - 5} more trials...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Recent Matches</CardTitle>
              <CardDescription>AI-generated trial matches for patients</CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No matches yet. Run matching on a patient to generate results.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.slice(0, 10).map((match) => (
                    <div
                      key={match._id}
                      className="flex items-start justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {match.trial_title || match.nct_id}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {match.reasoning}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{match.nct_id}</Badge>
                          <Badge variant={getScoreBadge(match.match_score) as "success" | "warning" | "secondary"}>
                            {match.match_score}% Match
                          </Badge>
                        </div>
                      </div>
                      <a
                        href={`https://clinicaltrials.gov/study/${match.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
