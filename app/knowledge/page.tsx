'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Loader2, BookOpen, History, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';

interface SOP {
  markdown: string;
  notes: string;
  createdAt: string;
  taskName: string;
}

export default function KnowledgePage() {
  const { selectedTask } = useTask();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingSOPs, setLoadingSOPs] = useState(false);
  const [markdown, setMarkdown] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [previousSOPs, setPreviousSOPs] = useState<SOP[]>([]);
  const [selectedSOP, setSelectedSOP] = useState<string>('');
  const [justGenerated, setJustGenerated] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      loadPreviousSOPs();
    } else {
      setPreviousSOPs([]);
      setSelectedSOP('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask]);

  const loadPreviousSOPs = async () => {
    if (!selectedTask) return;

    setLoadingSOPs(true);
    try {
      const response = await fetch(`/api/sops?taskName=${encodeURIComponent(selectedTask)}`);
      if (response.ok) {
        const data = await response.json();
        setPreviousSOPs(data.sops || []);
      } else {
        setPreviousSOPs([]);
      }
    } catch (error) {
      console.error('Failed to load previous SOPs:', error);
      setPreviousSOPs([]);
    } finally {
      setLoadingSOPs(false);
    }
  };

  const handleLoadSOP = (sop: SOP) => {
    setMarkdown(sop.markdown);
    setNotes(sop.notes);
    setSelectedSOP(sop.createdAt);
  };

  const handleGenerateSOP = async () => {
    if (!selectedTask) return;

    setLoading(true);
    setMarkdown('');
    setNotes('');
    setSelectedSOP('');
    setJustGenerated(false);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: selectedTask }),
      });

      if (response.ok) {
        const data = await response.json();
        setMarkdown(data.markdown || '');
        setNotes(data.notes || '');
        setJustGenerated(true);
        // Reload previous SOPs to include the new one
        await loadPreviousSOPs();
      } else {
        const error = await response.json();
        alert(`Failed to generate procedure: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Failed to generate procedure:', error);
      alert('Failed to generate procedure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Create procedures from your team&apos;s videos
        </p>
      </div>

      {!selectedTask ? (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xl font-semibold mb-3">Select a Task First</p>
              <p className="text-muted-foreground mb-2">
                Choose a task from the sidebar to view or create procedures.
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Make sure you&apos;ve transcribed videos in Step 1 first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {justGenerated && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Procedure created successfully!</p>
                      <p className="text-sm text-green-700">Now you can ask questions about your procedures.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/questions')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Next: Ask Questions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Create Procedure</CardTitle>
                  <CardDescription className="mt-1">
                    Combine all videos from {selectedTask} into a comprehensive procedure.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    onClick={handleGenerateSOP}
                    disabled={loading}
                    size="lg"
                    className="flex-1 max-w-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating (~30 sec)
                      </>
                    ) : (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Create Procedure
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Previous Procedures
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPreviousSOPs}
                      disabled={loadingSOPs}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${loadingSOPs ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  {loadingSOPs ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : previousSOPs.length > 0 ? (
                    <Select
                      value={selectedSOP}
                      onChange={(e) => {
                        const sop = previousSOPs.find(s => s.createdAt === e.target.value);
                        if (sop) {
                          handleLoadSOP(sop);
                          setJustGenerated(false);
                        }
                      }}
                      className="w-full"
                    >
                      <option value="">-- Select a previous procedure --</option>
                      {previousSOPs.map((sop) => (
                        <option key={sop.createdAt} value={sop.createdAt}>
                          {new Date(sop.createdAt).toLocaleString()}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground">No previous procedures found</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {markdown && selectedTask && (
        <Card>
          <CardHeader>
            <CardTitle>Procedure for {selectedTask}</CardTitle>
            {notes && (
              <div className="mt-2 p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium mb-3 text-foreground">Notes:</p>
                <div className="markdown-content text-sm">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-base font-semibold mt-3 mb-1" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-2 leading-6 text-muted-foreground" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="mb-2 ml-4 list-disc space-y-1 text-muted-foreground" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="mb-2 ml-4 list-decimal space-y-1 text-muted-foreground" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="leading-6" {...props} />
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
                          <code className="px-1 py-0.5 rounded bg-background text-xs font-mono" {...props} />
                        ) : (
                          <code className="block p-2 rounded bg-background text-xs font-mono overflow-x-auto mb-2" {...props} />
                        );
                      },
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-2 border-primary pl-3 my-2 italic text-muted-foreground" {...props} />
                      ),
                    }}
                  >
                    {notes}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-border" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold mt-5 mb-2 text-foreground" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-lg font-medium mt-4 mb-2 text-foreground" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="mb-4 leading-7 text-foreground" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="mb-4 ml-6 list-disc space-y-2 text-foreground" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="mb-4 ml-6 list-decimal space-y-2 text-foreground" {...props} />
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
                      <code className="block p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto mb-4" {...props} />
                    );
                  },
                  pre: ({ node, ...props }) => (
                    <pre className="p-4 rounded-lg bg-muted overflow-x-auto mb-4" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-6 border-border" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse border border-border" {...props} />
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
                {markdown}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {!markdown && !loading && selectedTask && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-4 h-12 w-12" />
              <p>Click &quot;Create Procedure&quot; to generate a procedure from your videos.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
