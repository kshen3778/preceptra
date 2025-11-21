'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Video, CheckCircle2, Upload, ArrowRight } from 'lucide-react';
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
          {justTranscribed && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Video transcribed successfully!</p>
                      <p className="text-sm text-green-700">Ready to create a procedure from your videos.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/procedure')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Next: Create Procedure
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Your Own Videos
                  </CardTitle>
                  <CardDescription className="text-blue-700 mt-2">
                    The free version includes pre-loaded sample videos so you can try the full workflow.
                    Want to upload your own team&apos;s videos?
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-white p-6">
                  <div className="flex items-start gap-4">
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
                      <div className="flex gap-3">
                        <a
                          href="https://trymlink.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Visit trymlink.com
                        </a>
                        <span className="text-gray-400">or</span>
                        <a
                          href="mailto:info@trymlink.com?subject=Unlock Video Uploads&body=I'm interested in uploading my own videos to Preceptra."
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Email us
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Videos in {selectedTask}</CardTitle>
                  <CardDescription>
                    {videos.length === 0
                      ? 'No videos found in this task'
                      : `${videos.length} video(s) found - Click "Transcribe" on any video below`}
                  </CardDescription>
                </div>
                {videos.some(v => !v.transcribed) && (
                  <div className="flex items-center gap-2 text-sm text-primary font-medium px-3 py-1 bg-primary/10 rounded-full">
                    Action needed
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Video className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No videos found for this task
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((video, index) => (
                    <div
                      key={video.name}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-4 transition-all",
                        !video.transcribed && index === 0 && "border-2 border-primary bg-primary/5"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Video className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{video.name}</p>
                          {video.transcribed && (
                            <p className="flex items-center text-sm text-green-600 font-medium">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Transcribed
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleTranscribe(video.name)}
                        disabled={transcribing === video.name || video.transcribed}
                        variant={video.transcribed ? 'outline' : 'default'}
                        size={!video.transcribed && index === 0 ? 'lg' : 'default'}
                      >
                        {transcribing === video.name ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Transcribing (~2 min)
                          </>
                        ) : video.transcribed ? (
                          'Transcribed'
                        ) : (
                          'Transcribe'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
