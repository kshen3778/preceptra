'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Loader2, MessageSquare, Send } from 'lucide-react';

interface QuestionAnswer {
  question: string;
  markdown: string;
  sources: string[];
}

export default function QuestionsPage() {
  const [tasks, setTasks] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QuestionAnswer[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

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
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Ask Questions</h1>
        <p className="text-muted-foreground">
          Get answers from your tribe's knowledge base.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
          <CardDescription>
            Select a task and ask questions about your tribe's knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAskQuestion} className="space-y-4">
            <Select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full max-w-md"
            >
              <option value="">-- Select a task --</option>
              {tasks.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </Select>

            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!selectedTask || loading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!selectedTask || !question.trim() || loading}
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
            </div>
          </form>
        </CardContent>
      </Card>

      {history.length > 0 ? (
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
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-4 h-12 w-12" />
              <p>Select a task and ask a question to get started.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
