'use client';

import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Loader2, VideoIcon, Square, MessageSquare, Send, Paperclip, X, Image as ImageIcon, Video } from 'lucide-react';

type TabType = 'transcription' | 'sop' | 'questions';

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

export default function TryPage() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<any>(null);
  const [sop, setSop] = useState<{ markdown: string; notes: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transcription');
  
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
  const [history, setHistory] = useState<QuestionAnswer[]>([]);

  const openCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
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

      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: mimeType
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });

        if (blob.size > 500 * 1024 * 1024) {
          alert('Recording exceeds 500MB limit');
          return;
        }

        if (blob.size === 0) {
          alert('Recording failed: no data captured');
          return;
        }

        // Close camera
        if (recordingStream) {
          recordingStream.getTracks().forEach(track => track.stop());
          setRecordingStream(null);
        }
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
        setIsRecording(false);

        // Upload and process video
        setProcessing(true);
        try {
          // Normalize MIME type (remove codecs parameter if present)
          const normalizedMimeType = mimeType.split(';')[0];
          const fileExtension = normalizedMimeType.includes('webm') ? 'webm' : 'mp4';
          
          // Create a File with normalized MIME type
          const videoFile = new File([blob], `recording-${Date.now()}.${fileExtension}`, {
            type: normalizedMimeType
          });
          
          const formData = new FormData();
          formData.append('video', videoFile);

          const response = await fetch('/api/process-video', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || 'Failed to process video');
          }

          const data = await response.json();
          setTranscript(data.transcript);
          setSop(data.sop);
          setActiveTab('transcription');
        } catch (error) {
          console.error('Failed to process video:', error);
          alert('Failed to process video: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
          setProcessing(false);
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
  }, [recordingStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const filePromises = Array.from(files).map(async (file) => {
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const videoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

        if (![...imageTypes, ...videoTypes].includes(file.type)) {
          alert(`Invalid file type for ${file.name}. Only images and videos are allowed.`);
          return null;
        }

        const isVideo = videoTypes.includes(file.type);
        const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`File ${file.name} exceeds ${isVideo ? '500MB' : '100MB'} limit`);
          return null;
        }

        return new Promise<typeof uploadedMedia[0] | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve({
              type: videoTypes.includes(file.type) ? 'video' : 'image',
              filename: file.name,
              url: base64,
              file: file as File,
              base64: base64.split(',')[1],
              mimeType: file.type,
            });
          };
          reader.onerror = () => {
            alert(`Failed to read ${file.name}`);
            resolve(null);
          };
          reader.readAsDataURL(file as Blob);
        });
      });

      const results = await Promise.all(filePromises);
      const successfulUploads = results.filter((r: typeof uploadedMedia[0] | null): r is typeof uploadedMedia[0] => r !== null);
      setUploadedMedia((prev: typeof uploadedMedia) => [...prev, ...successfulUploads]);
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
    setUploadedMedia((prev: typeof uploadedMedia) => prev.filter((_: typeof uploadedMedia[0], i: number) => i !== index));
  };

  const handleAskQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transcript || !question.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          sop,
          question: question.trim(),
          media: uploadedMedia.map((m: typeof uploadedMedia[0]) => ({
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
          media: uploadedMedia.map((m: typeof uploadedMedia[0]) => ({
            type: m.type,
            filename: m.filename,
            url: m.url,
          })),
        };

        setHistory((prevHistory: QuestionAnswer[]) => [newQuestion, ...prevHistory]);
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

  const formatTranscript = (transcript: any) => {
    if (!transcript) return 'No transcription available.';

    const audio = transcript.audio_transcript || [];
    const visual = transcript.visual_description || [];

    let output = '## Audio Transcription\n\n';
    audio.forEach((segment: any) => {
      if (segment.speech) {
        output += `**[${segment.start}s - ${segment.end}s]** ${segment.speech}\n\n`;
      }
    });

    if (visual.length > 0) {
      output += '\n## Visual Description\n\n';
      visual.forEach((segment: any) => {
        if (segment.visual) {
          output += `**[${segment.start}s - ${segment.end}s]** ${segment.visual}\n\n`;
        }
      });
    }

    if (transcript.task_summaries && transcript.task_summaries.length > 0) {
      output += '\n## Task Summaries\n\n';
      transcript.task_summaries.forEach((summary: any) => {
        output += `- **${summary.time_range}**: ${summary.summary}\n`;
      });
    }

    return output;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Record & Analyze</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Record a video, get transcription and SOP, then ask questions
        </p>
      </div>

      {!transcript && !processing && (
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Record Video</CardTitle>
            <CardDescription>
              Start recording to capture your procedure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isCameraOpen ? (
              <Button
                onClick={() => openCamera()}
                disabled={isInitializingCamera}
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
                          className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
                        >
                          <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                          Start Recording
                        </Button>
                      )}
                      {isRecording && (
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

      {processing && (
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Processing Video</p>
              <p className="text-sm text-muted-foreground">
                Generating transcription and SOP...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {transcript && !processing && (
        <>
          <div className="mb-4 border-b border-border">
            <nav className="flex space-x-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('transcription')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'transcription'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Transcription
              </button>
              <button
                onClick={() => setActiveTab('sop')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'sop'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                SOP
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'questions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Ask Questions
              </button>
            </nav>
          </div>

          {activeTab === 'transcription' && (
            <Card>
              <CardHeader>
                <CardTitle>Transcription</CardTitle>
                <CardDescription>
                  Audio and visual transcription of your video
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }: any) => (
                        <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-border text-foreground" {...props} />
                      ),
                      h2: ({ node, ...props }: any) => (
                        <h2 className="text-xl font-semibold mt-5 mb-2.5 text-foreground" {...props} />
                      ),
                      p: ({ node, ...props }: any) => (
                        <p className="mb-3 leading-7 text-foreground" {...props} />
                      ),
                      strong: ({ node, ...props }: any) => (
                        <strong className="font-semibold text-foreground" {...props} />
                      ),
                    }}
                  >
                    {formatTranscript(transcript)}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'sop' && (
            <Card>
              <CardHeader>
                <CardTitle>Standard Operating Procedure</CardTitle>
                <CardDescription>
                  Generated SOP from your video
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sop ? (
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
                        <h3 className="text-lg font-semibold mb-2">Notes</h3>
                        <p className="text-muted-foreground">{sop.notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No SOP available.</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ask Questions</CardTitle>
                  <CardDescription>
                    Get answers based on your transcription and SOP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAskQuestion} className="space-y-4">
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
                        disabled={loading}
                        className="flex-1 min-w-0"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading || uploading}
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
                            {qa.media && qa.media.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {qa.media?.map((mediaItem: { type: 'image' | 'video'; filename: string; url: string }, mediaIndex: number) => (
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
        </>
      )}

      <div className="mb-32"></div>
    </div>
  );
}

