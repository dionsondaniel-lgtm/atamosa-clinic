import { useState, useRef, useCallback } from 'react';
import { generateSoapNote } from '../services/geminiService';
import { SoapNote } from '../types';

// Type definition for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export const useScribe = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soapNote, setSoapNote] = useState<SoapNote | null>(null);
  
  // Simulated volume for visualizer (AudioContext is tricky on mobile with Speech API)
  const [volume, setVolume] = useState(0); 
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const volumeIntervalRef = useRef<number>();

  const startRecording = useCallback(() => {
    // Browser Support Check
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition. Please use Chrome or Safari.");
      return;
    }

    setTranscript('');
    setSoapNote(null);
    setIsGenerating(false);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.interimResults = true; 
      recognition.lang = 'en-US'; // We capture English/Phonetic, AI fixes it later

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Robust transcript reconstruction
        const currentText = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        setTranscript(currentText);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            alert("Microphone access denied. Check settings.");
            setIsRecording(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);

      // Simulate volume for UI feedback
      volumeIntervalRef.current = window.setInterval(() => {
        setVolume(Math.random() * 30 + 10);
      }, 100);

    } catch (err) {
      console.error(err);
      alert("Failed to start recording.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        setVolume(0);
    }

    setIsRecording(false);
    
    // Trigger AI Generation
    if (transcript.length > 5) {
        setIsGenerating(true);
        try {
            const note = await generateSoapNote(transcript);
            setSoapNote(note);
        } catch (e) {
            console.error("AI Generation Error", e);
            alert("Failed to generate note. Try again.");
        } finally {
            setIsGenerating(false);
        }
    }
  }, [transcript]);

  return {
    isRecording,
    isGenerating,
    transcript,
    soapNote,
    volume,
    startRecording,
    stopRecording,
    clearSession: () => {
        setTranscript('');
        setSoapNote(null);
    }
  };
};