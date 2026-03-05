# 🎤 Text-to-Speech Integration Guide

This guide explains how to use the Google Generative AI Text-to-Speech (TTS) functionality in the PrepWise project.

---

## 📋 Overview

The TTS module provides:
- ✅ Server-side TTS generation using Google Generative AI
- ✅ Client-side React hook for easy integration
- ✅ Reusable TTS button component
- ✅ API endpoints for TTS requests
- ✅ Multiple voice options and customization
- ✅ Error handling and loading states

---

## 🚀 Quick Start

### 1. In a React Component (Client-Side)

```jsx
"use client";

import { useTextToSpeech } from "@/lib/hooks/useTextToSpeech";

export function MyComponent() {
  const { speak, isLoading, isPlaying, stop } = useTextToSpeech({
    voiceName: "Kore", // Optional voice
  });

  return (
    <div>
      <button 
        onClick={() => speak("Hello, this is a test!")}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : isPlaying ? "Stop" : "Play"}
      </button>
    </div>
  );
}
```

### 2. Using the TTS Button Component

```jsx
import TextToSpeechButton from "@/components/TextToSpeechButton";

export function MyComponent() {
  return (
    <TextToSpeechButton
      text="Welcome to PrepWise!"
      label="Listen"
      voiceName="Phoebe"
    />
  );
}
```

### 3. Server-Side Usage

```typescript
import { generateSpeech, VOICE_OPTIONS } from "@/lib/modules/text-to-speech";

// In an API route or server action
const result = await generateSpeech("Hello world", {
  voiceName: VOICE_OPTIONS.KORE,
  speakingRate: 1.0,
});

if (result.success) {
  console.log("Audio data:", result.audioData);
  console.log("MIME type:", result.mimeType);
}
```

---

## 🎙️ Voice Options

Available voices:

| Voice | Gender | Characteristics |
|-------|--------|-----------------|
| **Phoebe** | Female | Warm, expressive, friendly |
| **Charon** | Male | Deep, authoritative, professional |
| **Kore** | Female | Clear, energetic, vibrant |
| **Fenrir** | Male | Smooth, calm, soothing |
| **Aoede** | Female | Melodic, musical, pleasant |

```typescript
import { VOICE_OPTIONS } from "@/lib/modules/text-to-speech";

// Use voice options
const voices = [
  VOICE_OPTIONS.PHOEBE,
  VOICE_OPTIONS.CHARON,
  VOICE_OPTIONS.KORE,
  VOICE_OPTIONS.FENRIR,
  VOICE_OPTIONS.AOEDE,
];
```

---

## ⚙️ Configuration Options

### TTSConfig Interface

```typescript
interface TTSConfig {
  voiceName?: string;        // Voice to use (default: "Kore")
  audioEncoding?: string;    // Audio format
  speakingRate?: number;     // 0.25 to 4.0 (default: 1.0)
  pitch?: number;            // -20 to 20 (default: 0)
}
```

### Examples

```typescript
// Slow, deep voice
const slowSpeech = await generateSpeech("Hello", {
  voiceName: VOICE_OPTIONS.CHARON,
  speakingRate: 0.75,
});

// Fast, high-pitched voice
const fastSpeech = await generateSpeech("Hello", {
  voiceName: VOICE_OPTIONS.PHOEBE,
  speakingRate: 1.5,
  pitch: 10,
});

// Clear, energetic voice (default)
const clearSpeech = await generateSpeech("Hello", {
  voiceName: VOICE_OPTIONS.KORE,
});
```

---

## 🔗 API Endpoints

### POST /api/tts

Convert text to speech.

**Request:**
```json
{
  "text": "Hello, this is a test!",
  "voiceName": "Kore",
  "speakingRate": 1.0,
  "pitch": 0
}
```

**Response (Success):**
```json
{
  "success": true,
  "audioData": "UklGRiYAAA...",
  "mimeType": "audio/wav"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Text-to-speech conversion failed: ..."
}
```

### GET /api/tts

Health check for TTS API.

**Response:**
```json
{
  "status": "ok",
  "name": "Text-to-Speech API",
  "description": "Convert text to speech using Google Generative AI"
}
```

---

## 🎣 useTextToSpeech Hook

The `useTextToSpeech` hook provides TTS functionality in React components.

### Usage

```typescript
const {
  speak,      // Function: speak(text: string) => Promise<void>
  stop,       // Function: stop() => void
  pause,      // Function: pause() => void
  resume,     // Function: resume() => void
  isLoading,  // Boolean: TTS is generating audio
  isPlaying,  // Boolean: Audio is currently playing
  error,      // String | null: Error message if any
} = useTextToSpeech({
  voiceName: "Kore",
  speakingRate: 1.0,
  onStart: () => console.log("Started"),
  onEnd: () => console.log("Finished"),
  onError: (error) => console.log("Error:", error),
});
```

