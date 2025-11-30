'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, User, Bot, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { config } from '@/lib/config';

interface Message {
  speaker: 'bot' | 'customer';
  text: string;
  timestamp: Date;
  turn: number;
  iteration: number;
}

interface Persona {
  name: string;
  persona_type: string;
  communication_style: string;
  age: number;
  occupation: string;
}

interface IterationMetrics {
  iteration: number;
  score: number;
  negotiation: number;
  relevance: number;
}

export default function ConversationsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [selectedPersonaType, setSelectedPersonaType] = useState('aggressive_denier');
  const [selectedBotVoice, setSelectedBotVoice] = useState(config.elevenLabsVoices[0].id);
  const [selectedPersonaVoice, setSelectedPersonaVoice] = useState(config.elevenLabsVoices[4].id);
  const [status, setStatus] = useState('');
  const [currentIteration, setCurrentIteration] = useState(1);
  const [iterations, setIterations] = useState<IterationMetrics[]>([]);
  const [improvedScripts, setImprovedScripts] = useState<Map<number, string>>(new Map());
  const [viewingScript, setViewingScript] = useState<{ iteration: number; script: string } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingAudioRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const playTextWithElevenLabs = async (text: string, speaker: 'bot' | 'customer') => {
    try {
      const voiceId = speaker === 'bot' ? selectedBotVoice : selectedPersonaVoice;

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId,
        }),
      });

      if (!response.ok) {
        console.error('TTS API error:', await response.text());
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Add to queue
      audioQueueRef.current.push(audio);

      // Play if not already playing
      if (!isPlayingAudioRef.current) {
        playNextInQueue();
      }
    } catch (error) {
      console.error('Error playing text:', error);
    }
  };

  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      return;
    }

    isPlayingAudioRef.current = true;
    const audio = audioQueueRef.current.shift()!;

    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      playNextInQueue();
    };

    audio.onerror = (error) => {
      console.error('Audio playback error:', error);
      URL.revokeObjectURL(audio.src);
      playNextInQueue();
    };

    audio.play().catch((error) => {
      console.error('Error playing audio:', error);
      playNextInQueue();
    });
  };

  const startConversation = () => {
    setMessages([]);
    setCurrentPersona(null);
    setIterations([]);
    setCurrentIteration(1);
    setStatus('Connecting...');
    setIsPlaying(true);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/live-conversation?personaType=${selectedPersonaType}`
    );

    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'init':
          case 'status':
            setStatus(data.message);
            break;

          case 'persona':
            setCurrentPersona(data.data);
            setStatus(`Testing with ${data.data.name}`);
            break;

          case 'iteration_start':
            setCurrentIteration(data.iteration);
            setStatus(data.message);
            break;

          case 'message':
            const newMessage: Message = {
              speaker: data.speaker,
              text: data.message,
              timestamp: new Date(),
              turn: data.turn,
              iteration: data.iteration || 1,
            };
            setMessages((prev) => [...prev, newMessage]);

            // Use ElevenLabs for speech
            playTextWithElevenLabs(data.message, data.speaker);
            break;

          case 'iteration_complete':
            setIterations((prev) => [
              ...prev,
              {
                iteration: data.iteration,
                score: data.score,
                negotiation: data.metrics.negotiation,
                relevance: data.metrics.relevance,
              },
            ]);
            setStatus(data.message);
            break;

          case 'script_improved':
            setStatus(data.message);
            if (data.improvedScript) {
              setImprovedScripts(prev => new Map(prev).set(data.iteration || currentIteration, data.improvedScript));
            }
            break;

          case 'success':
            setStatus(data.message);
            setIsPlaying(false);
            // Save sessionId to localStorage
            if (data.sessionId) {
              localStorage.setItem('latest_session_id', data.sessionId);
            }
            eventSource.close();
            break;

          case 'max_iterations':
            setStatus(data.message);
            setIsPlaying(false);
            // Save sessionId to localStorage
            if (data.sessionId) {
              localStorage.setItem('latest_session_id', data.sessionId);
            }
            eventSource.close();
            break;

          case 'complete':
            setStatus('Voice testing cycle complete');
            setIsPlaying(false);
            eventSource.close();
            break;

          case 'error':
            setStatus(`Error: ${data.message}`);
            setIsPlaying(false);
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setStatus('Connection error');
      setIsPlaying(false);
      eventSource.close();
    };
  };

  const stopConversation = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsPlaying(false);
    setStatus('Conversation stopped by user');

    // Clear audio queue and stop playback
    audioQueueRef.current.forEach(audio => {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    });
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
  };

  const resetConversation = () => {
    stopConversation();
    setMessages([]);
    setCurrentPersona(null);
    setStatus('');
  };

  const personaTypes = [
    { value: 'aggressive_denier', label: 'Aggressive Denier' },
    { value: 'cooperative_but_broke', label: 'Cooperative but Broke' },
    { value: 'evasive_avoider', label: 'Evasive Avoider' },
    { value: 'emotional_pleader', label: 'Emotional Pleader' },
    { value: 'hostile_threatener', label: 'Hostile Threatener' },
    { value: 'confused_elderly', label: 'Confused Elderly' },
    { value: 'busy_professional', label: 'Busy Professional' },
    { value: 'payment_plan_seeker', label: 'Payment Plan Seeker' },
  ];

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Voice Testing {isPlaying && `- Iteration ${currentIteration}`}
                </h1>
                {currentPersona ? (
                  <p className="text-zinc-400">
                    Persona: <span className="font-semibold text-white">{currentPersona.name}</span> (
                    {currentPersona.persona_type})
                  </p>
                ) : (
                  <p className="text-zinc-500">Select a persona type and start</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={resetConversation}
                  disabled={isPlaying}
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                {!isPlaying ? (
                  <Button
                    onClick={startConversation}
                    className="bg-white text-black hover:bg-zinc-200"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Conversation
                  </Button>
                ) : (
                  <Button
                    onClick={stopConversation}
                    variant="outline"
                    className="border-zinc-700 text-white hover:bg-zinc-800"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>

            {/* Persona Type Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Persona Type</label>
                <select
                  value={selectedPersonaType}
                  onChange={(e) => setSelectedPersonaType(e.target.value)}
                  disabled={isPlaying}
                  className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {personaTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Bot Voice</label>
                <select
                  value={selectedBotVoice}
                  onChange={(e) => setSelectedBotVoice(e.target.value)}
                  disabled={isPlaying}
                  className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {config.elevenLabsVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Persona Voice</label>
                <select
                  value={selectedPersonaVoice}
                  onChange={(e) => setSelectedPersonaVoice(e.target.value)}
                  disabled={isPlaying}
                  className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {config.elevenLabsVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            {status && (
              <div className="mt-4 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                <p className="text-zinc-300 text-sm">{status}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Feed */}
        <Card className="bg-zinc-900 border-zinc-800 min-h-[500px] max-h-[600px]">
          <CardContent className="p-6 overflow-y-auto max-h-[600px]">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Volume2 className="w-16 h-16 text-white mx-auto mb-4" />
                  <p className="text-zinc-300 text-lg">
                    Click "Start Conversation" to begin live voice simulation
                  </p>
                  <p className="text-zinc-500 text-sm mt-2">
                    🔊 Make sure your speakers are on to hear the conversation
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, idx) => {
                    const showIterationBanner = idx === 0 || messages[idx - 1]?.iteration !== message.iteration;

                    return (
                      <div key={idx}>
                        {showIterationBanner && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full">
                              <p className="text-white text-sm font-semibold">
                                Iteration {message.iteration}
                              </p>
                            </div>
                          </div>
                        )}

                        <div
                          className={`flex gap-4 animate-fade-in ${
                            message.speaker === 'bot' ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          {message.speaker === 'bot' && (
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-6 h-6 text-black" />
                            </div>
                          )}

                          <div
                            className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                              message.speaker === 'bot'
                                ? 'bg-zinc-800 border border-zinc-700'
                                : 'bg-white text-black border border-zinc-200'
                            }`}
                          >
                            <p className={message.speaker === 'bot' ? 'text-white' : 'text-black'}>
                              {message.text}
                            </p>
                            <p className={`text-xs mt-1 ${message.speaker === 'bot' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                              Turn {message.turn} • {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>

                          {message.speaker === 'customer' && (
                            <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Iteration Results */}
        {iterations.length > 0 && (
          <Card className="mt-6 bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Iteration Results</h3>
              <div className="space-y-3">
                {iterations.map((iter) => (
                  <div
                    key={iter.iteration}
                    className="bg-black p-4 rounded-lg border border-zinc-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">
                        Iteration {iter.iteration}
                      </span>
                      <div className="flex items-center gap-3">
                        {improvedScripts.has(iter.iteration) && (
                          <Button
                            onClick={() => setViewingScript({
                              iteration: iter.iteration,
                              script: improvedScripts.get(iter.iteration)!
                            })}
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-white hover:bg-zinc-800 text-xs"
                          >
                            View Script
                          </Button>
                        )}
                        <span className="text-2xl font-bold text-white">
                          {iter.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-zinc-500">Negotiation</p>
                        <p className="text-white font-semibold">{iter.negotiation.toFixed(1)}/100</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Relevance</p>
                        <p className="text-white font-semibold">{iter.relevance.toFixed(1)}/100</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="mt-6 bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-2">How it works</h3>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li>• Iterative testing with automatic script improvement</li>
              <li>• Real-time conversation generation using Gemini AI</li>
              <li>• High-quality voice synthesis powered by ElevenLabs</li>
              <li>• Customizable voices for both bot and persona</li>
              <li>• Metric analysis after each iteration</li>
              <li>• Self-correction until 85+ score or 5 iterations</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Script Viewing Modal */}
      {viewingScript && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Improved Script - Iteration {viewingScript.iteration}
                </h2>
                <p className="text-sm text-zinc-500">
                  This script will be used for the next iteration
                </p>
              </div>
              <Button
                onClick={() => setViewingScript(null)}
                variant="outline"
                size="sm"
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                Close
              </Button>
            </div>

            {/* Script Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-black p-6 rounded-lg border border-zinc-800">
                <pre className="text-white text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {viewingScript.script}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
