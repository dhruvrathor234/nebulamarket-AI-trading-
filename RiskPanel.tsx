
import React from 'react';
import { Settings, Shield, Target } from 'lucide-react';
import { RiskSettings, Symbol } from '../types';
import { ASSETS } from '../constants';

interface RiskPanelProps {
  symbol: Symbol;
  settings: RiskSettings;
  onUpdate: (settings: RiskSettings) => void;
  balance: number;
}

const RiskPanel: React.FC<RiskPanelProps> = ({ symbol, settings, onUpdate, balance }) => {
  
  const contractSize = ASSETS[symbol].CONTRACT_SIZE;
  const riskAmount = (balance * settings.riskPercentage) / 100;
  
  // Formula: Lot = RiskAmount / (StopLossDistance * ContractSize)
  // XAUUSD: Contract 100. $1 move * 100 = $100 per lot.
  // BTCUSD: Contract 1. $1 move * 1 = $1 per lot.
  const estimatedLotSize = riskAmount / (settings.stopLossDistance * contractSize);

  const handleChange = (key: keyof RiskSettings, value: number) => {
    onUpdate({ ...settings, [key]: value });
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-5">
      <div className="flex items-center space-x-2 mb-4 text-slate-100 font-semibold border-b border-slate-700 pb-2">
        <Shield className="text-blue-400" size={18} />
        <h3>Risk Management ({symbol})</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Percentage Input */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 flex justify-between">
            <span>Risk per Trade (%)</span>
            <span className="text-blue-400 font-mono">{settings.riskPercentage}%</span>
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1"
            value={settings.riskPercentage}
            onChange={(e) => handleChange('riskPercentage', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Risk Amount:</span>
            <span className="text-red-400">-${riskAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Stop Loss Distance Input */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 flex justify-between">
            <span>Stop Loss Distance ($)</span>
            <span className="text-blue-400 font-mono">${settings.stopLossDistance.toFixed(2)}</span>
          </label>
          <input 
            type="range" 
            min="1" 
            max={symbol === 'BTCUSD' ? 2000 : 50} 
            step={symbol === 'BTCUSD' ? 10 : 0.5}
            value={settings.stopLossDistance}
            onChange={(e) => handleChange('stopLossDistance', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Position Size:</span>
            <span className="text-green-400">{estimatedLotSize.toFixed(2)} Lots</span>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 text-xs text-blue-200 flex items-start gap-2">
        <Target size={14} className="mt-0.5 shrink-0" />
        <p>
          To risk exactly <strong>${riskAmount.toFixed(0)}</strong> with a <strong>${settings.stopLossDistance}</strong> stop loss on {symbol}, the AI will trade <strong>{estimatedLotSize.toFixed(2)} Lots</strong>.
        </p>
      </div>
    </div>
  );
};

export default RiskPanel;
