
import React, { useState } from 'react';
import { History, PlayCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BacktestScenario } from '../types';
import { generateBacktestData } from '../services/geminiService';

interface BacktestPanelProps {
  onRunBacktest: () => void; // Trigger callback in parent if needed
}

const BacktestPanel: React.FC<BacktestPanelProps> = () => {
  const [scenarios, setScenarios] = useState<BacktestScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPL, setTotalPL] = useState(0);

  const handleRunBacktest = async () => {
    setIsLoading(true);
    const data = await generateBacktestData();
    setScenarios(data);
    
    // Simple logic: If sentiment matches price direction, we won.
    // If Sentiment Positive AND PriceChange > 0 -> WIN
    // If Sentiment Negative AND PriceChange < 0 -> WIN
    // Else -> LOSS
    let sum = 0;
    const processedData = data.map(s => {
      let win = false;
      if (s.sentiment === 'POSITIVE' && s.priceChange > 0) win = true;
      else if (s.sentiment === 'NEGATIVE' && s.priceChange < 0) win = true;
      
      // If neutral, no trade, no PnL
      const tradePnL = s.sentiment === 'NEUTRAL' ? 0 : (win ? Math.abs(s.priceChange) * 100 : -Math.abs(s.priceChange) * 100);
      sum += tradePnL;
      return { ...s, simulatedPnL: tradePnL };
    });
    
    setScenarios(processedData);
    setTotalPL(sum);
    setIsLoading(false);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-5 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
        <div className="flex items-center space-x-2 text-slate-100 font-semibold">
          <History className="text-purple-400" size={18} />
          <h3>Strategy Backtester</h3>
        </div>
        <button 
          onClick={handleRunBacktest}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Simulating...' : <><PlayCircle size={12} /> Run Simulation</>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-[200px]">
        {scenarios.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <p>No backtest data.</p>
            <p>Click "Run Simulation" to generate historical scenarios via Gemini.</p>
          </div>
        ) : (
          scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-slate-700/30 p-3 rounded-lg border border-slate-700/50">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">{scenario.date}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  scenario.sentiment === 'POSITIVE' ? 'bg-green-500/20 text-green-400' :
                  scenario.sentiment === 'NEGATIVE' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {scenario.sentiment}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mb-2">{scenario.headline}</p>
              <div className="flex justify-between items-center text-xs font-mono border-t border-slate-700/50 pt-2">
                <span className="text-slate-500 flex items-center gap-1">
                  Impact: {scenario.priceChange > 0 ? '+' : ''}{scenario.priceChange}
                </span>
                <span className={scenario.simulatedPnL > 0 ? 'text-green-400' : scenario.simulatedPnL < 0 ? 'text-red-400' : 'text-slate-400'}>
                  {scenario.simulatedPnL > 0 ? '+' : ''}{scenario.simulatedPnL.toFixed(2)} USD
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {scenarios.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
          <span className="text-xs text-slate-400">Total Net Profit</span>
          <span className={`text-lg font-bold font-mono ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
};

export default BacktestPanel;
