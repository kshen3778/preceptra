'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Select } from './components/ui/select';
import { Input } from './components/ui/input';
import { Upload, BookOpen, MessageSquare, ArrowRight, Plus } from 'lucide-react';
import { useTask } from './contexts/TaskContext';

export default function Home() {
  const router = useRouter();
  const { selectedTask, setSelectedTask, tasks } = useTask();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const handleGetStarted = () => {
    if (selectedTask) {
      router.push('/upload');
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Preceptra</h1>
        <p className="text-lg text-muted-foreground">
          Transform your team&apos;s knowledge into procedures through AI-powered transcription and analysis.
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
              {tasks.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </Select>
          </div>

          {showCreateTask && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="space-y-2">
                <label htmlFor="new-task-name" className="text-sm font-medium">
                  New Task Name <span className="text-xs text-muted-foreground">(Demo: Not available)</span>
                </label>
                <Input
                  id="new-task-name"
                  type="text"
                  placeholder="e.g., Bearing Assembly, Quality Check, etc."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  disabled={true}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={true}
                  size="sm"
                  className="cursor-not-allowed"
                >
                  Create (Demo Restricted)
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateTask(false);
                    setNewTaskName('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!showCreateTask && (
            <Button
              onClick={() => setShowCreateTask(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Task
            </Button>
          )}

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
          <Card>
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                1
              </div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Transcribe
              </CardTitle>
              <CardDescription>
                Upload videos and automatically generate accurate transcriptions using AI.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                2
              </div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Generate Procedures
              </CardTitle>
              <CardDescription>
                Consolidate multiple transcripts into comprehensive procedures.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                3
              </div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ask Questions
              </CardTitle>
              <CardDescription>
                Get instant answers from your knowledge base using AI-powered search.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
