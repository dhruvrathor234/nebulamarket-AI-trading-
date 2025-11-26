
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, TrendingUp, Newspaper, Activity, Wallet, ShieldAlert, Cpu, Coins, Bitcoin, Zap } from 'lucide-react';
import { analyzeMarket } from './services/geminiService';
import { fetchRealPrice } from './services/priceService';
import TradingViewWidget from './components/TradingViewWidget';
import StatsCard from './components/StatsCard';
import TradeLog from './components/TradeLog';
import BotActivityLog from './components/BotActivityLog';
import RiskPanel from './components/RiskPanel';
import { 
  BotState, 
  Trade, 
  TradeType, 
  MarketAnalysis, 
  NewsSource,
  RiskSettings,
  Symbol
} from './types';
import { 
  INITIAL_BALANCE, 
  CRON_INTERVAL_MS, 
  PRICE_TICK_INTERVAL_MS,
  SIMULATION_DISCLAIMER,
  ASSETS
} from './constants';

const App: React.FC = () => {
  // --- State ---
  const [activeSymbol, setActiveSymbol] = useState<Symbol>('XAUUSD');
  
  const [botState, setBotState] = useState<BotState>({
    isRunning: false,
    balance: INITIAL_BALANCE,
    equity: INITIAL_BALANCE,
    lastRunTime: null,
    statusMessage: "Bot is idle. Waiting to start.",
  });

  const [riskSettings, setRiskSettings] = useState<Record<Symbol, RiskSettings>>({
    XAUUSD: { riskPercentage: 1.0, stopLossDistance: ASSETS.XAUUSD.DEFAULT_STOP_LOSS },
    BTCUSD: { riskPercentage: 1.0, stopLossDistance: ASSETS.BTCUSD.DEFAULT_STOP_LOSS },
    ETHUSD: { riskPercentage: 1.0, stopLossDistance: ASSETS.ETHUSD.DEFAULT_STOP_LOSS }
  });

  const [prices, setPrices] = useState<Record<Symbol, number>>({
    XAUUSD: ASSETS.XAUUSD.INITIAL_PRICE,
    BTCUSD: ASSETS.BTCUSD.INITIAL_PRICE,
    ETHUSD: ASSETS.ETHUSD.INITIAL_PRICE
  });

  const [trades, setTrades] = useState<Trade[]>([]);
  const [analyses, setAnalyses] = useState<Record<Symbol, MarketAnalysis | null>>({
    XAUUSD: null,
    BTCUSD: null,
    ETHUSD: null
  });
  
  const [logs, setLogs] = useState<{ id: number; time: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }[]>([]);
  
  // Refs for Cron/Ticks (to avoid stale closures)
  const botStateRef = useRef(botState);
  const pricesRef = useRef(prices);
  const tradesRef = useRef(trades);
  const riskSettingsRef = useRef(riskSettings);
  
  // Sync refs
  useEffect(() => {
    botStateRef.current = botState;
    pricesRef.current = prices;
    tradesRef.current = trades;
    riskSettingsRef.current = riskSettings;
  }, [botState, prices, trades, riskSettings]);

  // --- Helpers ---
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-49), { id: Date.now(), time, message, type }]);
  };

  // --- Real-Time Market Data & PnL Engine ---
  useEffect(() => {
    const interval = setInterval(async () => {
      const symbols: Symbol[] = ['XAUUSD', 'BTCUSD', 'ETHUSD'];
      let floatingPL = 0;
      let closedTradesDueToSL: Trade[] = [];
      let currentTrades = [...tradesRef.current];
      
      // 1. Fetch Real Prices
      const newPrices = { ...pricesRef.current };
      
      // We fetch concurrently
      await Promise.all(symbols.map(async (sym) => {
        const realPrice = await fetchRealPrice(sym);
        newPrices[sym] = realPrice;
      }));
      
      setPrices(newPrices);

      // 2. Calculate PnL & Check Stop Loss
      currentTrades = currentTrades.map(trade => {
        if (trade.status === 'OPEN') {
          const currentPrice = newPrices[trade.symbol];
          const contractSize = ASSETS[trade.symbol].CONTRACT_SIZE;

          const diff = trade.type === TradeType.BUY 
            ? currentPrice - trade.entryPrice 
            : trade.entryPrice - currentPrice;
          
          const profit = diff * contractSize * trade.lotSize; 
          floatingPL += profit;

          // Check Stop Loss
          let slHit = false;
          if (trade.type === TradeType.BUY && currentPrice <= trade.stopLoss) slHit = true;
          if (trade.type === TradeType.SELL && currentPrice >= trade.stopLoss) slHit = true;

          if (slHit) {
            closedTradesDueToSL.push({
              ...trade,
              status: 'CLOSED',
              closePrice: currentPrice,
              closeTime: Date.now(),
              pnl: profit
            });
            return {
              ...trade,
              status: 'CLOSED',
              closePrice: currentPrice,
              closeTime: Date.now(),
              pnl: profit
            };
          }
        }
        return trade;
      });

      // 3. Update Balance if SL hit
      if (closedTradesDueToSL.length > 0) {
        setTrades(currentTrades);
        const totalClosedPL = closedTradesDueToSL.reduce((sum, t) => sum + (t.pnl || 0), 0);
        setBotState(prev => ({
           ...prev,
           balance: prev.balance + totalClosedPL,
           equity: prev.balance + totalClosedPL + floatingPL
        }));
        closedTradesDueToSL.forEach(t => {
           addLog(`[${t.symbol}] Stop Loss Hit! Closed ${t.type} @ ${t.closePrice?.toFixed(2)}. PnL: $${t.pnl?.toFixed(2)}`, "error");
        });
      } else {
         setBotState(prev => ({
           ...prev,
           equity: prev.balance + floatingPL
         }));
      }

    }, PRICE_TICK_INTERVAL_MS * 2); // Fetch every 2 seconds to be kind to APIs

    return () => clearInterval(interval);
  }, [analyses]);

  // --- Cron Job (Bot Logic) ---
  const executeBotLogic = useCallback(async () => {
    if (!botStateRef.current.isRunning) return;

    addLog("Cron: Scanning markets (XAUUSD, BTCUSD, ETHUSD)...", "info");

    const symbols: Symbol[] = ['XAUUSD', 'BTCUSD', 'ETHUSD'];
    
    for (const sym of symbols) {
      try {
        const analysis = await analyzeMarket(sym);
        setAnalyses(prev => ({ ...prev, [sym]: analysis }));
        
        // Trading Logic
        const currentTrades = tradesRef.current;
        const activeTrade = currentTrades.find(t => t.status === 'OPEN' && t.symbol === sym);
        const price = pricesRef.current[sym];
        const risk = riskSettingsRef.current[sym];

        // 1. Close Signal Logic
        if (activeTrade) {
           if (
            (activeTrade.type === TradeType.BUY && analysis.decision === TradeType.SELL) ||
            (activeTrade.type === TradeType.SELL && analysis.decision === TradeType.BUY)
          ) {
            const contractSize = ASSETS[sym].CONTRACT_SIZE;
            const diff = activeTrade.type === TradeType.BUY ? price - activeTrade.entryPrice : activeTrade.entryPrice - price;
            const pnl = diff * contractSize * activeTrade.lotSize;
            
            const closedTrade: Trade = {
              ...activeTrade,
              status: 'CLOSED',
              closePrice: price,
              closeTime: Date.now(),
              pnl
            };

            setTrades(prev => prev.map(t => t.id === closedTrade.id ? closedTrade : t));
            setBotState(prev => ({ ...prev, balance: prev.balance + pnl }));
            addLog(`[${sym}] Closed ${activeTrade.type} on reversal. PnL: $${pnl.toFixed(2)}`, pnl >= 0 ? "success" : "warning");
            continue;
          }
        }

        // 2. Open Signal Logic
        const SENTIMENT_THRESHOLD = 0.4;
        if (!activeTrade && analysis.decision !== TradeType.HOLD) {
          if (Math.abs(analysis.sentimentScore) > SENTIMENT_THRESHOLD) {
            
            const riskAmount = (botStateRef.current.balance * risk.riskPercentage) / 100;
            const contractSize = ASSETS[sym].CONTRACT_SIZE;
            const lotSize = Number((riskAmount / (risk.stopLossDistance * contractSize)).toFixed(2));
            
            if (lotSize <= 0) {
               addLog(`[${sym}] Calculated lot size too small. skipping.`, "warning");
               continue;
            }

            const stopLossPrice = analysis.decision === TradeType.BUY 
              ? price - risk.stopLossDistance 
              : price + risk.stopLossDistance;

            const newTrade: Trade = {
              id: crypto.randomUUID(),
              symbol: sym,
              type: analysis.decision,
              entryPrice: price,
              lotSize: lotSize,
              stopLoss: stopLossPrice,
              riskPercentage: risk.riskPercentage,
              openTime: Date.now(),
              status: 'OPEN'
            };
            
            setTrades(prev => [...prev, newTrade]);
            addLog(`[${sym}] Opened ${analysis.decision} ${lotSize} Lots @ ${price.toFixed(2)}.`, "success");
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
    setBotState(prev => ({ ...prev, lastRunTime: Date.now() }));
  }, []);

  // Interval wrapper
  useEffect(() => {
    let intervalId: any;
    if (botState.isRunning) {
      executeBotLogic();
      intervalId = setInterval(executeBotLogic, CRON_INTERVAL_MS);
    }
    return () => clearInterval(intervalId);
  }, [botState.isRunning, executeBotLogic]);


  // --- Event Handlers ---
  const toggleBot = () => {
    if (!process.env.API_KEY) {
      alert("Please provide an API Key in the code to run the bot.");
      return;
    }
    setBotState(prev => ({ 
      ...prev, 
      isRunning: !prev.isRunning,
      statusMessage: !prev.isRunning ? "Bot running..." : "Bot stopped."
    }));
    addLog(!botState.isRunning ? "System started." : "System stopped.", "info");
  };

  const handleRiskUpdate = (newSettings: RiskSettings) => {
    setRiskSettings(prev => ({
      ...prev,
      [activeSymbol]: newSettings
    }));
  };

  const currentAnalysis = analyses[activeSymbol];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-10">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Cpu className="text-blue-500" size={28} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Sentitrade AI <span className="text-xs text-slate-500 font-normal">Real-Time</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-900 py-1 px-3 rounded-full border border-slate-800">
                <span className={`w-2 h-2 rounded-full ${botState.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span>{botState.isRunning ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
             </div>
            <button
              onClick={toggleBot}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all ${
                botState.isRunning 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50' 
                  : 'bg-green-500 text-slate-950 hover:bg-green-400'
              }`}
            >
              {botState.isRunning ? <><Pause size={18} /><span>STOP BOT</span></> : <><Play size={18} /><span>START BOT</span></>}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6 mt-4">
        
        {/* Warning Banner */}
        <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-lg flex items-center space-x-3 text-sm text-yellow-500">
            <ShieldAlert size={18} />
            <p>{SIMULATION_DISCLAIMER} (Chart and Bot Prices are Real-Time)</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Account Balance" 
            value={`$${botState.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
            icon={Wallet} 
            trend="neutral"
          />
           <StatsCard 
            title="Equity" 
            value={`$${botState.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
            icon={TrendingUp} 
            trend={botState.equity >= botState.balance ? 'up' : 'down'}
          />
          <StatsCard 
            title={`${activeSymbol} Price`} 
            value={`$${prices[activeSymbol].toLocaleString()}`} 
            subtext="Live Market Data"
            icon={Activity} 
          />
           <StatsCard 
            title="Bot Interval" 
            value="30s" 
            subtext="Multi-Asset Scan"
            icon={Newspaper} 
          />
        </div>

        {/* Asset Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 overflow-x-auto">
          <button 
            onClick={() => setActiveSymbol('XAUUSD')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeSymbol === 'XAUUSD' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Coins size={16} /> Gold (XAUUSD)
          </button>
          <button 
            onClick={() => setActiveSymbol('BTCUSD')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeSymbol === 'BTCUSD' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Bitcoin size={16} /> Bitcoin (BTCUSD)
          </button>
          <button 
            onClick={() => setActiveSymbol('ETHUSD')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeSymbol === 'ETHUSD' ? 'border-purple-500 text-purple-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Zap size={16} /> Ethereum (ETHUSD)
          </button>
        </div>

        {/* Chart & Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Chart & Logs */}
          <div className="lg:col-span-2 space-y-6">
            <TradingViewWidget symbol={activeSymbol} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RiskPanel 
                symbol={activeSymbol}
                settings={riskSettings[activeSymbol]} 
                onUpdate={handleRiskUpdate} 
                balance={botState.balance}
              />
              <BotActivityLog logs={logs} />
            </div>
          </div>

          {/* Right Column: Analysis & Sources */}
          <div className="space-y-6">
            {/* AI Insight Card */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
              <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                <Cpu size={16} className="text-purple-400"/> Gemini Insight ({activeSymbol})
              </h3>
              {currentAnalysis ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                     <div className={`text-3xl font-bold font-mono ${
                        currentAnalysis.decision === 'BUY' ? 'text-green-500' : 
                        currentAnalysis.decision === 'SELL' ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        {currentAnalysis.decision}
                     </div>
                     <span className={`px-2 py-1 rounded text-xs font-bold ${
                        currentAnalysis.sentimentCategory === 'POSITIVE' ? 'bg-green-500/20 text-green-400' :
                        currentAnalysis.sentimentCategory === 'NEGATIVE' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                     }`}>
                       {currentAnalysis.sentimentCategory}
                     </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-700/30 p-3 rounded-lg">
                    "{currentAnalysis.reasoning}"
                  </p>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-500 text-sm italic">
                  Bot scanning {activeSymbol}...
                </div>
              )}
            </div>

            {/* News Sources List */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg h-[400px] overflow-hidden flex flex-col">
              <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                <Newspaper size={16} className="text-blue-400"/> Live Sources ({activeSymbol})
              </h3>
              <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-2">
                {currentAnalysis?.sources && currentAnalysis.sources.length > 0 ? (
                  currentAnalysis.sources.map((source: NewsSource, idx: number) => (
                    <a 
                      key={idx} 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-700/50 group"
                    >
                      <p className="text-xs font-medium text-slate-300 group-hover:text-blue-300 truncate mb-1">
                        {source.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {new URL(source.url).hostname}
                      </p>
                    </a>
                  ))
                ) : (
                  <div className="text-center text-slate-600 text-xs py-10">
                    Waiting for analysis...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="h-[300px]">
          <TradeLog trades={trades} />
        </div>

      </main>
    </div>
  );
};

export default App;
