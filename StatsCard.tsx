import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  subtext?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, subtext }) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-slate-400';
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        <div className="p-2 bg-slate-700/50 rounded-lg">
          <Icon size={18} className="text-yellow-500" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`text-2xl font-bold ${getTrendColor()}`}>{value}</span>
        {subtext && <span className="text-xs text-slate-500 mt-1">{subtext}</span>}
      </div>
    </div>
  );
};

export default StatsCard;
