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
                    onClick={() => router.push('/knowledge')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Next: Create Procedure
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-900">Upload Video (Demo Limited)</CardTitle>
              <CardDescription className="text-amber-700">
                Video upload is available in the full version. This demo uses pre-loaded sample videos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed border-amber-300 bg-white p-8 text-center">
                <Upload className="mx-auto mb-3 h-10 w-10 text-amber-600" />
                <p className="font-medium text-amber-900 mb-1">Upload Feature</p>
                <p className="text-sm text-amber-700">
                  Available in full version - supports MP4, MOV, AVI (up to 500MB)
                </p>
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
