"use client";

// lib/hooks/useTextToSpeech.js
// React hook for text-to-speech functionality in client components

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

/**
 * @typedef {Object} UseTTSOptions
 * @property {string} [voiceName]
 * @property {number} [speakingRate]
 * @property {() => void} [onStart]
 * @property {() => void} [onEnd]
 * @property {(error: string) => void} [onError]
 */

/**
 * @typedef {Object} UseTTSState
 * @property {boolean} isLoading
 * @property {boolean} isPlaying
 * @property {string|null} error
 */

/**
 * React hook for text-to-speech functionality
 * 
 * @param {UseTTSOptions} options - Hook options
 * @returns {{speak: (text: string) => Promise<void>, stop: () => void, pause: () => void, resume: () => void, isLoading: boolean, isPlaying: boolean, error: string|null}}
 * 
 * @example
 * const { speak, isLoading, isPlaying, stop } = useTextToSpeech();
 * 
 * // In JSX
 * <button onClick={() => speak('Hello world')}>
 *   {isLoading ? 'Generating...' : isPlaying ? 'Playing...' : 'Play'}
 * </button>
 */
export function useTextToSpeech(options = {}) {
  const [state, setState] = useState({
    isLoading: false,
    isPlaying: false,
    error: null,
  });

  const audioRef = useRef(null);

  /**
   * Speak the provided text
   */
  const speak = useCallback(
    async (text) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        options.onStart?.();

        // Call server-side TTS endpoint
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voiceName: options.voiceName,
            speakingRate: options.speakingRate,
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to generate speech");
        }

        // Create audio blob from base64
        const binaryString = atob(data.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const audioBlob = new Blob([bytes], { type: data.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => setState((prev) => ({ ...prev, isPlaying: true }));
        audio.onended = () => {
          setState((prev) => ({ ...prev, isPlaying: false }));
          URL.revokeObjectURL(audioUrl);
          options.onEnd?.();
        };
        audio.onerror = () => {
          const error = "Audio playback failed";
          setState((prev) => ({ ...prev, isPlaying: false, error }));
          options.onError?.(error);
        };

        audio.play();
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        options.onError?.(errorMessage);
        toast.error(`TTS Error: ${errorMessage}`);
      }
    },
    [options]
  );

  /**
   * Stop current audio playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  /**
   * Pause current playback
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  /**
   * Resume playback
   */
  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isLoading: state.isLoading,
    isPlaying: state.isPlaying,
    error: state.error,
  };
}
