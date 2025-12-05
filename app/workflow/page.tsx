'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Loader2, VideoIcon, Square, MessageSquare, Send, SwitchCamera, X, BookOpen, Lock, Unlock, Video, Upload } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import NodeBrainGraph from '../components/NodeBrainGraph';

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

type TabType = 'videos' | 'sop' | 'questions' | 'tribalFeedback';

interface QuestionAnswer {
  question: string;
  markdown: string;
  sources: string[];
  media?: {
    type: 'image' | 'video';
    filename: string;
    url: string;
  }[];
}

interface SOP {
  markdown: string;
  notes: string;
  createdAt: string;
  taskName: string;
}

function WorkflowPageContent() {
  const searchParams = useSearchParams();
  const { selectedTask, setSelectedTask, tasks } = useTask();
  const taskName = searchParams?.get('task') || selectedTask;
  
  // Set the task in context when task param is present
  useEffect(() => {
    if (taskName && taskName !== selectedTask) {
      setSelectedTask(taskName);
    }
  }, [taskName, selectedTask, setSelectedTask]);

  // Check if task is a filesystem task (like Cabin Filter Replacement)
  const isFilesystemTask = (task: string | null): boolean => {
    if (!task) return false;
    // Get local tasks from localStorage
    const localTasks = typeof window !== 'undefined' ? 
      JSON.parse(localStorage.getItem('preceptra-local-tasks') || '[]') : [];
    // If task is not in local tasks, it's a filesystem task
    return !localTasks.includes(task);
  };

  const isCabinFilterTask = taskName === 'Cabin Filter Replacement';

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const currentMimeTypeRef = useRef<string>('video/webm;codecs=vp8,opus');
  const isSwitchingCameraRef = useRef<boolean>(false);
  
  const [processing, setProcessing] = useState(false);
  const [sop, setSop] = useState<{ markdown: string; notes: string } | null>(null);
  const [loadingSOP, setLoadingSOP] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('sop');
  const [isLocked, setIsLocked] = useState(false);
  const [videos, setVideos] = useState<{ name: string; transcribed: boolean }[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QuestionAnswer[]>([]);
  
  const [processingFeedback, setProcessingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackVideoRef, setFeedbackVideoRef] = useState<HTMLVideoElement | null>(null);
  const feedbackFileInputRef = useRef<HTMLInputElement>(null);
  const previousTaskNameRef = useRef<string | null>(null);
  const hasInitializedTabRef = useRef<boolean>(false);

  // Check lock state
  useEffect(() => {
    setIsLocked(getLockState());
    
    // Listen for storage changes (when lock is toggled in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCK_STORAGE_KEY) {
        setIsLocked(e.newValue === 'true');
      }
    };
    
    // Listen for custom event (when lock is toggled in same tab)
    const handleLockStateChanged = (e: CustomEvent) => {
      setIsLocked(e.detail);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('lockStateChanged', handleLockStateChanged as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lockStateChanged', handleLockStateChanged as EventListener);
    };
  }, []);

  // Set initial tab synchronously before paint - ensure it's 'sop' if taskName exists
  useLayoutEffect(() => {
    if (!hasInitializedTabRef.current && taskName) {
      hasInitializedTabRef.current = true;
      setActiveTab('sop');
      previousTaskNameRef.current = taskName;
    }
  }, [taskName]);

  // Load existing SOP and videos when task changes
  useEffect(() => {
    if (taskName) {
      // Reset to sop tab when task changes (will show loading state while SOP loads)
      if (previousTaskNameRef.current !== taskName) {
        previousTaskNameRef.current = taskName;
        setActiveTab('sop');
      }
      loadExistingSOP();
      loadVideos();
    } else {
      setSop(null);
      setVideos([]);
      previousTaskNameRef.current = null;
      setActiveTab('videos');
    }
  }, [taskName]);

  const loadExistingSOP = async () => {
    if (!taskName) return;
    
    setLoadingSOP(true);
    try {
      const response = await fetch(`/api/sops?taskName=${encodeURIComponent(taskName)}&latest=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.sop) {
          setSop({
            markdown: data.sop.markdown || '',
            notes: data.sop.notes || '',
          });
        } else {
          setSop(null);
        }
      } else {
        setSop(null);
      }
    } catch (error) {
      console.error('Failed to load SOP:', error);
      setSop(null);
    } finally {
      setLoadingSOP(false);
    }
  };

  const regenerateProcedure = async () => {
    if (!taskName) return;
    
    setLoadingSOP(true);
    try {
      // Call summarize API to regenerate SOP from existing transcripts
      const summarizeResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName }),
      });
      
      if (!summarizeResponse.ok) {
        const errorData = await summarizeResponse.json();
        throw new Error(errorData.error || 'Failed to regenerate procedure');
      }
      
      const summarizeData = await summarizeResponse.json();
      setSop({
        markdown: summarizeData.markdown || '',
        notes: summarizeData.notes || '',
      });
      
      // Reload SOP to get the saved version
      await loadExistingSOP();
    } catch (error) {
      console.error('Failed to regenerate procedure:', error);
      alert(error instanceof Error ? error.message : 'Failed to regenerate procedure. Please try again.');
    } finally {
      setLoadingSOP(false);
    }
  };

  const loadVideos = async () => {
    if (!taskName) return;
    
    setLoadingVideos(true);
    try {
      const response = await fetch(`/api/videos?taskName=${encodeURIComponent(taskName)}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const toggleLock = () => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCK_STORAGE_KEY, newLockState ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('lockStateChanged', { detail: newLockState }));
      } catch (error) {
        console.error('Failed to save lock state:', error);
      }
    }
  };

  const openCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment', skipLockCheck: boolean = false) => {
    // Check if uploads are locked (skip for tribal feedback tab)
    if (!skipLockCheck && getLockState()) {
      alert('Uploads are currently locked. Please unlock uploads in the Knowledge Content page to add new content.');
      return;
    }

    setIsInitializingCamera(true);
    setIsCameraOpen(true);

    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';

      if (!isSecureContext) {
        alert('Camera access requires HTTPS. Please access this site using https:// instead of http://');
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported in this browser. Please use a modern browser like Chrome, Safari, or Firefox.');
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTracks = stream.getVideoTracks();

      if (videoTracks.length === 0) {
        alert('No video track found in camera stream');
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      setCameraFacing(facingMode);
      setRecordingStream(stream);

      if (!videoPreviewRef.current) {
        alert('Video preview element not ready. Please try again.');
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      const video = videoPreviewRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          video.play()
            .then(() => {
              setTimeout(() => resolve(), 300);
            })
            .catch((err: Error) => {
              reject(err);
            });
        };

        const onError = () => {
          reject(new Error('Video loading failed'));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('error', onError, { once: true });

        const timeout = setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          reject(new Error('Video loading timeout'));
        }, 10000);

        if (video.readyState >= 2) {
          clearTimeout(timeout);
          onLoadedMetadata();
        }
      });

      setIsInitializingCamera(false);
    } catch (error: any) {
      setIsInitializingCamera(false);
      setIsCameraOpen(false);

      let errorMessage = 'Failed to access camera. ';

      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera and microphone permissions in your browser settings.';
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera or microphone found on your device.';
      } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else if (error?.name === 'OverconstrainedError') {
        errorMessage += 'Camera does not support the requested settings.';
      } else if (error?.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred. Please try again.';
      }

      alert(errorMessage);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!recordingStream) {
      alert('No camera stream available');
      return;
    }

    try {
      recordedChunksRef.current = [];

      let mimeType = 'video/webm;codecs=vp8,opus';
      if (typeof MediaRecorder === 'undefined') {
        alert('Video recording is not supported in this browser.');
        recordingStream.getTracks().forEach(track => track.stop());
        return;
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            alert('No supported video format found for recording.');
            recordingStream.getTracks().forEach(track => track.stop());
            return;
          }
        }
      }

      currentMimeTypeRef.current = mimeType;
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: mimeType
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (isSwitchingCameraRef.current) {
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: mimeType });

        if (blob.size > 500 * 1024 * 1024) {
          alert('Recording exceeds 500MB limit');
          return;
        }

        if (blob.size === 0) {
          alert('Recording failed: no data captured');
          return;
        }

        if (recordingStream) {
          recordingStream.getTracks().forEach(track => track.stop());
          setRecordingStream(null);
        }
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
        setIsRecording(false);

        // Check if we're in feedback mode
        const isFeedbackMode = activeTab === 'tribalFeedback';

        if (isFeedbackMode) {
          setProcessingFeedback(true);
        } else {
          setProcessing(true);
        }

        try {
          const normalizedMimeType = mimeType.split(';')[0];
          
          const urlResponse = await fetch('/api/upload-to-s3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mimeType: normalizedMimeType,
              fileSize: blob.size,
            }),
          });

          if (!urlResponse.ok) {
            const error = await urlResponse.json();
            throw new Error(error.details || error.error || 'Failed to get upload URL');
          }

          const urlData = await urlResponse.json();

          const s3UploadResponse = await fetch(urlData.presignedUrl, {
            method: 'PUT',
            body: blob,
            headers: {
              'Content-Type': normalizedMimeType,
            },
          });

          if (!s3UploadResponse.ok) {
            throw new Error(`Failed to upload to S3: ${s3UploadResponse.status} ${s3UploadResponse.statusText}`);
          }

          if (isFeedbackMode) {
            // Process for feedback
            const feedbackResponse = await fetch('/api/tribal-feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                s3Key: urlData.s3Key,
                mimeType: urlData.mimeType,
                taskName: taskName || undefined,
              }),
            });

            if (!feedbackResponse.ok) {
              const error = await feedbackResponse.json();
              throw new Error(error.details || error.error || 'Failed to get feedback');
            }

            const feedbackData = await feedbackResponse.json();
            setFeedback(feedbackData.feedback);
          } else {
            // Process for SOP generation
            const processResponse = await fetch('/api/process-video', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                s3Key: urlData.s3Key,
                mimeType: urlData.mimeType,
                taskName: taskName || undefined,
              }),
            });

            if (!processResponse.ok) {
              const error = await processResponse.json();
              throw new Error(error.details || error.error || 'Failed to process video');
            }

            const data = await processResponse.json();
            setSop(data.sop);
            setActiveTab('sop');
          }
        } catch (error) {
          console.error('Failed to process video:', error);
          const errorMessage = isFeedbackMode 
            ? 'Failed to get feedback: ' + (error instanceof Error ? error.message : 'Unknown error')
            : 'Failed to process video: ' + (error instanceof Error ? error.message : 'Unknown error');
          alert(errorMessage);
        } finally {
          if (isFeedbackMode) {
            setProcessingFeedback(false);
          } else {
            setProcessing(false);
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        alert('Recording error occurred');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording: ' + (error?.message || 'Unknown error'));
    }
  }, [recordingStream, taskName, activeTab]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      isSwitchingCameraRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const switchCameraDuringRecording = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current || !recordingStream) {
      return;
    }

    try {
      isSwitchingCameraRef.current = true;
      mediaRecorderRef.current.stop();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      recordingStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());

      const newFacingMode = cameraFacing === 'user' ? 'environment' : 'user';
      
      const constraints = {
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream;
      }

      setCameraFacing(newFacingMode);
      setRecordingStream(newStream);

      const newMediaRecorder = new MediaRecorder(newStream, {
        mimeType: currentMimeTypeRef.current
      });

      newMediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      newMediaRecorder.onstop = async () => {
        if (isSwitchingCameraRef.current) {
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: currentMimeTypeRef.current });

        if (blob.size > 500 * 1024 * 1024) {
          alert('Recording exceeds 500MB limit');
          return;
        }

        if (blob.size === 0) {
          alert('Recording failed: no data captured');
          return;
        }

        if (newStream) {
          newStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          setRecordingStream(null);
        }
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
        setIsRecording(false);

          // Check if we're in feedback mode
          const isFeedbackMode = activeTab === 'tribalFeedback';

          if (isFeedbackMode) {
            setProcessingFeedback(true);
          } else {
            setProcessing(true);
          }

        try {
          const normalizedMimeType = currentMimeTypeRef.current.split(';')[0];
          
          const urlResponse = await fetch('/api/upload-to-s3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mimeType: normalizedMimeType,
              fileSize: blob.size,
            }),
          });

          if (!urlResponse.ok) {
            const error = await urlResponse.json();
            throw new Error(error.details || error.error || 'Failed to get upload URL');
          }

          const urlData = await urlResponse.json();

          const s3UploadResponse = await fetch(urlData.presignedUrl, {
            method: 'PUT',
            body: blob,
            headers: {
              'Content-Type': normalizedMimeType,
            },
          });

          if (!s3UploadResponse.ok) {
            throw new Error(`Failed to upload to S3: ${s3UploadResponse.status} ${s3UploadResponse.statusText}`);
          }

          if (isFeedbackMode) {
            // Process for feedback
            const feedbackResponse = await fetch('/api/tribal-feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                s3Key: urlData.s3Key,
                mimeType: urlData.mimeType,
                taskName: taskName || undefined,
              }),
            });

            if (!feedbackResponse.ok) {
              const error = await feedbackResponse.json();
              throw new Error(error.details || error.error || 'Failed to get feedback');
            }

            const feedbackData = await feedbackResponse.json();
            setFeedback(feedbackData.feedback);
          } else {
            // Process for SOP generation
            const processResponse = await fetch('/api/process-video', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                s3Key: urlData.s3Key,
                mimeType: urlData.mimeType,
                taskName: taskName || undefined,
              }),
            });

            if (!processResponse.ok) {
              const error = await processResponse.json();
              throw new Error(error.details || error.error || 'Failed to process video');
            }

            const data = await processResponse.json();
            setSop(data.sop);
            setActiveTab('sop');
          }
        } catch (error) {
          console.error('Failed to process video:', error);
          const isFeedbackMode = activeTab === 'tribalFeedback';
          const errorMessage = isFeedbackMode 
            ? 'Failed to get feedback: ' + (error instanceof Error ? error.message : 'Unknown error')
            : 'Failed to process video: ' + (error instanceof Error ? error.message : 'Unknown error');
          alert(errorMessage);
        } finally {
          const isFeedbackMode = activeTab === 'tribalFeedback';
          if (isFeedbackMode) {
            setProcessingFeedback(false);
          } else {
            setProcessing(false);
          }
        }
      };

      newMediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        alert('Recording error occurred');
      };

      mediaRecorderRef.current = newMediaRecorder;
      newMediaRecorder.start(1000);
      isSwitchingCameraRef.current = false;
    } catch (error: any) {
      console.error('Error switching camera:', error);
      isSwitchingCameraRef.current = false;
      alert('Failed to switch camera: ' + (error?.message || 'Unknown error'));
    }
  }, [isRecording, recordingStream, cameraFacing, taskName, activeTab]);

  const closeCamera = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
  }, [isRecording, recordingStream]);

  const handleAskQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!taskName || !question.trim()) return;

    setLoading(true);

    try {
      // Use RAG endpoint which automatically loads transcripts and SOP if they exist
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName,
          question: question.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newQuestion = {
          question: question.trim(),
          markdown: data.markdown || '',
          sources: data.sources || [],
        };

        setHistory((prevHistory: QuestionAnswer[]) => [newQuestion, ...prevHistory]);
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

  if (!taskName) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xl font-semibold mb-3">Select a Task First</p>
              <p className="text-muted-foreground mb-2">
                Choose a task from the top navigation to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if current task is a local/demo task
  const isLocalTask = taskName && !isFilesystemTask(taskName);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {isLocalTask && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-900">Demo Task - No long term storage</p>
          <p className="text-xs text-amber-800 mt-1">Task will be deleted upon reload</p>
        </div>
      )}
      <div className="mb-6">
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">
            Task: <span className="font-semibold">{taskName}</span>
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Task Knowledge Lake</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          A searchable lake of your team's knowledge, extracted right from uploaded content.
        </p>
      </div>

      {processing && (
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Processing Content</p>
              <p className="text-sm text-muted-foreground">
                Generating procedure...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!processing && (
        <>
          <div className="mb-4 border-b border-border">
            <nav className="flex space-x-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('sop')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  (activeTab as TabType) === 'sop'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Procedure
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  (activeTab as TabType) === 'questions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Ask Questions
              </button>
              <button
                onClick={() => setActiveTab('tribalFeedback')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  (activeTab as TabType) === 'tribalFeedback'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Get Feedback
              </button>
            </nav>
          </div>

          {activeTab === 'videos' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Knowledge Graph</CardTitle>
                  </div>
                  {isCabinFilterTask ? (
                    <div className="text-sm font-medium text-orange-600">
                      LOCKED
                    </div>
                  ) : !isFilesystemTask(taskName) ? (
                    <Button
                      onClick={() => openCamera()}
                      disabled={isInitializingCamera}
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <VideoIcon className="h-4 w-4" />
                      <span>Record</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={toggleLock}
                      variant={isLocked ? 'destructive' : 'default'}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isLocked ? (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>LOCKED</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4" />
                          <span>Unlock</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                
                {!sop && !isCabinFilterTask && (
                  <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle>Add Content {isLocked && !isFilesystemTask(taskName) ? '' : isLocked ? <span className="ml-2 text-sm font-normal text-orange-600">(LOCKED)</span> : ''}</CardTitle>
                      <CardDescription>
                      A searchable lake of your team's real knowledge, extracted from uploaded content.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!isCameraOpen ? (
                        <Button
                          onClick={() => openCamera()}
                          disabled={isInitializingCamera || isLocked}
                          className="w-full sm:w-auto"
                          size="lg"
                        >
                          {isInitializingCamera ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Initializing...
                            </>
                          ) : (
                            <>
                              <VideoIcon className="mr-2 h-4 w-4" />
                              Start Recording
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div className={`border-2 rounded-lg p-3 sm:p-4 ${
                            isInitializingCamera
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : isRecording
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                              : 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          }`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                {isInitializingCamera ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Initializing...</span>
                                  </>
                                ) : isRecording ? (
                                  <>
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">Recording...</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Ready</span>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                {!isRecording && (
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={startRecording}
                                    className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                                  >
                                    <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                                    Start Recording
                                  </Button>
                                )}
                                {isRecording && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={switchCameraDuringRecording}
                                      className="flex-1 sm:flex-none"
                                      title="Switch Camera"
                                    >
                                      <SwitchCamera className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span className="ml-2 hidden sm:inline">Switch</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={stopRecording}
                                      className="flex-1 sm:flex-none"
                                    >
                                      <Square className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                      Stop Recording
                                    </Button>
                                  </>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={closeCamera}
                                  className="flex-1 sm:flex-none"
                                >
                                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="ml-2 hidden sm:inline">Close</span>
                                </Button>
                              </div>
                            </div>
                            <video
                              ref={videoPreviewRef}
                              className="w-full aspect-video rounded-lg bg-black"
                              autoPlay
                              muted
                              playsInline
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <NodeBrainGraph />
              </CardContent>
            </Card>
          )}

          {(activeTab as TabType) === 'sop' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Procedural Knowledge</CardTitle>
                    <CardDescription>
                      Generated procedure from your content
                    </CardDescription>
                  </div>
                  {sop && (
                    <Button
                      onClick={regenerateProcedure}
                      disabled={loadingSOP}
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                    >
                      {loadingSOP ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Regenerating...</span>
                        </>
                      ) : (
                        <>
                          <VideoIcon className="h-4 w-4" />
                          <span>Regenerate Procedure</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingSOP ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading procedure...</p>
                  </div>
                ) : sop ? (
                  <>
                    <div className="prose prose-slate max-w-none dark:prose-invert mb-6">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }: any) => (
                            <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-border text-foreground" {...props} />
                          ),
                          h2: ({ node, ...props }: any) => (
                            <h2 className="text-xl font-semibold mt-5 mb-2.5 text-foreground" {...props} />
                          ),
                          h3: ({ node, ...props }: any) => (
                            <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
                          ),
                          p: ({ node, ...props }: any) => (
                            <p className="mb-3 leading-7 text-foreground" {...props} />
                          ),
                          ul: ({ node, ...props }: any) => (
                            <ul className="mb-3 ml-6 list-disc space-y-1.5 text-foreground" {...props} />
                          ),
                          ol: ({ node, ...props }: any) => (
                            <ol className="mb-3 ml-6 list-decimal space-y-1.5 text-foreground" {...props} />
                          ),
                          li: ({ node, ...props }: any) => (
                            <li className="leading-7" {...props} />
                          ),
                          strong: ({ node, ...props }: any) => (
                            <strong className="font-semibold text-foreground" {...props} />
                          ),
                        }}
                      >
                        {sop.markdown}
                      </ReactMarkdown>
                    </div>
                    {sop.notes && (
                      <div className="mt-6 pt-5 border-t border-border">
                        <h3 className="text-lg font-semibold mb-3 text-foreground">Notes</h3>
                        <div className="prose prose-slate max-w-none dark:prose-invert">
                          <ReactMarkdown
                            components={{
                              h1: ({ node, ...props }: any) => (
                                <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-border text-foreground" {...props} />
                              ),
                              h2: ({ node, ...props }: any) => (
                                <h2 className="text-xl font-semibold mt-5 mb-2.5 text-foreground" {...props} />
                              ),
                              h3: ({ node, ...props }: any) => (
                                <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
                              ),
                              p: ({ node, ...props }: any) => (
                                <p className="mb-3 leading-7 text-foreground" {...props} />
                              ),
                              ul: ({ node, ...props }: any) => (
                                <ul className="mb-3 ml-6 list-disc space-y-1.5 text-foreground" {...props} />
                              ),
                              ol: ({ node, ...props }: any) => (
                                <ol className="mb-3 ml-6 list-decimal space-y-1.5 text-foreground" {...props} />
                              ),
                              li: ({ node, ...props }: any) => (
                                <li className="leading-7" {...props} />
                              ),
                              strong: ({ node, ...props }: any) => (
                                <strong className="font-semibold text-foreground" {...props} />
                              ),
                            }}
                          >
                            {sop.notes}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No procedure available. Add content to generate one.</p>
                )}
              </CardContent>
            </Card>
          )}

          {(activeTab as TabType) === 'questions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ask Questions</CardTitle>
                  <CardDescription>
                    Get answers based on transcripts and procedure (if available)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAskQuestion} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="text"
                        placeholder="Example: How do I troubleshoot X? What are the safety steps?"
                        value={question}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
                        disabled={loading}
                        className="flex-1 min-w-0"
                      />
                      <Button
                        type="submit"
                        disabled={!question.trim() || loading}
                        size="lg"
                        className="flex-1 sm:flex-none"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">Thinking...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 sm:mr-2" />
                            <span className="ml-2 sm:ml-0">Ask</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {history.length > 0 && (
                <div className="space-y-6">
                  {history.map((qa: QuestionAnswer, index: number) => (
                    <Card key={`${qa.question}-${index}`} className="overflow-hidden">
                      <CardHeader className="bg-muted/30 border-b border-border">
                        <CardTitle className="flex items-start gap-3 text-xl font-semibold">
                          <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                            <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                          </div>
                          <div className="flex-1">
                            <span className="leading-relaxed">{qa.question}</span>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="markdown-content prose prose-slate max-w-none dark:prose-invert">
                          <ReactMarkdown
                            components={{
                              h1: ({ node, ...props }: any) => (
                                <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-border text-foreground" {...props} />
                              ),
                              h2: ({ node, ...props }: any) => (
                                <h2 className="text-xl font-semibold mt-5 mb-2.5 text-foreground" {...props} />
                              ),
                              h3: ({ node, ...props }: any) => (
                                <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
                              ),
                              p: ({ node, ...props }: any) => (
                                <p className="mb-3 leading-7 text-foreground" {...props} />
                              ),
                              ul: ({ node, ...props }: any) => (
                                <ul className="mb-3 ml-6 list-disc space-y-1.5 text-foreground" {...props} />
                              ),
                              ol: ({ node, ...props }: any) => (
                                <ol className="mb-3 ml-6 list-decimal space-y-1.5 text-foreground" {...props} />
                              ),
                              li: ({ node, ...props }: any) => (
                                <li className="leading-7" {...props} />
                              ),
                              strong: ({ node, ...props }: any) => (
                                <strong className="font-semibold text-foreground" {...props} />
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
                              {qa.sources.map((source: string, idx: number) => (
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
          )}

          {(activeTab as TabType) === 'tribalFeedback' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Get Feedback</CardTitle>
                  <CardDescription>
                    Record or upload a video of yourself performing the task to get feedback based on expert knowledge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {processingFeedback ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-2">Analyzing Your Performance</p>
                      <p className="text-sm text-muted-foreground">
                        Comparing your video against expert knowledge...
                      </p>
                    </div>
                  ) : feedback ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Feedback</h3>
                        <Button
                          onClick={() => {
                            setFeedback(null);
                            if (feedbackFileInputRef.current) {
                              feedbackFileInputRef.current.value = '';
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Upload Another
                        </Button>
                      </div>
                      <div className="prose prose-slate max-w-none dark:prose-invert">
                        <ReactMarkdown
                          components={{
                            h1: ({ node, ...props }: any) => (
                              <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-border text-foreground" {...props} />
                            ),
                            h2: ({ node, ...props }: any) => (
                              <h2 className="text-xl font-semibold mt-5 mb-2.5 text-foreground" {...props} />
                            ),
                            h3: ({ node, ...props }: any) => (
                              <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
                            ),
                            p: ({ node, ...props }: any) => (
                              <p className="mb-3 leading-7 text-foreground" {...props} />
                            ),
                            ul: ({ node, ...props }: any) => (
                              <ul className="mb-3 ml-6 list-disc space-y-1.5 text-foreground" {...props} />
                            ),
                            ol: ({ node, ...props }: any) => (
                              <ol className="mb-3 ml-6 list-decimal space-y-1.5 text-foreground" {...props} />
                            ),
                            li: ({ node, ...props }: any) => (
                              <li className="leading-7" {...props} />
                            ),
                            strong: ({ node, ...props }: any) => (
                              <strong className="font-semibold text-foreground" {...props} />
                            ),
                          }}
                        >
                          {feedback}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : !isCameraOpen ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                          onClick={() => openCamera('environment', true)}
                          disabled={isInitializingCamera}
                          className="flex-1"
                          size="lg"
                        >
                          {isInitializingCamera ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Initializing...
                            </>
                          ) : (
                            <>
                              <VideoIcon className="mr-2 h-4 w-4" />
                              Record Video
                            </>
                          )}
                        </Button>
                        <input
                          ref={feedbackFileInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !taskName) return;

                            if (file.size > 500 * 1024 * 1024) {
                              alert('File exceeds 500MB limit');
                              return;
                            }

                            setProcessingFeedback(true);
                            try {
                              const normalizedMimeType = file.type || 'video/mp4';
                              
                              const urlResponse = await fetch('/api/upload-to-s3', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  mimeType: normalizedMimeType,
                                  fileSize: file.size,
                                }),
                              });

                              if (!urlResponse.ok) {
                                const error = await urlResponse.json();
                                throw new Error(error.details || error.error || 'Failed to get upload URL');
                              }

                              const urlData = await urlResponse.json();

                              const s3UploadResponse = await fetch(urlData.presignedUrl, {
                                method: 'PUT',
                                body: file,
                                headers: {
                                  'Content-Type': normalizedMimeType,
                                },
                              });

                              if (!s3UploadResponse.ok) {
                                throw new Error(`Failed to upload to S3: ${s3UploadResponse.status} ${s3UploadResponse.statusText}`);
                              }

                              const feedbackResponse = await fetch('/api/tribal-feedback', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  s3Key: urlData.s3Key,
                                  mimeType: urlData.mimeType,
                                  taskName,
                                }),
                              });

                              if (!feedbackResponse.ok) {
                                const error = await feedbackResponse.json();
                                throw new Error(error.details || error.error || 'Failed to get feedback');
                              }

                              const data = await feedbackResponse.json();
                              setFeedback(data.feedback);
                            } catch (error) {
                              console.error('Failed to get feedback:', error);
                              alert('Failed to get feedback: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            } finally {
                              setProcessingFeedback(false);
                              if (feedbackFileInputRef.current) {
                                feedbackFileInputRef.current.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          onClick={() => feedbackFileInputRef.current?.click()}
                          variant="outline"
                          className="flex-1"
                          size="lg"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Video
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`border-2 rounded-lg p-3 sm:p-4 ${
                        isInitializingCamera
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : isRecording
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      }`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {isInitializingCamera ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Initializing...</span>
                              </>
                            ) : isRecording ? (
                              <>
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-red-600 dark:text-red-400">Recording...</span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-600 dark:text-green-400">Ready</span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            {!isRecording && (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={startRecording}
                                className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                              >
                                <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                                Start Recording
                              </Button>
                            )}
                            {isRecording && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={switchCameraDuringRecording}
                                  className="flex-1 sm:flex-none"
                                  title="Switch Camera"
                                >
                                  <SwitchCamera className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="ml-2 hidden sm:inline">Switch</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={stopRecording}
                                  className="flex-1 sm:flex-none"
                                >
                                  <Square className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                  Stop Recording
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={closeCamera}
                              className="flex-1 sm:flex-none"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="ml-2 hidden sm:inline">Close</span>
                            </Button>
                          </div>
                        </div>
                        <video
                          ref={videoPreviewRef}
                          className="w-full aspect-video rounded-lg bg-black"
                          autoPlay
                          muted
                          playsInline
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <div className="mb-32"></div>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <WorkflowPageContent />
    </Suspense>
  );
}
