"use client";

// components/TextToSpeechButton.jsx
// Reusable TTS button component

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/lib/hooks/useTextToSpeech.js";
import { Loader, Volume2, Square } from "lucide-react";

/**
 * Text-to-Speech Button Component
 * 
 * @typedef {Object} TextToSpeechButtonProps
 * @property {string} text - Text to convert to speech
 * @property {string} [voiceName] - Voice name for TTS
 * @property {number} [speakingRate] - Speaking rate (0.25-4.0)
 * @property {string} [label] - Button label text
 * @property {"default" | "secondary" | "destructive" | "outline" | "ghost"} [variant] - Button variant
 * @property {"default" | "sm" | "lg" | "icon"} [size] - Button size
 * @property {string} [className] - Additional CSS classes
 * 
 * @param {TextToSpeechButtonProps} props - Component props
 * @example
 * <TextToSpeechButton 
 *   text="Hello, this is a test" 
 *   label="Listen"
 * />
 */
export default function TextToSpeechButton({
  text,
  voiceName,
  speakingRate,
  label = "Listen",
  variant = "outline",
  size = "sm",
  className,
}) {
  const { speak, stop, isLoading, isPlaying, error } = useTextToSpeech({
    voiceName,
    speakingRate,
  });

  const [showError, setShowError] = useState(false);

  const handleClick = async () => {
    if (isPlaying) {
      stop();
    } else {
      await speak(text);
      if (error) {
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
        title={
          isPlaying
            ? "Stop audio"
            : isLoading
              ? "Generating audio..."
              : "Play audio"
        }
      >
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : isPlaying ? (
          <>
            <Square className="mr-2 h-4 w-4" />
            Stop
          </>
        ) : (
          <>
            <Volume2 className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>

      {showError && error && (
        <div className="absolute z-50 mt-2 rounded-md bg-destructive/90 px-3 py-2 text-xs text-white">
          {error}
        </div>
      )}
    </div>
  );
}
