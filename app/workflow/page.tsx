'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Loader2, VideoIcon, Square, MessageSquare, Send, SwitchCamera, X, BookOpen, Lock, Unlock, Video, Upload, ChevronLeft, ChevronRight, Trophy, Zap, Star, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import NodeBrainGraph from '../components/NodeBrainGraph';

const LOCK_STORAGE_KEY = 'preceptra-upload-locked';
const GAMIFICATION_KEY = 'preceptra-gamification';

interface GamificationData {
  xp: number;
  level: number;
  completedSteps: { [taskName: string]: number[] };
  achievements: string[];
  lastActivity: { [taskName: string]: number };
  totalEvaluations: number;
}

function getGamificationData(): GamificationData {
  if (typeof window === 'undefined') {
    return {
      xp: 0,
      level: 1,
      completedSteps: {},
      achievements: [],
      lastActivity: {},
      totalEvaluations: 0,
    };
  }
  try {
    const stored = localStorage.getItem(GAMIFICATION_KEY);
    return stored ? JSON.parse(stored) : {
      xp: 0,
      level: 1,
      completedSteps: {},
      achievements: [],
      lastActivity: {},
      totalEvaluations: 0,
    };
  } catch {
    return {
      xp: 0,
      level: 1,
      completedSteps: {},
      achievements: [],
      lastActivity: {},
      totalEvaluations: 0,
    };
  }
}

function saveGamificationData(data: GamificationData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save gamification data:', error);
  }
}

function calculateLevel(xp: number): number {
  // Level formula: each level requires 100 * level XP
  // Level 1: 0-99 XP, Level 2: 100-299 XP, Level 3: 300-599 XP, etc.
  let level = 1;
  let requiredXP = 0;
  while (xp >= requiredXP) {
    level++;
    requiredXP += 100 * (level - 1);
  }
  return level - 1;
}

function getXPForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += 100 * (i - 1);
  }
  return total;
}

