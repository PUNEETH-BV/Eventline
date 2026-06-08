'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TimelineEvent } from '@/types';

interface VoiceSearchModalProps {
  onClose: () => void;
  onSearch: (query: string, events: TimelineEvent[]) => void;
  currentEvents: TimelineEvent[];
}

type ModalStatus = 'connecting' | 'listening' | 'processing' | 'error' | 'speaking';

interface LogMessage {
  role: 'assistant' | 'system';
  text: string;
}

export default function VoiceSearchModal({ onClose, onSearch, currentEvents }: VoiceSearchModalProps) {
  const [status, setStatus] = useState<ModalStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [transcript, setTranscript] = useState<LogMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isModelRespondingRef = useRef<boolean>(false);
  const lastSpokenTimeRef = useRef<number>(Date.now());
  const hasSpokenRef = useRef<boolean>(false);
  const isAudioPausedRef = useRef<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceIntervalRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Speak response back using browser native Text-To-Speech (SpeechSynthesis)
  const speakResponse = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      isAudioPausedRef.current = false;
      lastSpokenTimeRef.current = Date.now();
      hasSpokenRef.current = false;
      setStatus('listening');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      setStatus('speaking');

      // Remove markdown, symbols or code formatting for cleaner speech synthesis
      const cleanText = text
        .replace(/[*#_`~-]/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;

      utterance.onend = () => {
        isAudioPausedRef.current = false;
        lastSpokenTimeRef.current = Date.now();
        hasSpokenRef.current = false;
        setStatus('listening');
      };

      utterance.onerror = () => {
        isAudioPausedRef.current = false;
        lastSpokenTimeRef.current = Date.now();
        hasSpokenRef.current = false;
        setStatus('listening');
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('TTS speaking error:', err);
      isAudioPausedRef.current = false;
      lastSpokenTimeRef.current = Date.now();
      hasSpokenRef.current = false;
      setStatus('listening');
    }
  };

  // Initialize voice connection
  useEffect(() => {
    let active = true;

    async function startVoiceSession() {
      try {
        // 1. Get user mic permission
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
          const errData = await configRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load server voice configuration.');
        }
        const { apiKey } = await configRes.json();

        if (!active) return;

        // 3. Connect to the CORRECTED Gemini Live WebSocket endpoint
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) {
            ws.close();
            return;
          }
          
          // Formulate current results context
          let currentResultsContext = "No search results are currently loaded on screen.";
          if (currentEvents && currentEvents.length > 0) {
            currentResultsContext = `Here are the currently loaded search results on screen for reference:\n${JSON.stringify(
              currentEvents.map(e => ({ title: e.title, date: e.date, description: e.description, status: e.status }))
            )}`;
          }

          // Send setup message with the search_events tool and system instruction
          const setupMsg = {
            setup: {
              model: 'models/gemini-3.5-flash',
              generationConfig: {
                responseModalities: ['TEXT'],
              },
              systemInstruction: {
                parts: [
                  {
                    text: `You are EventLine's voice assistant. You help users find and explore event timelines.
You have access to a tool 'search_events' which you can use to search for event timelines when the user asks or when you need information.
When the user speaks, you should:
1. If they want to search for a timeline (e.g. "show me NEET 2026", "upcoming JEE deadlines"), you MUST call 'search_events' with the query.
2. If they ask a question about the current timeline results, you should answer their question based ONLY on the details provided in the context or returned by the 'search_events' tool.
3. You must restrict your context and answers strictly to the event search results. Do not assume or hallucinate any dates. If the information is not in the search results, politely say you don't have that detail.
4. Keep your responses short, concise, and helpful.

${currentResultsContext}`,
                  },
                ],
              },
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: 'search_events',
                      description: 'Search for event timelines and dates by query.',
                      parameters: {
                        type: 'OBJECT',
                        properties: {
                          query: {
                            type: 'STRING',
                            description: 'The search query (e.g., "NEET 2026", "JEE Main").',
                          },
                        },
                        required: ['query'],
                      },
                    },
                  ],
                },
              ],
            },
          };

          ws.send(JSON.stringify(setupMsg));
          setStatus('listening');
          setTranscript([{ role: 'assistant', text: 'Hello! I am your EventLine voice assistant. You can speak to search or discuss current results.' }]);
          
          // Initialize silence tracking variables
          lastSpokenTimeRef.current = Date.now();
          hasSpokenRef.current = false;
          isAudioPausedRef.current = false;

          // Start client-side silence checking interval (detects 5 second silence gap)
          silenceIntervalRef.current = setInterval(() => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            if (isAudioPausedRef.current) return;
            if (!hasSpokenRef.current) return;

            const now = Date.now();
            const silenceDuration = now - lastSpokenTimeRef.current;

            if (silenceDuration > 5000) {
              console.log("5 seconds silence detected, requesting model analysis...");
              hasSpokenRef.current = false;
              isAudioPausedRef.current = true;
              setStatus('processing');

              const turnCompleteMsg = {
                clientContent: {
                  turnComplete: true
                }
              };
              wsRef.current.send(JSON.stringify(turnCompleteMsg));
            }
          }, 200);

          startAudioStreaming(stream);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // 1. Check for standard text response from the model
            if (data.serverContent?.modelTurn?.parts) {
              let chunkText = '';
              for (const part of data.serverContent.modelTurn.parts) {
                if (part.text) {
                  chunkText += part.text;
                }
              }

              if (chunkText) {
                setTranscript(prev => {
                  if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && isModelRespondingRef.current) {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      text: updated[updated.length - 1].text + chunkText,
                    };
                    return updated;
                  } else {
                    isModelRespondingRef.current = true;
                    return [...prev, { role: 'assistant', text: chunkText }];
                  }
                });
              }
            }

            if (data.serverContent?.modelTurn?.turnComplete) {
              isModelRespondingRef.current = false;
              
              // Find the last assistant message and read it aloud
              setTranscript(prev => {
                const assistantMessages = prev.filter(m => m.role === 'assistant');
                if (assistantMessages.length > 0) {
                  const lastText = assistantMessages[assistantMessages.length - 1].text;
                  setTimeout(() => {
                    speakResponse(lastText);
                  }, 50);
                }
                return prev;
              });
            }

            if (data.serverContent?.interrupted) {
              isModelRespondingRef.current = false;
              setTranscript(prev => [...prev, { role: 'system', text: 'Interrupted' }]);
            }

            // 2. Check for toolCall from the model
            if (data.toolCall?.functionCalls) {
              for (const call of data.toolCall.functionCalls) {
                if (call.name === 'search_events') {
                  const q = call.args.query;
                  
                  // Update transcript with a system message
                  setTranscript(prev => [...prev, { role: 'system', text: `Searching for: "${q}"...` }]);
                  setStatus('processing');
                  
                  try {
                    // Fetch search results on the client side
                    const searchRes = await fetch('/api/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: q }),
                    });
                    
                    if (searchRes.ok) {
                      const searchData = await searchRes.json();
                      const eventsFound = searchData.events || [];
                      
                      // Update main page timeline in the background
                      onSearch(q, eventsFound);
                      
                      // Notify transcript
                      setTranscript(prev => [
                        ...prev, 
                        { role: 'system', text: `Found ${eventsFound.length} events for "${q}".` }
                      ]);

                      // Send response back to the WebSocket
                      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        const responseMsg = {
                          toolResponse: {
                            functionResponses: [
                              {
                                name: 'search_events',
                                id: call.id,
                                response: {
                                  output: {
                                    events: eventsFound.map((e: any) => ({
                                      title: e.title,
                                      date: e.date,
                                      description: e.description,
                                      status: e.status,
                                      category: e.category,
                                    })),
                                  },
                                },
                              },
                            ],
                          },
                        };
                        wsRef.current.send(JSON.stringify(responseMsg));
                      }
                    } else {
                      throw new Error('Search failed');
                    }
                  } catch (err) {
                    console.error('Tool call search error:', err);
                    setTranscript(prev => [...prev, { role: 'system', text: `Failed to fetch events for "${q}".` }]);
                    
                    // Send error back to tool call
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      const errorMsg = {
                        toolResponse: {
                          functionResponses: [
                            {
                              name: 'search_events',
                              id: call.id,
                              response: {
                                output: { error: 'Failed to search for events.' },
                              },
                            },
                          ],
                        },
                      };
                      wsRef.current.send(JSON.stringify(errorMsg));
                    }
                  } finally {
                    setStatus('listening');
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
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (isAudioPausedRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0); // Float32Array
        
        // Calculate RMS volume to detect speaking
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        if (rms > 0.01) {
          lastSpokenTimeRef.current = Date.now();
          hasSpokenRef.current = true;
        }

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

        // Send PCM data chunk with rate parameter
        const mediaMsg = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'audio/pcm;rate=16000',
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
    isModelRespondingRef.current = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300">
      {/* Container */}
      <div className="relative w-full max-w-md p-6 bg-[#0a0a0a] rounded-3xl border border-[#2a2a2a] text-center shadow-2xl flex flex-col items-center h-[80vh] max-h-[600px]">
        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#161616] p-2 rounded-full border border-[#2a2a2a] hover:border-red-500/20 hover:text-red-400 transition-all duration-200 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Title */}
        <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Voice Search</h3>

        {/* Live Conversation Transcript */}
        <div 
          ref={scrollRef}
          className="flex-1 w-full overflow-y-auto mb-4 p-4 rounded-2xl bg-[#111] border border-[#1f1f1f] text-left space-y-3 scrollbar-none"
        >
          {transcript.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
              {msg.role === 'system' ? (
                <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  {msg.text}
                </span>
              ) : (
                <div className="bg-[#1a1a1a] text-gray-200 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm leading-relaxed border border-[#262626]">
                  {msg.text}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Visualizer Waveform Block */}
        <div className="h-28 flex items-center justify-center relative w-full mb-2">
          {status === 'connecting' && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-3 border-blue-500/30 border-t-blue-500 animate-spin" />
              <span className="text-gray-400 text-xs">Connecting...</span>
            </div>
          )}

          {status === 'listening' && (
            <div className="relative flex items-center justify-center w-24 h-24">
              {/* Concentric pulsing rings */}
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-wave-slow border border-blue-500/20" />
              <div className="absolute inset-2 rounded-full bg-blue-500/20 animate-wave-medium border border-blue-500/35" />
              <div className="absolute inset-4 rounded-full bg-blue-500/30 animate-wave-fast border border-blue-500/50" />
              {/* Center Icon */}
              <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 animate-pulse"
                >
                  <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                  <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 0 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.75 6.75 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                </svg>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-3 border-purple-500/30 border-t-purple-500 animate-spin" />
              <span className="text-gray-400 text-xs">Searching database...</span>
            </div>
          )}

          {status === 'speaking' && (
            <div className="relative flex items-center justify-center w-24 h-24">
              {/* Concentric pulsing rings for speaking (purple/blue) */}
              <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-wave-slow border border-purple-500/20" />
              <div className="absolute inset-2 rounded-full bg-purple-500/20 animate-wave-medium border border-purple-500/35" />
              <div className="absolute inset-4 rounded-full bg-purple-500/30 animate-wave-fast border border-purple-500/50" />
              {/* Center Icon */}
              <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 animate-pulse"
                >
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 0 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                </svg>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-2 text-red-400 px-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <span className="text-xs text-center leading-relaxed font-semibold">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer info text */}
        <div className="h-6 flex items-center justify-center">
          {status === 'listening' && (
            <p className="text-gray-500 text-[11px]">
              Speak naturally to search timelines or explore facts.
            </p>
          )}
          {status === 'speaking' && (
            <p className="text-gray-500 text-[11px]">
              Speaking response aloud. Speak when microphone returns...
            </p>
          )}
          {status === 'error' && (
            <p className="text-gray-500 text-[11px]">
              Please close modal and use the search bar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
