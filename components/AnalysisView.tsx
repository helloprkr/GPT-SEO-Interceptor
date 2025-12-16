import React from 'react';
import { AnalysisResult } from '../types';
import ReactMarkdown from 'react-markdown';

interface AnalysisViewProps {
  result: AnalysisResult | null;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result }) => {
  if (!result) return null;

  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Intercepted Data */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Network Sniffer Results
            </h3>
            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-800">
              Source: /backend-api/conversation
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-950 rounded p-3 border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">Target Keyword</p>
              <p className="font-mono text-emerald-400">{result.keyword}</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Intercepted Real Queries</p>
              <ul className="space-y-2">
                {result.extracted_queries.map((q, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-gray-600 mr-2 font-mono">0{i + 1}</span>
                    <span className="text-gray-200 font-medium border-b border-gray-700 pb-0.5">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Gemini Strategy */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            <h3 className="text-xl font-bold text-white">Gemini 1.5 Content Strategy</h3>
          </div>
          <div className="prose prose-invert prose-sm max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <ReactMarkdown>{result.h2_strategy}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;