'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, StopCircle, Sparkles, Plus, TrendingUp, Zap, Target } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  const [numPersonas, setNumPersonas] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [personas, setPersonas] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [viewingChat, setViewingChat] = useState<any>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [selectedIterationForChats, setSelectedIterationForChats] = useState(1);
  const [iterationConversations, setIterationConversations] = useState<any[]>([]);

  // Load previous sessions on mount
  useEffect(() => {
    loadPreviousSessions();
  }, []);

  const loadPreviousSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setPreviousSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`);
      const data = await response.json();
      setResults({
        iterations: data.iterations.map((iter: any) => ({
          iteration: iter.iteration,
          average_score: iter.average_score,
          num_tests: iter.test_results.length,
        })),
        final_score: data.finalScore,
        improvement: data.improvement,
        threshold_reached: data.thresholdReached,
        total_iterations: data.iterations.length,
      });
      setSelectedSessionId(sessionId);
      
      // Load conversations for first iteration
      if (data.iterations.length > 0) {
        setSelectedIterationForChats(1);
        loadIterationConversations(sessionId, 1);
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    }
  };

  const loadIterationConversations = async (sessionId: string, iteration: number) => {
    try {
      const response = await fetch(`/api/conversations?sessionId=${sessionId}&iteration=${iteration}`);
      const data = await response.json();
      setIterationConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setIterationConversations([]);
    }
  };

  const viewConversation = (conversation: any) => {
    setViewingChat(conversation);
  };

  const generatePersonas = async () => {
    setIsGenerating(true);
    setPersonas([]);

    try {
      const response = await fetch('/api/generate-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: numPersonas })
      });

      const data = await response.json();
      setPersonas(data.personas);
    } catch (error) {
      console.error('Error generating personas:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startTesting = async () => {
    if (personas.length === 0) {
      alert('Please generate personas first!');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setCurrentStatus('Starting testing...');
    setResults(null);

    try {
      const eventSource = new EventSource(`/api/stream-conversation?numPersonas=${personas.length}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'init':
              setCurrentStatus('Initializing testing platform...');
              setProgress(5);
              break;

            case 'iteration':
              setCurrentStatus(`Iteration ${data.iteration} - Testing personas...`);
              setProgress(10 + (data.iteration - 1) * 18);
              break;

            case 'test':
              setCurrentStatus(`Testing ${data.data?.persona?.name || 'persona'} (${data.test}/${data.totalTests})`);
              const baseProgress = 10 + ((data.iteration || 1) - 1) * 18;
              const testProgress = (data.test / data.totalTests) * 15;
              setProgress(Math.min(baseProgress + testProgress, 95));
              break;

            case 'test_analysis':
              setCurrentStatus(`Analyzing conversation - Score: ${data.data?.analysis?.overall_score?.toFixed(1) || '...'}/100`);
              break;

            case 'self_correction':
              setCurrentStatus('Self-correcting bot script...');
              break;

            case 'complete':
              setCurrentStatus('Testing complete!');
              setProgress(100);
              setResults(data.data.finalReport);
              setIsRunning(false);
              eventSource.close();
              
              // Save sessionId to localStorage for analytics page
              if (data.data.finalReport.sessionId) {
                localStorage.setItem('latest_session_id', data.data.finalReport.sessionId);
              }
              
              // Reload sessions list and select the new session
              loadPreviousSessions();
              if (data.data.finalReport.sessionId) {
                setSelectedSessionId(data.data.finalReport.sessionId);
              }
              break;

            case 'error':
              setCurrentStatus(`Error: ${data.message}`);
              setIsRunning(false);
              eventSource.close();
              break;
          }
        } catch (error) {
          console.error('Error parsing event:', error);
        }
      };

      eventSource.onerror = () => {
        setCurrentStatus('Connection error');
        setIsRunning(false);
        eventSource.close();
      };

    } catch (error) {
      console.error('Error starting test:', error);
      setIsRunning(false);
    }
  };

  const stopTesting = () => {
    setIsRunning(false);
    setCurrentStatus('Stopped by user');
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative container mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AI Voice Agent Testing</h1>
              <p className="text-sm text-zinc-500">Automated Testing & Self-Correction Platform</p>
            </div>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-5xl font-bold text-white mb-4 leading-tight">
              Test & Perfect Your Debt Collection Bot
            </h2>
            <p className="text-xl text-zinc-400">
              Generate realistic personas → Simulate conversations → Analyze metrics → Self-correct → Achieve 85+ score
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-2xl">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-white" />
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Max Iterations</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-white" />
                  <p className="text-2xl font-bold text-white">85+</p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Target Score</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <p className="text-2xl font-bold text-white">Auto</p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Self-Correct</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16">
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="setup" className="data-[state=active]:bg-white data-[state=active]:text-black">Setup</TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:text-black">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6 mt-6">
            {/* Step 1: Generate Personas */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">1</span>
                  </div>
                  <div>
                    <CardTitle className="text-white">Generate Test Personas</CardTitle>
                    <CardDescription className="text-zinc-500">Create diverse loan defaulter profiles for comprehensive testing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium text-zinc-300">Number of Personas</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={numPersonas}
                      onChange={(e) => setNumPersonas(parseInt(e.target.value) || 1)}
                      disabled={isGenerating || isRunning}
                      className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
                    />
                    <p className="text-xs text-zinc-600">Recommended: 3-5 personas</p>
                  </div>
                  <Button
                    onClick={generatePersonas}
                    disabled={isGenerating || isRunning}
                    className="bg-white text-black hover:bg-zinc-200 whitespace-nowrap px-2 h-[42px] mb-6"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Personas
                      </>
                    )}
                  </Button>
                </div>

                {/* Generated Personas */}
                {personas.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {personas.map((persona, idx) => (
                      <Card key={idx} className="bg-black border-zinc-800">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-white text-sm">{persona.name}</h4>
                            <Badge variant="secondary" className="text-xs bg-zinc-800 text-white border-zinc-700">
                              {persona.persona_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 mb-1">{persona.occupation}, {persona.age}y</p>
                          <p className="text-xs text-zinc-600">{persona.communication_style}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Run Testing */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">2</span>
                  </div>
                  <div>
                    <CardTitle className="text-white">Run Automated Testing</CardTitle>
                    <CardDescription className="text-zinc-500">AI-powered testing cycle with automatic improvements</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-black rounded-lg border border-zinc-800">
                  <div className="text-center">
                    <p className="text-xs text-zinc-600">Simulate</p>
                    <p className="text-sm font-semibold text-white">Conversations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-600">Analyze</p>
                    <p className="text-sm font-semibold text-white">Metrics</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-600">Self-Correct</p>
                    <p className="text-sm font-semibold text-white">Script</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-600">Repeat Until</p>
                    <p className="text-sm font-semibold text-white">85/100</p>
                  </div>
                </div>

                {!isRunning ? (
                  <Button
                    onClick={startTesting}
                    disabled={personas.length === 0}
                    size="lg"
                    className="w-full bg-white text-black hover:bg-zinc-200 h-12"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Start Testing Cycle
                  </Button>
                ) : (
                  <Button
                    onClick={stopTesting}
                    size="lg"
                    variant="outline"
                    className="w-full h-12 border-zinc-700 text-white hover:bg-zinc-900"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Stop Testing
                  </Button>
                )}

                {/* Progress */}
                {isRunning && (
                  <div className="space-y-2 p-4 bg-black rounded-lg border border-zinc-800">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300">{currentStatus}</span>
                      <span className="text-zinc-500">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-zinc-800 [&>div]:bg-white" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            {/* Previous Sessions List */}
            <Card className="bg-zinc-900 border-zinc-800 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Previous Test Runs</CardTitle>
                <CardDescription className="text-zinc-500">
                  Click any session to view its results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="text-center py-8 text-zinc-500">Loading sessions...</div>
                ) : previousSessions.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    No previous sessions. Run a test to get started!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {previousSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => loadSessionDetails(session.id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          selectedSessionId === session.id
                            ? 'bg-white border-white'
                            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  selectedSessionId === session.id
                                    ? 'bg-black text-white'
                                    : 'bg-zinc-700 text-white'
                                }`}
                              >
                                {session.sessionType}
                              </Badge>
                              <span
                                className={`text-sm ${
                                  selectedSessionId === session.id ? 'text-zinc-600' : 'text-zinc-500'
                                }`}
                              >
                                {new Date(session.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <p
                                  className={`text-xs ${
                                    selectedSessionId === session.id ? 'text-zinc-600' : 'text-zinc-500'
                                  }`}
                                >
                                  Personas
                                </p>
                                <p
                                  className={`text-lg font-semibold ${
                                    selectedSessionId === session.id ? 'text-black' : 'text-white'
                                  }`}
                                >
                                  {session.numPersonas}
                                </p>
                              </div>
                              <div>
                                <p
                                  className={`text-xs ${
                                    selectedSessionId === session.id ? 'text-zinc-600' : 'text-zinc-500'
                                  }`}
                                >
                                  Iterations
                                </p>
                                <p
                                  className={`text-lg font-semibold ${
                                    selectedSessionId === session.id ? 'text-black' : 'text-white'
                                  }`}
                                >
                                  {session.totalIterations}
                                </p>
                              </div>
                              <div>
                                <p
                                  className={`text-xs ${
                                    selectedSessionId === session.id ? 'text-zinc-600' : 'text-zinc-500'
                                  }`}
                                >
                                  Final Score
                                </p>
                                <p
                                  className={`text-lg font-semibold ${
                                    selectedSessionId === session.id ? 'text-black' : 'text-white'
                                  }`}
                                >
                                  {session.finalScore?.toFixed(1) || '--'}
                                </p>
                              </div>
                              <div>
                                <p
                                  className={`text-xs ${
                                    selectedSessionId === session.id ? 'text-zinc-600' : 'text-zinc-500'
                                  }`}
                                >
                                  Improvement
                                </p>
                                <p
                                  className={`text-lg font-semibold ${
                                    selectedSessionId === session.id ? 'text-black' : 'text-white'
                                  }`}
                                >
                                  +{session.improvement?.toFixed(1) || '--'}
                                </p>
                              </div>
                            </div>
                          </div>
                          {session.thresholdReached && (
                            <div className="ml-4">
                              <Badge className="bg-green-500 text-white">✓ Success</Badge>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Session Details */}
            {results ? (
              <div className="space-y-6">
                {/* Score Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <CardDescription className="text-zinc-500">Initial Score</CardDescription>
                      <CardTitle className="text-4xl text-white">
                        {results.iterations[0]?.average_score.toFixed(1)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-white border-zinc-200">
                    <CardHeader>
                      <CardDescription className="text-zinc-600">Final Score</CardDescription>
                      <CardTitle className="text-4xl text-black">
                        {results.final_score.toFixed(1)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <CardDescription className="text-zinc-500">Improvement</CardDescription>
                      <CardTitle className="text-4xl text-white">
                        +{results.improvement.toFixed(1)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Iterations */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white">Iteration Progress</CardTitle>
                    <CardDescription className="text-zinc-500">Performance improvement across {results.total_iterations} iterations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.iterations.map((iter: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white font-medium">Iteration {iter.iteration}</span>
                          <span className="text-zinc-500">{iter.average_score.toFixed(1)}/100</span>
                        </div>
                        <Progress
                          value={iter.average_score}
                          className="h-2 bg-zinc-800 [&>div]:bg-white"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Conversations */}
                {selectedSessionId && iterationConversations.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">Conversations</CardTitle>
                          <CardDescription className="text-zinc-500">
                            View detailed chat transcripts for each persona
                          </CardDescription>
                        </div>
                        {results && results.iterations.length > 1 && (
                          <select
                            value={selectedIterationForChats}
                            onChange={(e) => {
                              const iter = parseInt(e.target.value);
                              setSelectedIterationForChats(iter);
                              loadIterationConversations(selectedSessionId, iter);
                            }}
                            className="px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
                          >
                            {results.iterations.map((iter: any) => (
                              <option key={iter.iteration} value={iter.iteration}>
                                Iteration {iter.iteration}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {iterationConversations.map((conv, idx) => (
                        <div
                          key={idx}
                          className="bg-black rounded-lg p-4 border border-zinc-800 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <h4 className="text-white font-semibold mb-1">{conv.persona.name}</h4>
                            <p className="text-xs text-zinc-500 mb-2">
                              {conv.persona.personaType.replace(/_/g, ' ')} • {conv.persona.age}y • {conv.persona.occupation}
                            </p>
                            <div className="flex gap-4 text-xs">
                              <span className="text-zinc-400">
                                Overall: <span className="text-white font-semibold">{conv.metrics.overallScore.toFixed(1)}</span>
                              </span>
                              <span className="text-zinc-400">
                                Negotiation: <span className="text-white font-semibold">{conv.metrics.negotiationScore.toFixed(1)}</span>
                              </span>
                              <span className="text-zinc-400">
                                Relevance: <span className="text-white font-semibold">{conv.metrics.relevanceScore.toFixed(1)}</span>
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() => viewConversation(conv)}
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-white hover:bg-zinc-800"
                          >
                            View Chat
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Success Message */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6">
                    <p className="font-semibold text-white">
                      {results.threshold_reached ? '✓ Success! Bot is ready for deployment' : '○ More iterations needed'}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {results.threshold_reached
                        ? `Bot achieved ${results.final_score.toFixed(1)}/100 and can handle diverse scenarios`
                        : `Continue testing to reach threshold of 85/100`
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <p className="text-zinc-500">No results yet. Run a testing cycle to see results.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Conversation Modal */}
      {viewingChat && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Conversation with {viewingChat.persona.name}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {viewingChat.persona.personaType.replace(/_/g, ' ')} • {viewingChat.persona.age}y • {viewingChat.persona.occupation}
                  </p>
                </div>
                <Button
                  onClick={() => setViewingChat(null)}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Close
                </Button>
              </div>
              
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black p-3 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-1">Overall Score</p>
                  <p className="text-2xl font-bold text-white">
                    {viewingChat.metrics.overallScore.toFixed(1)}
                  </p>
                </div>
                <div className="bg-black p-3 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-1">Negotiation</p>
                  <p className="text-2xl font-bold text-white">
                    {viewingChat.metrics.negotiationScore.toFixed(1)}
                  </p>
                </div>
                <div className="bg-black p-3 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-1">Relevance</p>
                  <p className="text-2xl font-bold text-white">
                    {viewingChat.metrics.relevanceScore.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages - Takes up most of the space */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {viewingChat.messages.map((msg: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.speaker === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.speaker === 'bot' && (
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-black text-sm font-bold">B</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] p-4 rounded-2xl ${
                      msg.speaker === 'bot'
                        ? 'bg-zinc-800 border border-zinc-700'
                        : 'bg-white text-black'
                    }`}
                  >
                    <p className={msg.speaker === 'bot' ? 'text-white' : 'text-black'}>
                      {msg.content}
                    </p>
                    <p className={`text-xs mt-2 ${msg.speaker === 'bot' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      Turn {msg.turn}
                    </p>
                  </div>
                  {msg.speaker === 'customer' && (
                    <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">C</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Improvement Suggestions - Compact footer */}
            {viewingChat.improvementSuggestions && viewingChat.improvementSuggestions.length > 0 && (
              <div className="p-4 border-t border-zinc-800 bg-black flex-shrink-0 max-h-32 overflow-y-auto">
                <h3 className="text-xs font-semibold text-white mb-2">💡 Improvement Suggestions</h3>
                <ul className="space-y-1">
                  {viewingChat.improvementSuggestions.map((suggestion: string, idx: number) => (
                    <li key={idx} className="text-xs text-zinc-400">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
