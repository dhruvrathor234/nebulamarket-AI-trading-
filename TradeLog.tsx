
import React from 'react';
import { Trade, TradeType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, ShieldAlert, Bitcoin, Coins, Zap } from 'lucide-react';

interface TradeLogProps {
  trades: Trade[];
}

const TradeLog: React.FC<TradeLogProps> = ({ trades }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-100">Trade History</h2>
        <span className="text-xs text-slate-500">All Assets</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {trades.length === 0 ? (
          <div className="text-center text-slate-500 py-8">No trades executed yet.</div>
        ) : (
          [...trades].reverse().map((trade) => (
            <div 
              key={trade.id} 
              className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg border border-slate-700/50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-800 rounded-full border border-slate-600">
                  {trade.symbol === 'BTCUSD' ? (
                    <Bitcoin size={16} className="text-orange-500"/>
                  ) : trade.symbol === 'ETHUSD' ? (
                    <Zap size={16} className="text-purple-500"/>
                  ) : (
                    <Coins size={16} className="text-yellow-500"/>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                     <span className="font-bold text-slate-200 text-sm">{trade.symbol}</span>
                    <span className={`font-bold text-xs ${trade.type === TradeType.BUY ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.type}
                    </span>
                  </div>
                   <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span>@{trade.entryPrice.toFixed(2)}</span>
                    <span className="bg-slate-600 px-1.5 rounded text-slate-300">Lot: {trade.lotSize.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{new Date(trade.openTime).toLocaleTimeString()}</span>
                    <span className="text-red-400/80 flex items-center gap-0.5"><ShieldAlert size={10}/> SL: {trade.stopLoss.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {trade.status === 'CLOSED' ? (
                  <>
                    <div className={`font-mono font-bold ${Number(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Number(trade.pnl) >= 0 ? '+' : ''}{trade.pnl?.toFixed(2)}
                    </div>
                    <div className="flex items-center justify-end text-xs text-slate-500 space-x-1">
                      <CheckCircle size={10} />
                      <span>Closed</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-yellow-500 font-mono text-sm animate-pulse">Running</div>
                    <div className="flex items-center justify-end text-xs text-slate-500 space-x-1">
                      <Clock size={10} />
                      <span>Open</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TradeLog;
