'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Select } from './components/ui/select';
import { Upload, BookOpen, MessageSquare, ArrowRight, Plus } from 'lucide-react';
import { useTask } from './contexts/TaskContext';
import CreateTaskModal from './components/CreateTaskModal';

export default function Home() {
  const router = useRouter();
  const { selectedTask, setSelectedTask, tasks } = useTask();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Filter out local tasks - only show filesystem tasks
  const getLocalTasks = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('preceptra-local-tasks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const localTasks = typeof window !== 'undefined' ? getLocalTasks() : [];
  const filesystemTasks = tasks.filter(task => !localTasks.includes(task));

  const handleGetStarted = () => {
    if (selectedTask) {
      router.push(`/workflow?task=${encodeURIComponent(selectedTask)}`);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Capture Your Knowledge. Train For Tomorrow.</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Most operational knowledge is undocumented, making training slow and inconsistent. Preceptra by MLink captures hands-on expertise as it happens and turns it into clear, personalized training and guidance.
        </p>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
          As industries move toward AI, infrastructure still depends on skilled people. Preceptra helps teams ramp faster, avoid mistakes, and preserve the knowledge they rely on.
        </p>
      </div>

      <Card className="mb-12 max-w-2xl mx-auto border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-2xl">Get Started</CardTitle>
          <CardDescription>
            Select an existing task or create a new one to begin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Select Task
            </label>
            <Select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full"
            >
              <option value="">Choose a task...</option>
              {filesystemTasks.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </Select>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => setIsCreateTaskModalOpen(true)}
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Task
            </Button>
          </div>

          <Button
            onClick={handleGetStarted}
            disabled={!selectedTask}
            size="lg"
            className="w-full"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      <div className="mb-8">
        <h2 className="mb-6 text-center text-2xl font-semibold">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                <Upload className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl mb-2">
                Capture Expertise
              </CardTitle>
              <CardDescription className="text-sm">
                Record hands-on knowledge as it happens from video, audio, or text.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                <BookOpen className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl mb-2">
                Optimize Workflow
              </CardTitle>
              <CardDescription className="text-sm">
                Analyze individual skills and workforce pitfalls to identify bottlenecks and optimize workflows.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                <MessageSquare className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl mb-2">
                Ramp Faster
              </CardTitle>
              <CardDescription className="text-sm">
                Help teams learn faster, avoid mistakes, and access knowledge when they need it.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
      />
    </div>
  );
}
