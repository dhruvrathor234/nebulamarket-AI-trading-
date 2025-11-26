
export type Symbol = 'XAUUSD' | 'BTCUSD' | 'ETHUSD';

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD'
}

export interface NewsSource {
  title: string;
  url: string;
}

export interface MarketAnalysis {
  symbol: Symbol;
  timestamp: number;
  sentimentScore: number; // -1 (Bearish) to 1 (Bullish)
  sentimentCategory: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  decision: TradeType;
  reasoning: string;
  sources: NewsSource[];
}

export interface Trade {
  id: string;
  symbol: Symbol;
  type: TradeType;
  entryPrice: number;
  closePrice?: number;
  lotSize: number;
  stopLoss: number;
  riskPercentage: number;
  pnl?: number;
  openTime: number;
  closeTime?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface BotState {
  isRunning: boolean;
  balance: number;
  equity: number;
  lastRunTime: number | null;
  statusMessage: string;
}

export interface RiskSettings {
  riskPercentage: number; // e.g., 1%
  stopLossDistance: number; // Price distance
}

export interface BacktestScenario {
  id: string;
  date: string;
  headline: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  priceChange: number;
  simulatedPnL: number;
}
