# 🚀 START HERE - 3-Minute Setup

Get your AI video transcription app running locally in 3 simple steps!

---

## What You Need

1. ✅ Node.js 18+ (check: `node --version`)
2. ✅ A Gemini API key ([Get free here](https://aistudio.google.com/app/apikey))
3. ✅ A .mp4 video file to test

---

## Quick Start

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Add Your API Key

```bash
# Create environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# Use any text editor - nano, vim, VS Code, etc.
nano .env
```

In the `.env` file, replace `your_gemini_api_key_here` with your actual API key:

```env
GEMINI_API_KEY=AIzaSyC_your_actual_key_here
```

Save and close.

### 3️⃣ Add a Test Video

```bash
# Create a task folder
mkdir -p tasks/demo/videos

# Copy your video (replace path with your actual video)
cp ~/Downloads/your-video.mp4 tasks/demo/videos/
```

### 4️⃣ Start the App

```bash
npm run dev
```

Open **http://localhost:3000** in your browser!

---

## Test It Out

1. **Click "Upload"** → Select "demo" → Click "Transcribe"
2. **Click "Knowledge"** → Select "demo" → Click "Generate SOP"
3. **Click "Questions"** → Ask: "What is this video about?"

---

## How It Works

### Local Development (Now)
- ✅ No Vercel account needed
- ✅ Transcripts saved to `.kv-storage/` folder
- ✅ Everything runs on your machine

### Deploy to Production (Later)
- ✅ Same code, zero changes
- ✅ Push to Git → Import to Vercel
- ✅ Add KV database → Deploy
- ✅ See [DEPLOYMENT.md](./DEPLOYMENT.md) for details

---

## What Gets Created

```
.env                  # Your API key (gitignored)
.kv-storage/          # Your transcripts (gitignored)
tasks/
  demo/
    videos/
      your-video.mp4  # Your test video
```

---

## Common Issues

**"GEMINI_API_KEY is not set"**
```bash
# Make sure .env exists
ls -la .env

# Make sure it has your key
cat .env
```

**"No tasks found"**
```bash
# Create a task folder
mkdir -p tasks/my-task/videos
# Add .mp4 files
```

**Transcription hangs**
- Check your Gemini API quota
- Try a shorter video first (< 1 min)

---

## Documentation

- **Local dev guide**: [LOCAL_DEV_SIMPLE.md](./LOCAL_DEV_SIMPLE.md) ⭐
- **Full documentation**: [README.md](./README.md)
- **Deploy to Vercel**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Project details**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

---

## What's This App?

**Tribal Knowledge** - AI-powered video transcription and knowledge extraction

- 🎥 Transcribe videos using Gemini AI
- 📋 Generate SOPs from multiple expert demonstrations
- 💬 Ask questions about your video content (RAG-powered)
- ☁️ Deploy to Vercel with one click

Built with Next.js 14, TailwindCSS, and Google Gemini.

---

**Ready? Run `npm run dev` and go to http://localhost:3000** 🎉
