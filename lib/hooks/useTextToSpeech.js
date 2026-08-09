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
  const isWebSpeechRef = useRef(false);

  /**
   * Browser-native Speech Synthesis Fallback
   */
  const speakWebSpeech = useCallback((text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      throw new Error("Speech synthesis not supported in this browser");
    }

    isWebSpeechRef.current = true;
    window.speechSynthesis.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en-")) || voices[0];
    if (englishVoice) utterance.voice = englishVoice;
    
    if (options.speakingRate) utterance.rate = options.speakingRate;

    utterance.onstart = () => {
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
      options.onStart?.();
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      isWebSpeechRef.current = false;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.error("Web Speech Synthesis error:", e);
      setState(prev => ({ ...prev, isPlaying: false, error: e.error || "Speech synthesis failed" }));
      isWebSpeechRef.current = false;
      options.onError?.(e.error || "Speech synthesis failed");
    };

    window.speechSynthesis.speak(utterance);

    // Mock interface to conform with HTMLAudioElement controls
    audioRef.current = {
      pause: () => window.speechSynthesis.pause(),
      play: () => window.speechSynthesis.resume(),
      currentTime: 0
    };
  }, [options]);

  /**
   * Speak the provided text
   */
  const speak = useCallback(
    async (text, forceCloud = false) => {
      // 1. By default, run Browser-Native Web Speech API first (instant, 100% free, offline)
      if (!forceCloud) {
        try {
          speakWebSpeech(text);
          return;
        } catch (error) {
          console.warn("Web Speech API failed or unsupported, falling back to Cloud TTS:", error.message);
        }
      }

      // 2. Cloud TTS fallback / manual force override
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Attempt Cloud TTS
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
          throw new Error(`Cloud TTS failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to generate cloud speech");
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
        isWebSpeechRef.current = false;

        audio.onplay = () => setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
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
      } catch (error) {
        const errorMessage = error.message || "Failed to play speech";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        options.onError?.(errorMessage);
        toast.error(`TTS Error: ${errorMessage}`);
      }
    },
    [options, speakWebSpeech]
  );

  /**
   * Stop current audio playback
   */
  const stop = useCallback(() => {
    if (isWebSpeechRef.current) {
      window.speechSynthesis.cancel();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  /**
   * Pause current playback
   */
  const pause = useCallback(() => {
    if (isWebSpeechRef.current) {
      window.speechSynthesis.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  /**
   * Resume playback
   */
  const resume = useCallback(() => {
    if (isWebSpeechRef.current) {
      window.speechSynthesis.resume();
      setState((prev) => ({ ...prev, isPlaying: true }));
    } else if (audioRef.current) {
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
