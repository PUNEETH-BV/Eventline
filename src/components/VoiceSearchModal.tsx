'use client';

import React, { useEffect, useState, useRef } from 'react';

interface VoiceSearchModalProps {
  onClose: () => void;
  onSearch: (query: string) => void;
}

type ModalStatus = 'connecting' | 'listening' | 'processing' | 'searching' | 'error';

export default function VoiceSearchModal({ onClose, onSearch }: VoiceSearchModalProps) {
  const [status, setStatus] = useState<ModalStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Initialize voice connection
  useEffect(() => {
    let active = true;

    async function startVoiceSession() {
      try {
        // 1. Get user mic permission first
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
          throw new Error('Microphone permission denied. Please allow mic access and try again.');
        });
        
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;

        // 2. Fetch API key from server
        setStatus('connecting');
        const configRes = await fetch('/api/voice-config');
        if (!configRes.ok) {
          throw new Error('Failed to load server voice configuration.');
        }
        const { apiKey } = await configRes.json();

        if (!active) return;

        // 3. Connect to Gemini Live WebSocket
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.BidiGenerateContent?key=${apiKey}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) {
            ws.close();
            return;
          }
          
          // Send setup message
          const setupMsg = {
            setup: {
              model: 'models/gemini-2.0-flash-live-001',
              generationConfig: {
                responseModalities: ['TEXT'],
              },
              systemInstruction: {
                parts: [
                  {
                    text: "You are EventLine's voice assistant. When the user speaks, extract the event they want to search for and respond ONLY with:\nSEARCH: <query>\nNothing else. Examples:\nUser says 'show me NEET 2026' → SEARCH: NEET 2026\nUser says 'upcoming JEE deadlines' → SEARCH: JEE Mains",
                  },
                ],
              },
            },
          };
          ws.send(JSON.stringify(setupMsg));
          setStatus('listening');
          startAudioStreaming(stream);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check for content/text from the model
            if (data.serverContent?.modelTurn?.parts) {
              for (const part of data.serverContent.modelTurn.parts) {
                if (part.text) {
                  const text = part.text.trim();
                  console.log('Gemini Live response text:', text);

                  // Extract SEARCH: <query>
                  const match = text.match(/SEARCH:\s*(.+)/i);
                  if (match) {
                    const query = match[1].trim();
                    if (query) {
                      setStatus('searching');
                      setSearchQuery(query);
                      
                      // Auto-close and search after a brief visual confirmation delay
                      setTimeout(() => {
                        onSearch(query);
                        onClose();
                      }, 1200);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onerror = (e) => {
          console.error('WebSocket Error:', e);
          if (active) {
            setStatus('error');
            setErrorMessage('Connection failed. Please check your internet connection.');
          }
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
        };

      } catch (err) {
        if (active) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Mic not available, use search bar.');
        }
      }
    }

    startVoiceSession();

    return () => {
      active = false;
      cleanup();
    };
  }, [onSearch, onClose]);

  // Audio capture and PCM streaming
  const startAudioStreaming = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but widely supported and highly reliable for basic PCM streaming
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0); // Float32Array
        
        // Convert to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert Int16 buffer to Base64
        const buffer = pcm16.buffer;
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        // Send PCM data chunk
        const mediaMsg = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'audio/pcm',
                data: base64Data,
              },
            ],
          },
        };
        wsRef.current.send(JSON.stringify(mediaMsg));
      };
    } catch (err) {
      console.error('Audio capture error:', err);
      setStatus('error');
      setErrorMessage('Failed to configure audio capture devices.');
    }
  };

  // Cleanup helper
  const cleanup = () => {
    // 1. Close socket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // 2. Stop audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    // 3. Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    // 4. Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300">
      {/* Container */}
      <div className="relative w-full max-w-md p-8 bg-[#0a0a0a] rounded-3xl border border-[#2a2a2a] text-center shadow-2xl flex flex-col items-center">
        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#161616] p-2.5 rounded-full border border-[#2a2a2a] hover:border-red-500/20 hover:text-red-400 transition-all duration-200 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Title */}
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Voice Search</h3>

        {/* Visualizer Waveform Block */}
        <div className="h-60 flex items-center justify-center relative w-full mb-6">
          {status === 'connecting' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
              <span className="text-gray-400 text-sm">Initializing Live Link...</span>
            </div>
          )}

          {status === 'listening' && (
            <div className="relative flex items-center justify-center w-40 h-40">
              {/* Concentric pulsing rings */}
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-wave-slow border border-blue-500/20" />
              <div className="absolute inset-4 rounded-full bg-blue-500/20 animate-wave-medium border border-blue-500/35" />
              <div className="absolute inset-8 rounded-full bg-blue-500/30 animate-wave-fast border border-blue-500/50" />
              {/* Center Icon */}
              <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-7 h-7 animate-pulse"
                >
                  <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                  <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 0 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.75 6.75 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                </svg>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
              <span className="text-gray-400 text-sm">Thinking...</span>
            </div>
          )}

          {status === 'searching' && (
            <div className="flex flex-col items-center gap-3 text-emerald-400 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold">Intent Extracted!</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 text-red-400 px-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <span className="text-sm text-center leading-relaxed">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Status Text / Transcript Display */}
        <div className="h-16 flex items-center justify-center px-4 w-full">
          {status === 'connecting' && <p className="text-gray-400 text-sm">Connecting to Gemini Live...</p>}
          {status === 'listening' && (
            <p className="text-gray-300 text-sm font-medium tracking-wide">
              Say something like: <br />
              <span className="text-blue-400 italic">"Show me NEET 2026 timeline"</span>
            </p>
          )}
          {status === 'processing' && <p className="text-gray-400 text-sm">Parsing voice intent...</p>}
          {status === 'searching' && (
            <p className="text-gray-300 text-sm">
              Searching for: <span className="font-semibold text-white">"{searchQuery}"</span>
            </p>
          )}
          {status === 'error' && <p className="text-gray-400 text-xs">Please use the regular search bar fallback.</p>}
        </div>
      </div>
    </div>
  );
}
