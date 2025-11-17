import fs from 'fs/promises';
import path from 'path';
import { mockKv } from './mock-kv';

// Use local file-based storage
const kv = mockKv;

export interface AudioSegment {
  start: number;
  end: number;
  speech: string;
}

export interface VisualSegment {
  start: number;
  end: number;
  visual: string;
}

export interface TaskSummary {
  time_range: string;
  summary: string;
}

export interface Transcript {
  audio_transcript: AudioSegment[];
  visual_description: VisualSegment[];
  task_summaries: TaskSummary[];
  // Legacy fields for backward compatibility
  text?: string;
  segments?: AudioSegment[];
  videoName?: string;
}

/**
 * Save a transcript to both the transcribe/ folder and KV store
 * @param taskName - Name of the task
 * @param videoName - Name of the video file (without extension)
 * @param transcriptData - Transcript JSON data
 */
export async function saveTranscript(
  taskName: string,
  videoName: string,
  transcriptData: Transcript
): Promise<void> {
  // Save to transcribe/ folder as .txt file
  const transcribeDir = path.join(process.cwd(), 'tasks', taskName, 'transcribe');
  await fs.mkdir(transcribeDir, { recursive: true });

  const transcriptPath = path.join(transcribeDir, `${videoName}.txt`);
  await fs.writeFile(transcriptPath, JSON.stringify(transcriptData, null, 2), 'utf-8');

  // Also save to KV store
  const key = `tasks/${taskName}/${videoName}.json`;
  await kv.set(key, JSON.stringify(transcriptData));
}

/**
 * Load all transcripts for a given task from transcribe/ folder and KV store
 * First tries to load from transcribe/ folder, then syncs to KV store
 * @param taskName - Name of the task
 * @returns Array of transcripts with video names
 */
export async function loadTranscripts(taskName: string): Promise<Transcript[]> {
  const transcripts: Transcript[] = [];

  // First, load from transcribe/ folder
  const transcribeDir = path.join(process.cwd(), 'tasks', taskName, 'transcribe');

  try {
    const files = await fs.readdir(transcribeDir);
    const txtFiles = files.filter(file => file.endsWith('.txt'));

    for (const file of txtFiles) {
      const filePath = path.join(transcribeDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const transcript = JSON.parse(content);
      const videoName = file.replace('.txt', '');

      transcripts.push({
        ...transcript,
        videoName,
      });

      // Sync to KV store if not already there
      const key = `tasks/${taskName}/${videoName}.json`;
      const kvData = await kv.get(key);
      if (!kvData) {
        await kv.set(key, JSON.stringify(transcript));
      }
    }
  } catch (error) {
    // If transcribe directory doesn't exist, fall back to KV store only
    const pattern = `tasks/${taskName}/*`;
    const keys = await kv.keys(pattern);

    for (const key of keys) {
      const data = await kv.get(key);
      if (data) {
        const transcript = typeof data === 'string' ? JSON.parse(data) : data;
        const videoName = key.split('/').pop()?.replace('.json', '') || '';
        transcripts.push({
          ...transcript,
          videoName,
        });
      }
    }
  }

  return transcripts;
}

/**
 * List all task folders from the filesystem
 * @returns Array of task names
 */
export async function listTasks(): Promise<string[]> {
  const tasksDir = path.join(process.cwd(), 'tasks');

  try {
    const entries = await fs.readdir(tasksDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    // If tasks directory doesn't exist, return empty array
    return [];
  }
}

/**
 * List all video files for a given task from the filesystem
 * @param taskName - Name of the task
 * @returns Array of video file names
 */
export async function listVideos(taskName: string): Promise<string[]> {
  const videosDir = path.join(process.cwd(), 'tasks', taskName, 'video');

  try {
    const entries = await fs.readdir(videosDir);
    return entries.filter(file => file.endsWith('.mp4'));
  } catch (error) {
    // If video directory doesn't exist, return empty array
    return [];
  }
}

/**
 * Check if a transcript exists in local storage for a given video
 * @param taskName - Name of the task
 * @param videoName - Name of the video file
 * @returns Boolean indicating if transcript exists
 */
export async function transcriptExists(
  taskName: string,
  videoName: string
): Promise<boolean> {
  const key = `tasks/${taskName}/${videoName}.json`;
  const data = await kv.get(key);
  return data !== null;
}

/**
 * Get a single transcript from local storage
 * @param taskName - Name of the task
 * @param videoName - Name of the video file
 * @returns Transcript or null if not found
 */
export async function getTranscript(
  taskName: string,
  videoName: string
): Promise<Transcript | null> {
  const key = `tasks/${taskName}/${videoName}.json`;
  const data = await kv.get(key);

  if (!data) return null;

  const transcript = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    ...transcript,
    videoName,
  };
}

export interface SOP {
  markdown: string;
  notes: string;
  createdAt: string;
  taskName: string;
}

/**
 * Save an SOP to the tasks folder
 * @param taskName - Name of the task
 * @param sop - SOP object with markdown and notes
 * @returns Path to the saved SOP file
 */
export async function saveSOP(taskName: string, sop: { markdown: string; notes: string }): Promise<string> {
  const sopDir = path.join(process.cwd(), 'tasks', taskName, 'sop');
  await fs.mkdir(sopDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sopPath = path.join(sopDir, `sop-${timestamp}.json`);
  
  const sopData: SOP = {
    ...sop,
    createdAt: new Date().toISOString(),
    taskName,
  };

  await fs.writeFile(sopPath, JSON.stringify(sopData, null, 2), 'utf-8');
  console.log('[Storage] SOP saved to:', sopPath);
  
  return sopPath;
}

/**
 * Load all SOPs for a given task
 * @param taskName - Name of the task
 * @returns Array of SOPs sorted by creation date (newest first)
 */
export async function loadSOPs(taskName: string): Promise<SOP[]> {
  const sopDir = path.join(process.cwd(), 'tasks', taskName, 'sop');

  try {
    const files = await fs.readdir(sopDir);
    const jsonFiles = files.filter(file => file.endsWith('.json') && file.startsWith('sop-'));

    const sops: SOP[] = [];
    for (const file of jsonFiles) {
      const filePath = path.join(sopDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const sop = JSON.parse(content) as SOP;
      sops.push(sop);
    }

    // Sort by creation date, newest first
    sops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return sops;
  } catch (error) {
    // If sop directory doesn't exist, return empty array
    return [];
  }
}

/**
 * Get the most recent SOP for a task
 * @param taskName - Name of the task
 * @returns Most recent SOP or null if none exists
 */
export async function getLatestSOP(taskName: string): Promise<SOP | null> {
  const sops = await loadSOPs(taskName);
  return sops.length > 0 ? sops[0] : null;
}
