# Tribal Knowledge

AI-powered video transcription, SOP generation, and RAG-based question answering using Google Gemini.

## Features

- **Video Transcription**: Transcribe .mp4 videos using Gemini AI
- **SOP Generation**: Consolidate multiple transcripts into Standard Operating Procedures
- **RAG Q&A**: Ask questions about your transcribed content with AI-powered answers
- **Local Storage**: Everything runs locally - no cloud services required

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- TailwindCSS + shadcn/ui
- Google Gemini API
- Local file-based storage

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your Gemini API Key

```bash
cp .env.example .env
```

Edit `.env` and add your API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

Get a free API key: https://aistudio.google.com/app/apikey

### 3. Add Test Videos

```bash
mkdir -p tasks/demo/videos
# Copy your .mp4 files to tasks/demo/videos/
```

### 4. Run the App

```bash
npm run dev
```

Open http://localhost:3000

## Usage

### Upload & Transcribe
1. Click "Upload" in the sidebar
2. Select your task from the dropdown
3. Click "Transcribe" on any video
4. Wait for Gemini to process it (30s - 3min)

### Generate Knowledge (SOP)
1. Click "Knowledge" in the sidebar
2. Select a task that has transcribed videos
3. Click "Generate SOP"
4. View the consolidated procedure in Markdown

### Ask Questions
1. Click "Questions" in the sidebar
2. Select a task
3. Type your question
4. Get an AI-powered answer with sources

## Project Structure

```
tribal-knowledge/
├── app/                    # Next.js pages and components
│   ├── upload/            # Upload & transcription page
│   ├── knowledge/         # SOP generation page
│   ├── questions/         # Q&A page
│   ├── api/               # API routes
│   └── components/        # UI components
├── lib/                   # Core logic
│   ├── gemini.ts         # Gemini AI integration
│   ├── storage.ts        # Storage operations
│   └── mock-kv.ts        # Local file-based storage
├── prompts/              # AI prompts (customize these!)
│   ├── transcribe.txt
│   ├── summarize.txt
│   └── question.txt
├── tasks/                # Your task folders
│   └── demo/
│       └── videos/       # Put .mp4 files here
└── .kv-storage/          # Local transcript storage (auto-created)
```

## Storage

All transcripts are stored locally in the `.kv-storage/` folder. This is automatically created and gitignored.

To view your transcripts:
```bash
ls -la .kv-storage/
```

To reset all transcripts:
```bash
rm -rf .kv-storage
```

## Customization

### Modify AI Prompts

Edit files in `/prompts/`:
- `transcribe.txt` - Controls video transcription
- `summarize.txt` - Controls SOP generation
- `question.txt` - Controls Q&A responses

All prompts must instruct Gemini to return valid JSON.

### Adjust RAG Parameters

In `lib/gemini.ts`:
```typescript
// Change chunk size (segments per chunk)
function chunkTranscript(transcript: any, chunkSize: number = 5)

// Change number of chunks retrieved
export async function answerQuestion(..., topK: number = 5)
```

### Modify UI

All pages are in `/app/`:
- Home: `app/page.tsx`
- Upload: `app/upload/page.tsx`
- Knowledge: `app/knowledge/page.tsx`
- Questions: `app/questions/page.tsx`

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Run linter
```

## Troubleshooting

### "GEMINI_API_KEY is not set"
Make sure you created `.env` and added your API key.

### "No tasks found"
Create a task folder: `mkdir -p tasks/my-task/videos`

### Videos not showing
- Ensure files are `.mp4` format
- Check they're in `tasks/<task-name>/videos/`
- Restart dev server

### Transcription fails
- Verify your Gemini API key is valid
- Check you have API quota remaining
- Try a shorter video first (< 1 minute)

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

## Adding More Tasks

```bash
# Create a new task
mkdir -p tasks/another-task/videos

# Add videos
cp ~/Videos/*.mp4 tasks/another-task/videos/

# Refresh the page
```

## Requirements

- Node.js 18+
- Google Gemini API key (free tier works!)
- .mp4 video files

## License

NON-COMMERCIAL LICENSE

This software is licensed under a non-commercial license. See [LICENSE](./LICENSE) for full details.

**Key Restrictions:**
- ❌ **NO COMMERCIAL USE**: This software and any derivatives may NOT be used for commercial purposes
- ❌ **NO COMMERCIAL DERIVATIVES**: Any derivative works are also subject to non-commercial restrictions
- ✅ **NON-COMMERCIAL USE ALLOWED**: Personal, educational, and non-profit use is permitted

For commercial licensing inquiries, please contact the copyright holders.

## Documentation

See `/docs/` folder for detailed guides:
- [START_HERE.md](./docs/START_HERE.md) - 3-minute setup guide
- [LOCAL_DEV_SIMPLE.md](./docs/LOCAL_DEV_SIMPLE.md) - Detailed local development guide
- [PROJECT_SUMMARY.md](./docs/PROJECT_SUMMARY.md) - Technical architecture
- [SUMMARY.md](./docs/SUMMARY.md) - Complete overview
