import Link from 'next/link';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Upload, BookOpen, MessageSquare } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Preceptra by MLink</h1>
        <p className="text-lg text-muted-foreground">
          Transform expert demonstrations into actionable knowledge through AI-powered transcription and analysis.
        </p>
      </div>

      <div className="mb-12 rounded-lg border bg-muted/50 p-6">
        <h2 className="mb-2 text-xl font-semibold">Getting Started</h2>
        <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
          <li>Use the Upload page to transcribe videos</li>
          <li>Generate SOPs from the Knowledge page</li>
          <li>Ask questions on the Questions page</li>
        </ol>
      </div>

      <div className="mb-12 text-muted-foreground">
        <p>
          Manufacturing's competitive edge lives in the heads of workers nearing retirement. Standard Operating Procedures capture what everyone knows on average, but the real value is in the full distribution: the troubleshooting instincts, equipment workarounds, and quality judgment that separate good parts from perfect ones. As 10,000 Baby Boomers retire daily, North America is losing decades of tribal knowledge faster than it can be transferred. New hires learn the procedures but miss the wisdom that took careers to build. This knowledge gap is why defect rates climb, scaling stalls, and US and Canadian manufacturers struggle to compete globally.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Upload className="h-6 w-6" />
            </div>
            <CardTitle>Upload & Transcribe</CardTitle>
            <CardDescription>
              Upload task videos and generate accurate transcriptions using AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/upload">
              <Button className="w-full">Get Started</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-6 w-6" />
            </div>
            <CardTitle>Generate Knowledge</CardTitle>
            <CardDescription>
              Consolidate multiple transcripts into comprehensive Standard Operating Procedures.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/knowledge">
              <Button className="w-full">View SOPs</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-6 w-6" />
            </div>
            <CardTitle>Ask Questions</CardTitle>
            <CardDescription>
              Get answers from your knowledge base using your trribes knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/questions">
              <Button className="w-full">Ask Now</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
