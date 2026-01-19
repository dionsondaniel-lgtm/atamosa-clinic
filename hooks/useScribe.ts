import { useState, useRef } from 'react';
import { GeminiLiveService, generateSoapNote } from '../services/geminiService';
import { SoapNote } from '../types';

export const useScribe = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soapNote, setSoapNote] = useState<SoapNote | null>(null);
  const [volume, setVolume] = useState(0);
  
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const startRecording = async () => {
    setTranscript('');
    setSoapNote(null);
    setIsGenerating(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const updateVolume = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        setVolume(dataArray.reduce((a, b) => a + b) / dataArray.length);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Start actual AI transcription or simulation
      if (import.meta.env.VITE_GEMINI_API_KEY) {
          const service = new GeminiLiveService((text) => setTranscript(p => p + " " + text));
          await service.connect(stream);
      } else {
          // Simulation logic here if key is missing
          setTranscript("Simulated transcript: Patient has fever and cough...");
      }

      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsGenerating(true); // Start processing visual

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setVolume(0);

    try {
        if (transcript.length > 5) {
            const note = await generateSoapNote(transcript);
            setSoapNote(note);
        }
    } catch (e) {
        console.error("AI Generation Error", e);
    } finally {
        setIsGenerating(false);
    }
  };

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