### Full Example

```jsx
"use client";

import { useTextToSpeech, VOICE_OPTIONS } from "@/lib/hooks/useTextToSpeech";
import { useState } from "react";

export function AudioPlayer() {
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const { speak, isLoading, isPlaying, stop, error } = useTextToSpeech({
    voiceName: selectedVoice,
  });

  const text = "Interview tips: Be confident, speak clearly, ask questions.";

  return (
    <div className="space-y-4">
      {/* Voice Selector */}
      <select
        value={selectedVoice}
        onChange={(e) => setSelectedVoice(e.target.value)}
        disabled={isPlaying}
      >
        <option value="Phoebe">Phoebe (Female)</option>
        <option value="Charon">Charon (Male)</option>
        <option value="Kore">Kore (Female)</option>
        <option value="Fenrir">Fenrir (Male)</option>
        <option value="Aoede">Aoede (Female)</option>
      </select>

      {/* Play/Stop Button */}
      <button
        onClick={() => (isPlaying ? stop() : speak(text))}
        disabled={isLoading}
      >
        {isLoading ? "Generating audio..." : isPlaying ? "Stop" : "Play"}
      </button>

      {/* Error Display */}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

---

## 🧩 Module Structure

```
lib/modules/text-to-speech/
├── tts.service.ts              # Core TTS service
├── index.ts                    # Module exports
lib/hooks/
├── useTextToSpeech.ts          # React hook
components/
├── TextToSpeechButton.jsx      # Reusable component
app/api/tts/
└── route.ts                    # API endpoint
```

---

## 🔑 Environment Setup

Ensure your `.env.local` has the Google API key:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

To get your API key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Create a new API key
3. Enable Generative AI API
4. Copy the key to `.env.local`

---

## 📊 Use Cases

### 1. Interview Feedback Narration

```jsx
import TextToSpeechButton from "@/components/TextToSpeechButton";

export function FeedbackCard({ feedback }) {
  return (
    <div>
      <h3>{feedback.title}</h3>
      <p>{feedback.description}</p>
      <TextToSpeechButton
        text={feedback.description}
        voiceName="Phoebe"
        label="Listen to Feedback"
      />
    </div>
  );
}
```

### 2. Interview Questions Narration

```jsx
export function InterviewQuestion({ question }) {
  return (
    <div>
      <TextToSpeechButton
        text={question.text}
        voiceName="Charon"
        label="Play Question"
        speakingRate={0.9}
      />
      <p>{question.text}</p>
    </div>
  );
}
```

### 3. Practice Mode

```jsx
"use client";

import { useTextToSpeech } from "@/lib/hooks/useTextToSpeech";

export function InterviewPractice() {
  const { speak } = useTextToSpeech();

  const questions = [
    "Tell me about yourself",
    "What are your strengths?",
    "How would you handle conflict?"
  ];

  const handlePlayQuestion = async (question) => {
    await speak(question);
  };

  return (
    <div>
      {questions.map((q, i) => (
        <button key={i} onClick={() => handlePlayQuestion(q)}>
          Play Question {i + 1}
        </button>
      ))}
    </div>
  );
}
```

---

## ⚠️ Limitations & Notes

1. **Text Length**: Maximum 10,000 characters per request
2. **Rate Limiting**: Add delays between consecutive requests
3. **Audio Format**: Returns WAV format by default
4. **Cost**: Google charges for API usage - monitor consumption
5. **Languages**: Currently optimized for English

---

## 🐛 Troubleshooting

### "API key not found"
**Solution**: Check `.env.local` has `GOOGLE_GENERATIVE_AI_API_KEY`

### "Audio won't play"
**Solution**: Check browser console for CORS issues or ensure audio blob is correctly created

### "TTS generation is slow"
**Solution**: Long text takes time. Consider splitting into chunks with `generateSpeechStream()`

### "Voice sounds robotic"
**Solution**: Adjust `speakingRate` and `pitch` parameters for more natural sound

---

## 📖 Additional Resources

- [Google Generative AI Docs](https://developers.google.com/generative-ai)
- [Gemini API Reference](https://ai.google.dev/gemini-2-5/docs)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## 🎯 Best Practices

1. **Cache Audio**: Store generated audio to reduce API calls
2. **Stream Long Text**: Use `generateSpeechStream()` for >1000 chars
3. **User Feedback**: Show loading states while generating
4. **Error Handling**: Always handle potential API errors
5. **Voice Selection**: Choose voices based on context (formal vs casual)
6. **Rate Limiting**: Add delays between requests to avoid quota issues

---

**Last Updated**: February 28, 2026  
**Status**: ✅ Production Ready
