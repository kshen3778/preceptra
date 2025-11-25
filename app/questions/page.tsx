'use client';

import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Loader2, MessageSquare, Send, Paperclip, X, Image as ImageIcon, Video, VideoIcon, Square, SwitchCamera } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';

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

export default function QuestionsPage() {
  const { selectedTask } = useTask();
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{
    type: 'image' | 'video';
    filename: string;
    url: string;
    file: File;
    base64: string;
    mimeType: string;
  }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [history, setHistory] = useState<QuestionAnswer[]>([
    {
      question: "Why are some people using a vacuum for a filter change?",
      markdown: `Some experts and standard procedures recommend using a vacuum cleaner during a cabin air filter change primarily for cleaning purposes. This is considered a tribal knowledge practice to ensure optimal system performance and air quality.

Specifically, the Standard Operating Procedure (SOP) outlines the following reasons and benefits for using a handheld vacuum cleaner:

- **Cleaning the Filter Housing:** After removing the old filter, the housing where the filter sits can accumulate significant amounts of debris, such as leaves, dust, and other contaminants. A vacuum helps to thoroughly clean this area.
- **Ensuring Optimal Airflow:** Removing accumulated debris from the housing helps to ensure that air can flow freely and efficiently through the new filter and into the vehicle's HVAC system.
- **Preventing Immediate Contamination:** Cleaning the housing prevents new contaminants from entering the clean system right after a fresh filter is installed, thereby maximizing the new filter's effectiveness and longevity.
- **Improved Air Quality and System Longevity:** This additional step contributes to overall improved air quality inside the vehicle and supports the longevity of the HVAC system by keeping its components clean.

While none of the provided transcript chunks explicitly mention an expert using a vacuum, one chunk ("Oh my Good gosh this is what happens when you never change your cabin air filter we're breathing that") vividly illustrates the type of highly contaminated and debris-filled environment that would necessitate a thorough cleaning with a vacuum to improve air quality and ensure the new filter's effectiveness.`,
      sources: [
        "Latest Standard Operating Procedure (SOP)",
        "Chunk 4 (from test5, 113s-140s)"
      ]
    },
    {
      question: "The air flow seems to be lower than before I replaced it. What might have caused this?",
      markdown: `If the air flow seems lower than before after replacing your cabin air filter, the most likely cause is that the new filter was installed with the airflow direction incorrect.

**Tribal Knowledge / Expert Insight:**
Filters are designed with a specific direction for air to pass through, indicated by an "AIR FLOW" arrow on the side of the filter. Installing the filter incorrectly, meaning the arrow is pointing in the wrong direction, can significantly reduce its efficiency, compromise the filtration process, and ultimately lead to noticeably lower airflow or even potential damage to the HVAC system over time.

Experts consistently emphasize the critical importance of observing the orientation of the old filter and correctly matching the "AIR FLOW" arrow on the new filter when installing it. Typically, the arrow should point downwards, indicating the direction of air entering the cabin from the outside system.

To resolve this, you would need to re-access the filter housing, remove the filter, and reinstall it ensuring the "AIR FLOW" arrow is pointing in the correct direction as specified by the vehicle's design or by the orientation of the old filter.`,
      sources: [
        "Latest SOP (Step 5: Install the New Cabin Air Filter)",
        "Latest SOP (Important Observations and Tribal Knowledge: Airflow Direction)",
        "Chunk 1 (from test5, 140s-156s)"
      ]
    }
  ]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const filePromises = Array.from(files).map(async (file) => {
        // Validate file type
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const videoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

        if (![...imageTypes, ...videoTypes].includes(file.type)) {
          alert(`Invalid file type for ${file.name}. Only images and videos are allowed.`);
          return null;
        }

        // Validate file size
        const isVideo = videoTypes.includes(file.type);
        const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`File ${file.name} exceeds ${isVideo ? '500MB' : '100MB'} limit`);
          return null;
        }

        // Convert to base64
        return new Promise<typeof uploadedMedia[0] | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve({
              type: videoTypes.includes(file.type) ? 'video' : 'image',
              filename: file.name,
              url: base64, // Store base64 data URL for preview
              file,
              base64: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
              mimeType: file.type,
            });
          };
          reader.onerror = () => {
            alert(`Failed to read ${file.name}`);
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(filePromises);
      const successfulUploads = results.filter((r) => r !== null) as typeof uploadedMedia;
      setUploadedMedia((prev) => [...prev, ...successfulUploads]);
    } catch (error) {
      console.error('Failed to process files:', error);
      alert('Failed to process files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const openCamera = useCallback(async (facingMode: 'user' | 'environment' = 'user') => {
    setIsInitializingCamera(true);
    setIsCameraOpen(true); // Set this early so video element renders

    // Wait for next frame to ensure video element is in DOM
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      // Check if we're on HTTPS or localhost
      const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';

      if (!isSecureContext) {
        alert('Camera access requires HTTPS. Please access this site using https:// instead of http://');
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported in this browser. Please use a modern browser like Chrome, Safari, or Firefox.');
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      // Simple constraints that work across all devices
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained successfully');

      const videoTracks = stream.getVideoTracks();
      console.log('Video tracks:', videoTracks.map(t => ({
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        settings: t.getSettings()
      })));

      if (videoTracks.length === 0) {
        alert('No video track found in camera stream');
        stream.getTracks().forEach(track => track.stop());
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      setCameraFacing(facingMode);
      setRecordingStream(stream);

      // Show preview with proper setup and wait for it to load
      if (!videoPreviewRef.current) {
        console.error('Video preview element not ready after waiting');
        alert('Video preview element not ready. Please try again.');
        stream.getTracks().forEach(track => track.stop());
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        return;
      }

      const video = videoPreviewRef.current;

      // Set up video element
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      console.log('Video element setup complete, waiting for metadata...');

      // Wait for the video to be ready
      try {
        await new Promise<void>((resolve, reject) => {
          const onLoadedMetadata = () => {
            console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
            video.play()
              .then(() => {
                console.log('Video preview playing successfully');
                // Wait a bit for the stream to stabilize
                setTimeout(() => resolve(), 300);
              })
              .catch(err => {
                console.error('Error playing video preview:', err);
                reject(err);
              });
          };

          const onError = (err: Event) => {
            console.error('Video element error:', err);
            reject(new Error('Video loading failed'));
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          video.addEventListener('error', onError, { once: true });

          // Timeout after 10 seconds
          const timeout = setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Video loading timeout - metadata never loaded'));
          }, 10000);

          // Also resolve early if video is already playing
          if (video.readyState >= 2) {
            clearTimeout(timeout);
            onLoadedMetadata();
          }
        });
      } catch (error) {
        console.error('Failed to initialize video preview:', error);
        stream.getTracks().forEach(track => track.stop());
        setIsInitializingCamera(false);
        setIsCameraOpen(false);
        alert('Failed to show camera preview: ' + (error instanceof Error ? error.message : 'Unknown error'));
        return;
      }

      setIsInitializingCamera(false);
      console.log('Camera preview ready and playing');
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });

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

      // Check for supported MIME types
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

      console.log('Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: mimeType
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        console.log('Recording stopped, blob size:', blob.size);

        // Check size limit (500MB)
        if (blob.size > 500 * 1024 * 1024) {
          alert('Recording exceeds 500MB limit');
          return;
        }

        if (blob.size === 0) {
          alert('Recording failed: no data captured');
          return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
          const filename = `recording-${Date.now()}.${extension}`;

          setUploadedMedia((prev) => [...prev, {
            type: 'video',
            filename,
            url: base64,
            file: new File([blob], filename, { type: mimeType }),
            base64: base64.split(',')[1],
            mimeType: mimeType,
          }]);
        };
        reader.onerror = (error) => {
          console.error('Error reading recording:', error);
          alert('Failed to process recording');
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        alert('Recording error occurred');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('Recording started');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording: ' + (error?.message || 'Unknown error'));
    }
  }, [recordingStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const closeCamera = useCallback(() => {
    // Stop recording if active
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Stop camera stream
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
    }

    // Clear video preview
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
  }, [isRecording, recordingStream]);

  const switchCamera = useCallback(async () => {
    try {
      // Stop current stream
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 300));

      // Open with opposite camera
      const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
      await openCamera(newFacing);
    } catch (error) {
      console.error('Error switching camera:', error);
      alert('Failed to switch camera. Please try again.');
    }
  }, [recordingStream, cameraFacing, openCamera]);

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
          media: uploadedMedia.map((m) => ({
            type: m.type,
            filename: m.filename,
            base64: m.base64,
            mimeType: m.mimeType,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newQuestion = {
          question: question.trim(),
          markdown: data.markdown || '',
          sources: data.sources || [],
          media: uploadedMedia.map((m) => ({
            type: m.type,
            filename: m.filename,
            url: m.url, // Keep data URL for display in history
          })),
        };

        setHistory((prevHistory) => {
          console.log('Previous history length:', prevHistory.length);
          const newHistory = [newQuestion, ...prevHistory];
          console.log('New history length:', newHistory.length);
          return newHistory;
        });
        setQuestion('');
        setUploadedMedia([]);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Ask Questions</h1>
        <p className="text-muted-foreground">
          Get answers from your team&apos;s videos and procedure
        </p>
      </div>

      {!selectedTask ? (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xl font-semibold mb-3">Select a Task First</p>
              <p className="text-muted-foreground mb-2">
                Choose a task from the sidebar to ask questions.
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Make sure you&apos;ve completed Steps 1 & 2 first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Ask About {selectedTask}</CardTitle>
              <CardDescription>
                Get answers based on all videos and the procedure for this task.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAskQuestion} className="space-y-4">
                {isCameraOpen && (
                  <div className={`border-2 rounded-lg p-3 sm:p-4 ${
                    isInitializingCamera
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : isRecording
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3">
                      <div className="flex items-center gap-2">
                        {isInitializingCamera ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Initializing camera...</span>
                          </>
                        ) : isRecording ? (
                          <>
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">Recording...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">Camera Ready</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isRecording && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={switchCamera}
                            >
                              <SwitchCamera className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="ml-2 hidden sm:inline">Switch</span>
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={startRecording}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                              Start Recording
                            </Button>
                          </>
                        )}
                        {isRecording && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={stopRecording}
                          >
                            <Square className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            Stop Recording
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={closeCamera}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="ml-2 hidden sm:inline">Close</span>
                        </Button>
                      </div>
                    </div>
                    <video
                      ref={videoPreviewRef}
                      className="w-full aspect-video max-w-md mx-auto rounded-lg bg-black"
                      autoPlay
                      muted
                      playsInline
                    />
                  </div>
                )}
                {uploadedMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedMedia.map((media, index) => (
                      <div
                        key={index}
                        className="relative group border-2 border-border rounded-lg overflow-hidden"
                      >
                        {media.type === 'image' ? (
                          <div className="w-20 h-20 bg-muted flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-muted flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                          {media.file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    placeholder="Example: How do I troubleshoot X? What are the safety steps?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={loading || isRecording}
                    className="flex-1 min-w-0"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploading || isRecording}
                      title="Attach files"
                      className="flex-1 sm:flex-none"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Paperclip className="h-4 w-4" />
                          <span className="ml-2 sm:hidden">Attach</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => openCamera()}
                      disabled={loading || uploading || isCameraOpen || isInitializingCamera}
                      title="Record video"
                      className="flex-1 sm:flex-none"
                    >
                      {isInitializingCamera ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <VideoIcon className="h-4 w-4" />
                      )}
                      <span className="ml-2 sm:hidden">{isInitializingCamera ? 'Starting...' : 'Record'}</span>
                    </Button>
                    <Button
                      type="submit"
                      disabled={!question.trim() || loading || isRecording}
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
                </div>
              </form>
            </CardContent>
          </Card>

        </>
      )}

      {selectedTask && history.length > 0 && (
        <div className="space-y-6">
          {history.map((qa, index) => (
            <Card key={`${qa.question}-${index}`} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="flex items-start gap-3 text-xl font-semibold">
                  <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <span className="leading-relaxed">{qa.question}</span>
                    {qa.media && qa.media.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {qa.media.map((mediaItem, mediaIndex) => (
                          <div
                            key={mediaIndex}
                            className="border border-border rounded-lg overflow-hidden"
                          >
                            {mediaItem.type === 'image' ? (
                              <img
                                src={mediaItem.url}
                                alt={mediaItem.filename}
                                className="w-32 h-32 object-cover"
                              />
                            ) : (
                              <video
                                src={mediaItem.url}
                                controls
                                className="w-32 h-32 object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
      )}

      {/* Bottom spacing */}
      <div className="mb-32"></div>
    </div>
  );
}
