import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrialMatch - Clinical Trial Matching",
  description: "AI-powered clinical trial matching for patients and doctors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="relative min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
              <p className="text-sm text-muted-foreground">
                Built with Vercel AI SDK, MongoDB Atlas, and OpenAI
              </p>
              <p className="text-sm text-muted-foreground">
                Hackathon Project 2026
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
