'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Video, CheckCircle2, Upload, ArrowRight, Lock } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import { cn } from '@/lib/utils';

interface Video {
  name: string;
  transcribed: boolean;
}

export default function UploadPage() {
  const { selectedTask } = useTask();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [justTranscribed, setJustTranscribed] = useState<string | null>(null);

  // Load videos when task changes
  useEffect(() => {
    if (selectedTask) {
      loadVideos(selectedTask);
    } else {
      setVideos([]);
    }
  }, [selectedTask]);

  const loadVideos = async (taskName: string) => {
    try {
      const response = await fetch(`/api/videos?taskName=${encodeURIComponent(taskName)}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  const handleTranscribe = async (videoName: string) => {
    if (!selectedTask) return;

    setTranscribing(videoName);
    setJustTranscribed(null);
    try {
      const response = await fetch('/api/transcribe-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: selectedTask,
          videoName,
        }),
      });

      if (response.ok) {
        // Reload videos to update transcription status
        await loadVideos(selectedTask);
        setJustTranscribed(videoName);
      } else {
        const error = await response.json();
        alert(`Transcription failed: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe video');
    } finally {
      setTranscribing(null);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Upload & Transcribe</h1>
        <p className="text-muted-foreground">
          Transcribe videos from your team
        </p>
      </div>

      {!selectedTask ? (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xl font-semibold mb-3">Select a Task to Get Started</p>
              <p className="text-muted-foreground mb-2">
                Choose a task from the sidebar to view and transcribe videos.
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You can also select a task from the home page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Demo Mode Banner */}
          <Card className="mb-6 border-2 border-green-500 bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 mb-2">Demo Ready: Sample Data Pre-Loaded</h3>
                  <p className="text-green-800 mb-3">
                    This demonstration includes pre-transcribed sample videos so you can immediately explore the full workflow without uploading or transcribing.
                  </p>
                  <p className="text-sm text-green-700 font-medium">
                    👉 Click "Next: Create Procedure" below to continue and see how procedures are generated
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-2 border-orange-300 bg-orange-50/50 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                <Lock className="h-5 w-5 text-white" />
              </div>
            </div>
            <CardHeader>
              <div className="flex items-start justify-between pr-16">
                <div className="flex-1">
                  <CardTitle className="text-orange-900 flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Your Own Videos
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-orange-200 text-orange-800 rounded-full">
                      LOCKED
                    </span>
                  </CardTitle>
                  <CardDescription className="text-orange-800 mt-2">
                    The free version includes pre-loaded sample videos so you can try the full workflow.
                    Want to upload your own team&apos;s videos?
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-orange-300 bg-white p-6 relative">
                  <div className="absolute inset-0 bg-gray-50/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                      <p className="font-bold text-orange-900 text-lg mb-1">Feature Locked</p>
                      <p className="text-sm text-orange-700">Contact us to unlock video uploads</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 opacity-40">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Upload className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Unlock Custom Video Uploads</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Upload unlimited videos in MP4, MOV, or AVI format (up to 500MB each).
                        Perfect for capturing your team&apos;s unique workflows and expertise.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <a
                    href="https://trymlink.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-orange-700 hover:text-orange-900 hover:underline"
                  >
                    Visit trymlink.com
                  </a>
                  <span className="text-gray-400">or</span>
                  <a
                    href="mailto:info@trymlink.com?subject=Unlock Video Uploads&body=I'm interested in uploading my own videos to Preceptra."
                    className="text-sm font-medium text-orange-700 hover:text-orange-900 hover:underline"
                  >
                    Email us to unlock
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-2 border-orange-300 bg-orange-50/50 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                <Lock className="h-5 w-5 text-white" />
              </div>
            </div>
            <CardHeader>
              <div className="flex items-start justify-between pr-16">
                <div className="flex-1">
                  <CardTitle className="text-orange-900 flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Transcribe Videos
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-orange-200 text-orange-800 rounded-full">
                      LOCKED
                    </span>
                  </CardTitle>
                  <CardDescription className="text-orange-800 mt-2">
                    Transcription feature is locked in the free version. Sample data is already available for the demo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-orange-300 bg-white p-6 relative min-h-[200px]">
                  <div className="absolute inset-0 bg-gray-50/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                      <p className="font-bold text-orange-900 text-lg mb-1">Feature Locked</p>
                      <p className="text-sm text-orange-700 mb-2">Sample transcriptions included for demo</p>
                      <p className="text-xs text-orange-600">Contact us to unlock video transcription</p>
                    </div>
                  </div>
                  <div className="opacity-40">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Video className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-600">Sample Video 1</p>
                            <p className="text-sm text-gray-500">Ready to transcribe</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
                          Transcribe
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Video className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-600">Sample Video 2</p>
                            <p className="text-sm text-gray-500">Ready to transcribe</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
                          Transcribe
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Bottom spacing and Next button */}
      {selectedTask && (
        <div className="mt-8 mb-32">
          <div className="flex items-center justify-between p-6 rounded-lg border-2 border-primary bg-primary/5">
            <div>
              <h3 className="font-semibold text-lg mb-1">Ready to Continue?</h3>
              <p className="text-sm text-muted-foreground">The sample videos are already transcribed. Proceed to create a procedure.</p>
            </div>
            <Button
              onClick={() => router.push('/procedure')}
              variant="default"
              size="lg"
              className="px-8"
            >
              Next: Create Procedure
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
