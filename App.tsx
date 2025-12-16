import React, { useState, useEffect, useCallback } from 'react';
import { generateContentStrategy } from './services/geminiService';
import TerminalLog from './components/TerminalLog';
import AnalysisView from './components/AnalysisView';
import { LogEntry, AppState, AnalysisResult } from './types';

const SERVER_URL = 'http://localhost:3001';

const App: React.FC = () => {
  const [sessionToken, setSessionToken] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.CHECKING_SERVER);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Check server status on mount
  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/health`);
      if (res.ok) {
        setAppState(AppState.CONFIG);
      } else {
        setAppState(AppState.SERVER_OFFLINE);
      }
    } catch (e) {
      setAppState(AppState.SERVER_OFFLINE);
    }
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleRunAutomation = async () => {
    if (!sessionToken || !keyword) {
      alert("Please provide both a Session Token and a Keyword.");
      return;
    }

    setAppState(AppState.SCRAPING);
    setLogs([]);
    setAnalysisResult(null);
    addLog('Initiating connection to Local Server...', 'info');

    try {
      const response = await fetch(`${SERVER_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, keyword }),
      });

      if (!response.body) throw new Error('No response body from server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep partial line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            
            if (msg.type === 'log') {
              setLogs(prev => [...prev, msg.data]);
            } else if (msg.type === 'result') {
              finalData = msg.data;
            } else if (msg.type === 'error') {
              throw new Error(msg.message);
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }

      if (finalData) {
        setAppState(AppState.ANALYZING);
        addLog('Sending intercepted data to Gemini 1.5...', 'info');
        
        // Generate Strategy using Gemini
        const strategy = await generateContentStrategy(finalData.keyword, finalData.extracted_queries);
        
        setAnalysisResult({
          id: crypto.randomUUID(),
          keyword: finalData.keyword,
          extracted_queries: finalData.extracted_queries,
          h2_strategy: strategy,
          created_at: new Date().toISOString()
        });
        
        addLog('Analysis Complete.', 'success');
        setAppState(AppState.COMPLETED);
      } else {
        throw new Error('Automation finished but returned no data.');
      }

    } catch (error) {
      addLog(`System Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      setAppState(AppState.ERROR);
    }
  };

  // Screen: Server Offline Instructions
  if (appState === AppState.SERVER_OFFLINE) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-gray-200 font-sans">
        <div className="max-w-xl w-full bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Local Server Offline</h1>
              <p className="text-sm text-gray-400">Connection to <code className="text-gray-300">localhost:3001</code> failed.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              To enable the automated browser interceptor, you must run the local Node.js server.
            </p>
            
            <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-gray-300 border border-gray-800">
              <p className="text-gray-500 mb-2"># 1. Install dependencies (terminal):</p>
              <p className="text-emerald-400 mb-4">npm install express cors playwright playwright-extra puppeteer-extra-plugin-stealth</p>
              
              <p className="text-gray-500 mb-2"># 2. Start the backend:</p>
              <p className="text-emerald-400">node server.js</p>
            </div>

            <button 
              onClick={checkServer}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700 mt-4"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen: Main App
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans selection:bg-emerald-900 selection:text-emerald-100">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
              ChatGPT SEO Interceptor
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Local Automation Agent • <span className="text-emerald-400">Connected to localhost:3001</span>
            </p>
          </div>
          <div className="mt-4 md:mt-0">
             <div className="px-3 py-1 bg-gray-900 rounded border border-gray-800 flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-gray-400 font-mono">Server Online</span>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Target Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                    Target Keyword
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. Best running shoes"
                    className="w-full bg-gray-950 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                    Session Token
                  </label>
                  <input
                    type="password"
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    placeholder="__Secure-next-auth.session-token"
                    className="w-full bg-gray-950 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder-gray-600 font-mono text-xs"
                  />
                </div>

                <button
                  onClick={handleRunAutomation}
                  disabled={appState === AppState.SCRAPING || appState === AppState.ANALYZING}
                  className={`
                    w-full py-4 rounded-lg font-bold text-sm uppercase tracking-wide transition-all shadow-lg
                    ${appState === AppState.SCRAPING || appState === AppState.ANALYZING 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-500/20'}
                  `}
                >
                  {appState === AppState.SCRAPING ? 'Running Automation...' : 
                   appState === AppState.ANALYZING ? 'Processing Data...' : 
                   'Run Interceptor'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Results & Logs */}
          <div className="lg:col-span-2">
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                     <h2 className="text-lg font-semibold text-white">Live Server Logs</h2>
                     {appState === AppState.SCRAPING && <span className="text-xs text-emerald-400 animate-pulse font-mono">● Receiving Stream</span>}
                </div>
               <TerminalLog logs={logs} />
            </div>

            {analysisResult && (
              <AnalysisView result={analysisResult} />
            )}
            
            {!analysisResult && appState === AppState.CONFIG && (
                <div className="h-48 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                     <p className="text-sm">Ready to automate. Enter details and click Run.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;