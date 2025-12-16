import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalLogProps {
  logs: LogEntry[];
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm shadow-inner">
      <div className="flex items-center space-x-2 mb-2 border-b border-gray-800 pb-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-gray-500 text-xs ml-2">server/scraper.js — Node.js process</span>
      </div>
      <div className="space-y-1">
        {logs.length === 0 && (
          <span className="text-gray-600 italic">Waiting for process to start...</span>
        )}
        {logs.map((log, index) => (
          <div key={index} className="flex space-x-2">
            <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
            <span
              className={`
                ${log.type === 'error' ? 'text-red-400' : ''}
                ${log.type === 'success' ? 'text-emerald-400' : ''}
                ${log.type === 'warning' ? 'text-yellow-400' : ''}
                ${log.type === 'info' ? 'text-gray-300' : ''}
              `}
            >
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalLog;