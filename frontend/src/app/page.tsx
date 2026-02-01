import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowRight, 
  Brain, 
  Database, 
  Mail, 
  Search, 
  Shield, 
  Users,
  FileText,
  Zap
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Matching",
    description: "GPT-4o analyzes patient profiles against trial eligibility criteria with 88% accuracy",
  },
  {
    icon: Database,
    title: "Real-Time Trial Data",
    description: "Connected to ClinicalTrials.gov API with automatic deduplication and updates",
  },
  {
    icon: Search,
    title: "Smart Filesystem Agent",
    description: "Vercel AI SDK bash-tool navigates trial data using natural language commands",
  },
  {
    icon: Mail,
    title: "Instant Notifications",
    description: "Automated email alerts to patients and doctors when matches are found",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Patient data stored securely in MongoDB Atlas with encryption at rest",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Deployed on Vercel Edge for sub-second response times globally",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="hero-gradient absolute inset-0" />
        <div className="container relative py-24 md:py-32 lg:py-40">
          <div className="flex flex-col items-center text-center space-y-8">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl max-w-3xl">
              Find the Right{" "}
              <span className="text-primary">Clinical Trial</span>{" "}
              in Seconds
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              AI-powered matching connects patients with life-changing clinical trials. 
              Our intelligent agent analyzes eligibility criteria to find the best matches.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/patients/new">
                <Button size="lg" className="gap-2">
                  Register a Patient
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="gap-2">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            How It Works
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to find matching clinical trials
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="relative overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20">1</div>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Register Patient</CardTitle>
              <CardDescription>
                Enter patient details including condition, age, location, and medical history
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20">2</div>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>AI Analysis</CardTitle>
              <CardDescription>
                Our agent searches through thousands of trials using bash-tool filesystem navigation
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="relative overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl font-bold text-muted/20">3</div>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Get Matches</CardTitle>
              <CardDescription>
                Receive top 3 matched trials with scores and reasoning, sent directly via email
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Built with Modern Tech
            </h2>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              Leveraging the best tools for reliable, fast, and accurate matching
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-background">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-8 p-12">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold mb-2">
                Ready to Find Matches?
              </h2>
              <p className="text-primary-foreground/80 text-lg">
                Start by registering a patient profile and let our AI do the rest.
              </p>
            </div>
            <Link href="/patients/new">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
