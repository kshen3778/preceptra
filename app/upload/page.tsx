'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Loader2, Video, CheckCircle2, Upload, X, Plus } from 'lucide-react';

interface Video {
  name: string;
  transcribed: boolean;
}

export default function UploadPage() {
  const [tasks, setTasks] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Load videos when task changes
  useEffect(() => {
    if (selectedTask) {
      loadVideos(selectedTask);
    } else {
      setVideos([]);
    }
  }, [selectedTask]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Only MP4, MPEG, MOV, and AVI files are allowed.');
        return;
      }
      // Validate file size (500MB)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size exceeds 500MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedTask) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('taskName', selectedTask);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('POST', '/api/upload-video');
        xhr.send(formData);
      });

      await uploadPromise;

      // Clear selected file and reload videos
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadVideos(selectedTask);
      alert('Video uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload video';
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          errorMessage = error.message || errorMessage;
        }
      }
      alert(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTranscribe = async (videoName: string) => {
    if (!selectedTask) return;

    setTranscribing(videoName);
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

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) {
      alert('Please enter a task name');
      return;
    }

    setCreatingTask(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: newTaskName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        // Reload tasks and select the newly created task
        await loadTasks();
        setSelectedTask(data.taskName);
        setNewTaskName('');
        setShowCreateTask(false);
      } else {
        const error = await response.json();
        alert(`Failed to create task: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Create task error:', error);
      alert('Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Upload & Transcribe</h1>
        <p className="text-muted-foreground">
          Select a task and transcribe videos using your tribe's knowledge base. New tasks can be created by clicking the "Create Task" button.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Task</CardTitle>
              <CardDescription>
                Choose a task folder to view available videos
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateTask(!showCreateTask)}
              variant="outline"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreateTask && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="space-y-2">
                <label htmlFor="new-task-name" className="text-sm font-medium">
                  Task Name
                </label>
                <Input
                  id="new-task-name"
                  type="text"
                  placeholder="Enter task name"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTask();
                    } else if (e.key === 'Escape') {
                      setShowCreateTask(false);
                      setNewTaskName('');
                    }
                  }}
                  disabled={creatingTask}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateTask}
                  disabled={creatingTask || !newTaskName.trim()}
                  size="sm"
                >
                  {creatingTask ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateTask(false);
                    setNewTaskName('');
                  }}
                  variant="outline"
                  size="sm"
                  disabled={creatingTask}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
        </CardContent>
      </Card>

      {selectedTask && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Video</CardTitle>
              <CardDescription>
                Upload a video file to transcribe (MP4, MOV, AVI - Max 500MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 hover:border-primary transition-colors">
                      {selectedFile ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Video className="h-5 w-5 text-primary" />
                          <span className="font-medium">{selectedFile.name}</span>
                          <span className="text-muted-foreground">
                            ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to select a video file
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                  {selectedFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {selectedFile && (
                  <div className="space-y-2">
                    {uploading && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Uploading...</span>
                          <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Video
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Videos in {selectedTask}</CardTitle>
              <CardDescription>
                {videos.length === 0
                  ? 'No videos found in this task folder'
                  : `${videos.length} video(s) found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Video className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload a video file above to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <div
                      key={video.name}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center space-x-3">
                        <Video className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{video.name}</p>
                          {video.transcribed && (
                            <p className="flex items-center text-sm text-green-600">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Transcribed
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleTranscribe(video.name)}
                        disabled={transcribing === video.name}
                        variant={video.transcribed ? 'outline' : 'default'}
                      >
                        {transcribing === video.name ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Transcribing...
                          </>
                        ) : video.transcribed ? (
                          'Re-transcribe'
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
