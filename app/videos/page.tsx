'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Video, Lock, Unlock, Loader2 } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';

interface VideoInfo {
  name: string;
  transcribed: boolean;
}

const LOCK_STORAGE_KEY = 'preceptra-upload-locked';

function getLockState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(LOCK_STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

function setLockState(locked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCK_STORAGE_KEY, locked ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to save lock state:', error);
  }
}

export default function VideosPage() {
  const searchParams = useSearchParams();
  const { selectedTask, setSelectedTask } = useTask();
  const taskName = searchParams?.get('task') || selectedTask;
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Set the task in context when task param is present
  useEffect(() => {
    if (taskName && taskName !== selectedTask) {
      setSelectedTask(taskName);
    }
  }, [taskName, selectedTask, setSelectedTask]);

  // Load lock state
  useEffect(() => {
    setIsLocked(getLockState());
  }, []);

  // Load videos when task changes
  useEffect(() => {
    if (taskName) {
      loadVideos();
    } else {
      setVideos([]);
    }
  }, [taskName]);

  const loadVideos = async () => {
    if (!taskName) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/videos?taskName=${encodeURIComponent(taskName)}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = () => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    setLockState(newLockState);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('lockStateChanged', { detail: newLockState }));
  };

  if (!taskName) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xl font-semibold mb-3">Select a Task First</p>
              <p className="text-muted-foreground mb-2">
                Choose a task from the top navigation to view videos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">
            Task: <span className="font-semibold">{taskName}</span>
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Videos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              View and manage videos for this task
            </p>
          </div>
          <Button
            onClick={toggleLock}
            variant={isLocked ? 'destructive' : 'default'}
            className="flex items-center gap-2"
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Unlock Uploads</span>
                <span className="sm:hidden">Unlock</span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                <span className="hidden sm:inline">Lock Uploads</span>
                <span className="sm:hidden">Lock</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {isLocked && (
        <Card className="mb-6 border-2 border-orange-300 bg-orange-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                  <Lock className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-orange-900">Uploads Locked</p>
                <p className="text-sm text-orange-800">
                  Video uploads are currently locked. Click "Unlock Uploads" to allow new recordings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading videos...</p>
            </div>
          </CardContent>
        </Card>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Video className="mx-auto mb-4 h-12 w-12" />
              <p>No videos found for this task.</p>
              <p className="text-sm mt-2">Record videos in the Workflow page to see them here.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Videos ({videos.length})</CardTitle>
            <CardDescription>
              Videos associated with this task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {videos.map((video) => (
                <div
                  key={video.name}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{video.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {video.transcribed ? 'Transcribed' : 'Not transcribed'}
                      </p>
                    </div>
                  </div>
                  {video.transcribed && (
                    <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Transcribed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-32"></div>
    </div>
  );
}

