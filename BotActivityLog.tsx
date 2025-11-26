import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface BotActivityLogProps {
  logs: LogEntry[];
}

const BotActivityLog: React.FC<BotActivityLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getColor = (type: string) => {
    switch(type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-inner flex flex-col h-64 font-mono text-sm">
      <div className="flex items-center space-x-2 p-3 border-b border-slate-800 bg-slate-950 rounded-t-xl">
        <Terminal size={14} className="text-slate-500" />
        <span className="text-slate-400 font-semibold">System Logs</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex space-x-2">
            <span className="text-slate-600 min-w-[70px] select-none">[{log.time}]</span>
            <span className={`${getColor(log.type)} break-all`}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default BotActivityLog;
