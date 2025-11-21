'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';

interface QuestionAnswer {
  question: string;
  markdown: string;
  sources: string[];
}

export default function QuestionsPage() {
  const { selectedTask } = useTask();
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QuestionAnswer[]>([]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !question.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: selectedTask,
          question: question.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHistory([
          {
            question: question.trim(),
            markdown: data.markdown || '',
            sources: data.sources || [],
          },
          ...history,
        ]);
        setQuestion('');
      } else {
        const error = await response.json();
        alert(`Failed to answer question: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Failed to answer question:', error);
      alert('Failed to answer question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Ask Questions</h1>
        <p className="text-muted-foreground">
          Get answers from your team&apos;s videos and procedure
        </p>
      </div>

      {!selectedTask ? (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xl font-semibold mb-3">Select a Task First</p>
              <p className="text-muted-foreground mb-2">
                Choose a task from the sidebar to ask questions.
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Make sure you&apos;ve completed Steps 1 & 2 first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Ask About {selectedTask}</CardTitle>
              <CardDescription>
                Get answers based on all videos and the procedure for this task.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Example: How do I troubleshoot X? What are the safety steps?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!question.trim() || loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Ask
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {history.length === 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Example Questions & Answers</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Sample from Cabin Air Filter task</span>
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border">
                  <CardTitle className="flex items-start gap-3 text-xl font-semibold">
                    <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                    </div>
                    <span className="flex-1 leading-relaxed">The air flow seems to be lower than before I replaced it. What might have caused this?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="markdown-content prose prose-slate max-w-none dark:prose-invert">
                    <p className="mb-3 leading-7 text-foreground">
                      If the air flow seems lower than before after replacing your cabin air filter, the most likely cause is that the new filter was installed with the airflow direction incorrect.
                    </p>
                    <p className="mb-3 leading-7 text-foreground">
                      <strong className="font-semibold text-foreground">Tribal Knowledge / Expert Insight:</strong><br />
                      Filters are designed with a specific direction for air to pass through, indicated by an &quot;AIR FLOW&quot; arrow on the side of the filter. Installing the filter incorrectly, meaning the arrow is pointing in the wrong direction, can significantly reduce its efficiency, compromise the filtration process, and ultimately lead to noticeably lower airflow or even potential damage to the HVAC system over time.
                    </p>
                    <p className="mb-3 leading-7 text-foreground">
                      Experts consistently emphasize the critical importance of observing the orientation of the old filter and correctly matching the &quot;AIR FLOW&quot; arrow on the new filter when installing it. Typically, the arrow should point downwards, indicating the direction of air entering the cabin from the outside system.
                    </p>
                    <p className="mb-3 leading-7 text-foreground">
                      To resolve this, you would need to re-access the filter housing, remove the filter, and reinstall it ensuring the &quot;AIR FLOW&quot; arrow is pointing in the correct direction as specified by the vehicle&apos;s design or by the orientation of the old filter.
                    </p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-border bg-muted/20 -mx-6 px-6 py-4 rounded-b-lg">
                    <p className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground">📚</span>
                      Sources:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground border border-border shadow-sm">
                        Latest SOP (Step 5: Install the New Cabin Air Filter)
                      </span>
                      <span className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground border border-border shadow-sm">
                        Latest SOP (Important Observations and Tribal Knowledge: Airflow Direction)
                      </span>
                      <span className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground border border-border shadow-sm">
                        Chunk 1 (from test5, 140s-156s)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border">
                  <CardTitle className="flex items-start gap-3 text-xl font-semibold">
                    <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                    </div>
                    <span className="flex-1 leading-relaxed">Why are some people using a vacuum for a filter change?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="markdown-content prose prose-slate max-w-none dark:prose-invert">
                    <p className="mb-3 leading-7 text-foreground">
                      Some experts and standard procedures recommend using a vacuum cleaner during a cabin air filter change primarily for cleaning purposes. This is considered a tribal knowledge practice to ensure optimal system performance and air quality.
                    </p>
                    <p className="mb-3 leading-7 text-foreground">
                      Specifically, the Standard Operating Procedure (SOP) outlines the following reasons and benefits for using a handheld vacuum cleaner:
                    </p>
                    <ul className="mb-3 ml-6 list-disc space-y-1.5 text-foreground">
                      <li className="leading-7">
                        <strong className="font-semibold text-foreground">Cleaning the Filter Housing:</strong> After removing the old filter, the housing where the filter sits can accumulate significant amounts of debris, such as leaves, dust, and other contaminants. A vacuum helps to thoroughly clean this area.
                      </li>
                      <li className="leading-7">
                        <strong className="font-semibold text-foreground">Ensuring Optimal Airflow:</strong> Removing accumulated debris from the housing helps to ensure that air can flow freely and efficiently through the new filter and into the vehicle&apos;s HVAC system.
                      </li>
                      <li className="leading-7">
                        <strong className="font-semibold text-foreground">Preventing Immediate Contamination:</strong> Cleaning the housing prevents new contaminants from entering the clean system right after a fresh filter is installed, thereby maximizing the new filter&apos;s effectiveness and longevity.
                      </li>
                      <li className="leading-7">
                        <strong className="font-semibold text-foreground">Improved Air Quality and System Longevity:</strong> This additional step contributes to overall improved air quality inside the vehicle and supports the longevity of the HVAC system by keeping its components clean.
                      </li>
                    </ul>
                    <p className="mb-3 leading-7 text-foreground">
                      While none of the provided transcript chunks explicitly mention an expert using a vacuum, one chunk (&quot;Oh my Good gosh this is what happens when you never change your cabin air filter we&apos;re breathing that&quot;) vividly illustrates the type of highly contaminated and debris-filled environment that would necessitate a thorough cleaning with a vacuum to improve air quality and ensure the new filter&apos;s effectiveness.
                    </p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-border bg-muted/20 -mx-6 px-6 py-4 rounded-b-lg">
                    <p className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground">📚</span>
                      Sources:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground border border-border shadow-sm">
                        Latest Standard Operating Procedure (SOP)
                      </span>
                      <span className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground border border-border shadow-sm">
                        Chunk 4 (from test5, 113s-140s)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {history.length > 0 && selectedTask && (
        <div className="space-y-6">
          {history.map((qa, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="flex items-start gap-3 text-xl font-semibold">
                  <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                  </div>
                  <span className="flex-1 leading-relaxed">{qa.question}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="markdown-content prose prose-slate max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-border text-foreground" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-semibold mt-5 mb-2.5 text-foreground" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-base font-medium mt-3 mb-1.5 text-foreground" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-3 leading-7 text-foreground" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="mb-3 ml-6 list-disc space-y-1.5 text-foreground" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="mb-3 ml-6 list-decimal space-y-1.5 text-foreground" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="leading-7" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-foreground" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic" {...props} />
                      ),
                      code: ({ node, className, ...props }: any) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground" {...props} />
                        ) : (
                          <code className="block p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto mb-3" {...props} />
                        );
                      },
                      pre: ({ node, ...props }) => (
                        <pre className="p-4 rounded-lg bg-muted overflow-x-auto mb-3" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-primary pl-4 my-3 italic text-muted-foreground bg-muted/30 py-2 rounded-r" {...props} />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="my-5 border-border" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-border rounded-lg" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-border px-4 py-2 bg-muted font-semibold text-left" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-border px-4 py-2" {...props} />
                      ),
                    }}
                  >
                    {qa.markdown}
                  </ReactMarkdown>
                </div>
                {qa.sources.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-border bg-muted/20 -mx-6 px-6 py-4 rounded-b-lg">
                    <p className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground">📚</span>
                      Sources:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {qa.sources.map((source, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground border border-border shadow-sm hover:bg-muted transition-colors"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