function getLockState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(LOCK_STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

type TabType = 'videos' | 'sop' | 'questions';

interface SOPStep {
  title: string;
  content: string;
  fullMarkdown: string;
}

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
  const [sopSteps, setSopSteps] = useState<SOPStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepFeedback, setStepFeedback] = useState<{ [key: number]: string | null }>({});
  const [processingStepFeedback, setProcessingStepFeedback] = useState<{ [key: number]: boolean }>({});
  const stepFeedbackFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const recordingForStepRef = useRef<number | null>(null);
  const [gamification, setGamification] = useState<GamificationData>(getGamificationData());
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [evaluationMode, setEvaluationMode] = useState<'step-by-step' | 'full'>('step-by-step');
  const [notesExpanded, setNotesExpanded] = useState(false);

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

  // Load gamification data on mount
  useEffect(() => {
    setGamification(getGamificationData());
  }, []);

  // Award XP and check achievements
  const awardXP = useCallback((amount: number, reason: string) => {
    const currentData = getGamificationData();
    const newXP = currentData.xp + amount;
    const newLevel = calculateLevel(newXP);
    const levelUp = newLevel > currentData.level;
    
    const updatedData: GamificationData = {
      ...currentData,
      xp: newXP,
      level: newLevel,
      totalEvaluations: currentData.totalEvaluations + 1,
    };

    // Check for achievements
    const newAchievements: string[] = [];
    if (updatedData.totalEvaluations === 1 && !currentData.achievements.includes('first_eval')) {
      newAchievements.push('first_eval');
    }
    if (updatedData.totalEvaluations === 10 && !currentData.achievements.includes('ten_eval')) {
      newAchievements.push('ten_eval');
    }
    if (updatedData.totalEvaluations === 50 && !currentData.achievements.includes('fifty_eval')) {
      newAchievements.push('fifty_eval');
    }
    if (newLevel >= 5 && !currentData.achievements.includes('level_five')) {
      newAchievements.push('level_five');
    }
    if (newLevel >= 10 && !currentData.achievements.includes('level_ten')) {
      newAchievements.push('level_ten');
    }

    updatedData.achievements = [...currentData.achievements, ...newAchievements];
    
    saveGamificationData(updatedData);
    setGamification(updatedData);

    // Show XP animation
    setXpGained(amount);
    setShowXPAnimation(true);
    setTimeout(() => setShowXPAnimation(false), 2000);

    // Show achievement if unlocked
    if (newAchievements.length > 0) {
      const achievementNames: { [key: string]: string } = {
        'first_eval': '🎯 First Steps',
        'ten_eval': '🔥 On Fire',
        'fifty_eval': '💎 Master Evaluator',
        'level_five': '⭐ Rising Star',
        'level_ten': '👑 Legend',
      };
      setShowAchievement(achievementNames[newAchievements[0]] || 'Achievement Unlocked!');
      setTimeout(() => setShowAchievement(null), 3000);
    }

    if (levelUp) {
      setTimeout(() => {
        alert(`🎉 LEVEL UP! You're now Level ${newLevel}! 🎉`);
      }, 500);
    }
  }, []);

  // Mark step as completed and award XP
  const markStepCompleted = useCallback((stepIndex: number) => {
    if (!taskName) return;
    
    const currentData = getGamificationData();
    const taskSteps = currentData.completedSteps[taskName] || [];
    
    if (!taskSteps.includes(stepIndex)) {
      const updatedData: GamificationData = {
        ...currentData,
        completedSteps: {
          ...currentData.completedSteps,
          [taskName]: [...taskSteps, stepIndex],
        },
        lastActivity: {
          ...currentData.lastActivity,
          [taskName]: Date.now(),
        },
      };

      saveGamificationData(updatedData);
      setGamification(updatedData);
      
      // Award XP for completing a step
      awardXP(50, 'Step completed');

      // Check for completion achievements
      const totalSteps = sopSteps.length;
      const completedCount = updatedData.completedSteps[taskName].length;
      
      if (completedCount === totalSteps && !currentData.achievements.includes(`complete_${taskName}`)) {
        const newAchievements = [...updatedData.achievements, `complete_${taskName}`];
        updatedData.achievements = newAchievements;
        saveGamificationData(updatedData);
        setGamification(updatedData);
        setTimeout(() => {
          setShowAchievement('🎯 Task Master! Completed all steps!');
          setTimeout(() => setShowAchievement(null), 3000);
        }, 1000);
      }
    }
  }, [taskName, awardXP, sopSteps.length]);

  // Parse SOP markdown into individual steps
  const parseSOPSteps = (markdown: string): SOPStep[] => {
    if (!markdown) return [];
    
    const steps: SOPStep[] = [];
    const lines = markdown.split('\n');
    let currentStep: { title: string; content: string[]; fullMarkdown: string } | null = null;
    let inNotesSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we're entering the Notes section
      if (line.match(/^##\s+(Notes|Additional Observations)/i)) {
        inNotesSection = true;
        if (currentStep) {
          steps.push({
            title: currentStep.title,
            content: currentStep.content.join('\n'),
            fullMarkdown: currentStep.fullMarkdown,
          });
          currentStep = null;
        }
        break;
      }
      
      // Match step headings: ### Step X: or ### Step X or ## Step X: etc.
      const stepMatch = line.match(/^#{1,3}\s+(Step\s+\d+[:\-]?|Step\s+\d+\.|Step\s+\d+)\s*(.+)$/i);
      if (stepMatch) {
        // Save previous step if exists
        if (currentStep) {
          steps.push({
            title: currentStep.title,
            content: currentStep.content.join('\n'),
            fullMarkdown: currentStep.fullMarkdown,
          });
        }
        
        const stepTitle = stepMatch[2]?.trim() || stepMatch[1]?.trim() || 'Untitled Step';
        currentStep = {
          title: stepTitle,
          content: [line],
          fullMarkdown: line,
        };
        continue;
      }
      
      // If we're in a step, collect its content
      if (currentStep) {
        currentStep.content.push(line);
        currentStep.fullMarkdown += '\n' + line;
      }
    }
    
    // Add the last step if exists
    if (currentStep) {
      steps.push({
        title: currentStep.title,
        content: currentStep.content.join('\n'),
        fullMarkdown: currentStep.fullMarkdown,
      });
    }
    
    // If no steps found, try to parse numbered lists or other patterns
    if (steps.length === 0) {
      // Try to find numbered list items
      const numberedListRegex = /^(\d+\.|\d+\))\s+(.+)$/gm;
      let match;
      while ((match = numberedListRegex.exec(markdown)) !== null) {
        const stepNumber = match[1];
        const stepContent = match[2];
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        
        // Get content until next numbered item or end
        let content = match[0];
        const nextMatch = numberedListRegex.exec(markdown);
        if (nextMatch) {
          content = markdown.substring(startIndex, nextMatch.index);
          numberedListRegex.lastIndex = startIndex; // Reset for next iteration
        } else {
          content = markdown.substring(startIndex);
        }
        
        steps.push({
          title: `Step ${stepNumber} ${stepContent.substring(0, 50)}${stepContent.length > 50 ? '...' : ''}`,
          content: content,
          fullMarkdown: content,
        });
      }
    }
    
    // If still no steps, create a single step with all content
    if (steps.length === 0 && markdown.trim()) {
      steps.push({
        title: 'Procedure',
        content: markdown,
        fullMarkdown: markdown,
      });
    }
    
    return steps;
  };

  const loadExistingSOP = async () => {
    if (!taskName) return;
    
    setLoadingSOP(true);
    try {
      const response = await fetch(`/api/sops?taskName=${encodeURIComponent(taskName)}&latest=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.sop) {
          const sopData = {
            markdown: data.sop.markdown || '',
            notes: data.sop.notes || '',
          };
          setSop(sopData);
          // Parse steps from markdown
          const steps = parseSOPSteps(sopData.markdown);
          setSopSteps(steps);
          setCurrentStepIndex(0);
        } else {
          setSop(null);
          setSopSteps([]);
        }
      } else {
        setSop(null);
        setSopSteps([]);
      }
    } catch (error) {
      console.error('Failed to load SOP:', error);
      setSop(null);
      setSopSteps([]);
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
      const sopData = {
        markdown: summarizeData.markdown || '',
        notes: summarizeData.notes || '',
      };
      setSop(sopData);
      // Parse steps from markdown
      const steps = parseSOPSteps(sopData.markdown);
      setSopSteps(steps);
      setCurrentStepIndex(0);
      
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

        // Check if we're in step evaluation mode
        const isStepEvaluationMode = activeTab === 'sop' && recordingForStepRef.current !== null;
        const stepIndex = recordingForStepRef.current;

        if (isStepEvaluationMode) {
          setProcessingStepFeedback(prev => ({ ...prev, [stepIndex!]: true }));
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

          if (isStepEvaluationMode) {
            // Process for step evaluation
            const feedbackResponse = await fetch('/api/tribal-feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                s3Key: urlData.s3Key,
                mimeType: urlData.mimeType,
                taskName: taskName || undefined,
                stepIndex: evaluationMode === 'step-by-step' ? stepIndex : undefined,
                stepContent: evaluationMode === 'step-by-step' && sopSteps.length > 0 && sopSteps[stepIndex!] ? sopSteps[stepIndex!].fullMarkdown : undefined,
                evaluationMode: evaluationMode,
              }),
            });

            if (!feedbackResponse.ok) {
              const error = await feedbackResponse.json();
              throw new Error(error.details || error.error || 'Failed to get feedback');
            }

            const feedbackData = await feedbackResponse.json();
            setStepFeedback(prev => ({ ...prev, [stepIndex!]: feedbackData.feedback }));
            recordingForStepRef.current = null;
            // Mark step as completed and award XP
            markStepCompleted(stepIndex!);
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
          const errorMessage = isStepEvaluationMode
            ? 'Failed to get feedback: ' + (error instanceof Error ? error.message : 'Unknown error')
            : 'Failed to process video: ' + (error instanceof Error ? error.message : 'Unknown error');
          alert(errorMessage);
        } finally {
          if (isStepEvaluationMode) {
            setProcessingStepFeedback(prev => ({ ...prev, [stepIndex!]: false }));
            recordingForStepRef.current = null;
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

          // Check if we're in step evaluation mode
          const isStepEvaluationMode = activeTab === 'sop' && recordingForStepRef.current !== null;
          const stepIndex = recordingForStepRef.current;

          if (isStepEvaluationMode) {
            setProcessingStepFeedback(prev => ({ ...prev, [stepIndex!]: true }));
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

          if (isStepEvaluationMode) {
            // Process for step evaluation
            const feedbackResponse = await fetch('/api/tribal-feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                s3Key: urlData.s3Key,
                mimeType: urlData.mimeType,
                taskName: taskName || undefined,
                stepIndex: evaluationMode === 'step-by-step' ? stepIndex : undefined,
                stepContent: evaluationMode === 'step-by-step' && sopSteps.length > 0 && sopSteps[stepIndex!] ? sopSteps[stepIndex!].fullMarkdown : undefined,
                evaluationMode: evaluationMode,
              }),
            });

            if (!feedbackResponse.ok) {
              const error = await feedbackResponse.json();
              throw new Error(error.details || error.error || 'Failed to get feedback');
            }

            const feedbackData = await feedbackResponse.json();
            setStepFeedback(prev => ({ ...prev, [stepIndex!]: feedbackData.feedback }));
            recordingForStepRef.current = null;
            // Mark step as completed and award XP
            markStepCompleted(stepIndex!);
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
          const isStepEvaluationMode = activeTab === 'sop' && recordingForStepRef.current !== null;
          const errorMessage = isStepEvaluationMode
            ? 'Failed to get feedback: ' + (error instanceof Error ? error.message : 'Unknown error')
            : 'Failed to process video: ' + (error instanceof Error ? error.message : 'Unknown error');
          alert(errorMessage);
        } finally {
          const isStepEvaluationMode = activeTab === 'sop' && recordingForStepRef.current !== null;
          const stepIndex = recordingForStepRef.current;
          if (isStepEvaluationMode) {
            setProcessingStepFeedback(prev => ({ ...prev, [stepIndex!]: false }));
            recordingForStepRef.current = null;
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

  const handleStepEvaluation = async (stepIndex: number, file?: File) => {
    if (!taskName) return;

    setProcessingStepFeedback(prev => ({ ...prev, [stepIndex]: true }));

    try {
      let s3Key: string;
      let mimeType: string;

      if (file) {
        // Handle file upload
        if (file.size > 500 * 1024 * 1024) {
          alert('File exceeds 500MB limit');
          return;
        }

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

        s3Key = urlData.s3Key;
        mimeType = urlData.mimeType;
      } else {
        // Handle recorded video (from stopRecording callback)
        // This will be handled in the stopRecording callback
        return;
      }

      const feedbackResponse = await fetch('/api/tribal-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3Key,
          mimeType,
          taskName,
          stepIndex: evaluationMode === 'step-by-step' ? stepIndex : undefined,
          stepContent: evaluationMode === 'step-by-step' && sopSteps.length > 0 && sopSteps[stepIndex] ? sopSteps[stepIndex].fullMarkdown : undefined,
          evaluationMode: evaluationMode,
        }),
      });

      if (!feedbackResponse.ok) {
        const error = await feedbackResponse.json();
        throw new Error(error.details || error.error || 'Failed to get feedback');
      }

      const data = await feedbackResponse.json();
      setStepFeedback(prev => ({ ...prev, [stepIndex]: data.feedback }));
      // Mark step as completed and award XP
      markStepCompleted(stepIndex);
    } catch (error) {
      console.error('Failed to get feedback:', error);
      alert('Failed to get feedback: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessingStepFeedback(prev => ({ ...prev, [stepIndex]: false }));
    }
  };

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
          {/* Evaluation Mode Toggle - Top Level */}
          {activeTab === 'sop' && sop && sopSteps.length > 0 && (
            <div className="mb-4 flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">View Mode</p>
                <p className="text-xs text-muted-foreground">
                  {evaluationMode === 'step-by-step' 
                    ? 'Step-by-step carousel with individual step evaluation'
                    : 'Full procedure view with complete evaluation'}
                </p>
              </div>
              <Button
                onClick={() => setEvaluationMode(prev => prev === 'step-by-step' ? 'full' : 'step-by-step')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {evaluationMode === 'step-by-step' ? (
                  <>
                    <Target className="h-4 w-4" />
                    <span>Step-by-Step</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    <span>Full Evaluation</span>
                  </>
                )}
              </Button>
            </div>
          )}

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
                  <div className="flex-1">
                    <CardTitle>
                      Procedural Knowledge
                    </CardTitle>
                    <CardDescription>
                      {sopSteps.length > 0 
                        ? `Step ${currentStepIndex + 1} of ${sopSteps.length}`
                        : 'Generated procedure from your content'}
                    </CardDescription>
                  </div>
                  {/* Gamification Stats */}
                  {taskName && (
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                          <Zap className="h-4 w-4" />
                          <span>Level {gamification.level}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {gamification.xp} XP
                        </div>
                      </div>
                      {taskName && gamification.completedSteps[taskName] && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                            <Target className="h-4 w-4" />
                            <span>{gamification.completedSteps[taskName].length}/{sopSteps.length}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Completed</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingSOP ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading procedure...</p>
                  </div>
                ) : sopSteps.length > 0 ? (
                  evaluationMode === 'full' ? (
                    // Full SOP View
                    <div className="space-y-6">
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
                          {sop?.markdown || ''}
                        </ReactMarkdown>
                      </div>

                      {/* Full Evaluation Section */}
                      <div className="mt-6 pt-6 border-t border-border">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-foreground mb-2">Evaluate Full Procedure</h3>
                          <p className="text-sm text-muted-foreground">
                            Record or upload a video of yourself performing the entire task to get comprehensive feedback
                          </p>
                        </div>
                        
                        {processingFeedback ? (
                          <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">Analyzing your performance...</p>
                          </div>
                        ) : feedback ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-md font-semibold">Feedback</h4>
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
                                onClick={() => {
                                  recordingForStepRef.current = null;
                                  openCamera('environment', true);
                                }}
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
                                        evaluationMode: 'full',
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
                      </div>

                      {/* Notes Section */}
                      {sop && sop.notes && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <button
                            onClick={() => setNotesExpanded(!notesExpanded)}
                            className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                          >
                            <h3 className="text-lg font-semibold text-foreground">Notes</h3>
                            {notesExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          {notesExpanded && (
                            <div className="mt-3 prose prose-slate max-w-none dark:prose-invert prose-sm">
                              <ReactMarkdown
                                components={{
                                  h1: ({ node, ...props }: any) => (
                                    <h1 className="text-xl font-bold mt-4 mb-2 pb-2 border-b border-border text-foreground" {...props} />
                                  ),
                                  h2: ({ node, ...props }: any) => (
                                    <h2 className="text-lg font-semibold mt-3 mb-2 text-foreground" {...props} />
                                  ),
                                  h3: ({ node, ...props }: any) => (
                                    <h3 className="text-base font-semibold mt-3 mb-1.5 text-foreground" {...props} />
                                  ),
                                  p: ({ node, ...props }: any) => (
                                    <p className="mb-2 leading-6 text-sm text-foreground" {...props} />
                                  ),
                                  ul: ({ node, ...props }: any) => (
                                    <ul className="mb-2 ml-4 list-disc space-y-1 text-sm text-foreground" {...props} />
                                  ),
                                  ol: ({ node, ...props }: any) => (
                                    <ol className="mb-2 ml-4 list-decimal space-y-1 text-sm text-foreground" {...props} />
                                  ),
                                  li: ({ node, ...props }: any) => (
                                    <li className="leading-6 text-sm" {...props} />
                                  ),
                                  strong: ({ node, ...props }: any) => (
                                    <strong className="font-semibold text-foreground" {...props} />
                                  ),
                                }}
                              >
                                {sop.notes}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Step-by-Step Carousel View
                    <div className="space-y-6">
                      {/* Progress Bar */}
                      {taskName && gamification.completedSteps[taskName] && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">
                              {Math.round((gamification.completedSteps[taskName].length / sopSteps.length) * 100)}% Complete
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out relative"
                              style={{ width: `${(gamification.completedSteps[taskName].length / sopSteps.length) * 100}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* XP Level Progress */}
                      {taskName && (
                        <div className="mb-4 p-3 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold">Level {gamification.level}</span>
                              <span className="text-xs text-muted-foreground">({gamification.xp} XP)</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {getXPForLevel(gamification.level + 1) - gamification.xp} XP to Level {gamification.level + 1}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${((gamification.xp - getXPForLevel(gamification.level)) / (getXPForLevel(gamification.level + 1) - getXPForLevel(gamification.level))) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Step Carousel */}
                      <div className="relative">
                        {/* Step Content */}
                        <div className="prose prose-slate max-w-none dark:prose-invert mb-6 border-b border-border pb-6">
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
                            {sopSteps[currentStepIndex].fullMarkdown}
                        </ReactMarkdown>
                      </div>

                      {/* Evaluation Section */}
                      <div className="mt-6 pt-6 border-t border-border">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Evaluate This Step</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Feedback will focus only on the current step shown above
                            </p>
                          </div>
                          {taskName && gamification.completedSteps[taskName]?.includes(currentStepIndex) && (
                            <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                              <Star className="h-4 w-4 fill-green-600 dark:fill-green-400" />
                              Completed! +50 XP
                            </span>
                          )}
                        </div>
                        
                        {processingStepFeedback[currentStepIndex] ? (
                          <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">Analyzing your performance...</p>
                          </div>
                        ) : stepFeedback[currentStepIndex] ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                              <h4 className="text-md font-semibold">Feedback</h4>
                        <Button
                          onClick={() => {
                                  setStepFeedback(prev => ({ ...prev, [currentStepIndex]: null }));
                                  if (stepFeedbackFileInputRefs.current[currentStepIndex]) {
                                    stepFeedbackFileInputRefs.current[currentStepIndex]!.value = '';
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
                                {stepFeedback[currentStepIndex]}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : !isCameraOpen ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                                onClick={() => {
                                  recordingForStepRef.current = currentStepIndex;
                                  openCamera('environment', true);
                                }}
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
                                ref={(el) => {
                                  if (el) stepFeedbackFileInputRefs.current[currentStepIndex] = el;
                                }}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                                  if (file) {
                                    await handleStepEvaluation(currentStepIndex, file);
                            }
                          }}
                        />
                        <Button
                                onClick={() => stepFeedbackFileInputRefs.current[currentStepIndex]?.click()}
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
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                        <Button
                          onClick={() => {
                            if (currentStepIndex > 0) {
                              setCurrentStepIndex(currentStepIndex - 1);
                              setFeedback(null);
                            }
                          }}
                          disabled={currentStepIndex === 0}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          Step {currentStepIndex + 1} of {sopSteps.length}
                        </div>
                        <Button
                          onClick={() => {
                            if (currentStepIndex < sopSteps.length - 1) {
                              setCurrentStepIndex(currentStepIndex + 1);
                              setFeedback(null);
                            }
                          }}
                          disabled={currentStepIndex === sopSteps.length - 1}
                          variant="default"
                          className="flex items-center gap-2"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Notes Section */}
                    {sop && sop.notes && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <button
                          onClick={() => setNotesExpanded(!notesExpanded)}
                          className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                        >
                          <h3 className="text-lg font-semibold text-foreground">Notes</h3>
                          {notesExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        {notesExpanded && (
                          <div className="mt-3 prose prose-slate max-w-none dark:prose-invert prose-sm">
                            <ReactMarkdown
                              components={{
                                h1: ({ node, ...props }: any) => (
                                  <h1 className="text-xl font-bold mt-4 mb-2 pb-2 border-b border-border text-foreground" {...props} />
                                ),
                                h2: ({ node, ...props }: any) => (
                                  <h2 className="text-lg font-semibold mt-3 mb-2 text-foreground" {...props} />
                                ),
                                h3: ({ node, ...props }: any) => (
                                  <h3 className="text-base font-semibold mt-3 mb-1.5 text-foreground" {...props} />
                                ),
                                p: ({ node, ...props }: any) => (
                                  <p className="mb-2 leading-6 text-sm text-foreground" {...props} />
                                ),
                                ul: ({ node, ...props }: any) => (
                                  <ul className="mb-2 ml-4 list-disc space-y-1 text-sm text-foreground" {...props} />
                                ),
                                ol: ({ node, ...props }: any) => (
                                  <ol className="mb-2 ml-4 list-decimal space-y-1 text-sm text-foreground" {...props} />
                                ),
                                li: ({ node, ...props }: any) => (
                                  <li className="leading-6 text-sm" {...props} />
                                ),
                                strong: ({ node, ...props }: any) => (
                                  <strong className="font-semibold text-foreground" {...props} />
                                ),
                              }}
                            >
                              {sop.notes}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )
                ) : sop && sop.markdown ? (
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

        </>
      )}

      {/* XP Animation */}
      {showXPAnimation && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-primary to-purple-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <span className="font-bold">+{xpGained} XP</span>
          </div>
        </div>
      )}

      {/* Achievement Notification */}
      {showAchievement && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-pulse">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-white/30">
            <Trophy className="h-8 w-8" />
            <div>
              <div className="font-bold text-lg">Achievement Unlocked!</div>
              <div className="text-sm">{showAchievement}</div>
            </div>
          </div>
        </div>
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
