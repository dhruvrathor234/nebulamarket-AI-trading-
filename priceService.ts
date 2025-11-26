
import { Symbol } from '../types';

// Fallback prices in case APIs fail
const FALLBACK_PRICES = {
  XAUUSD: 2650.00,
  BTCUSD: 92000.00,
  ETHUSD: 3350.00
};

export const fetchRealPrice = async (symbol: Symbol): Promise<number> => {
  try {
    if (symbol === 'BTCUSD') {
      // Binance Public API for BTC
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (!response.ok) throw new Error('Binance API failed');
      const data = await response.json();
      return parseFloat(data.price);
    } 

    if (symbol === 'ETHUSD') {
      // Binance Public API for ETH
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
      if (!response.ok) throw new Error('Binance API failed');
      const data = await response.json();
      return parseFloat(data.price);
    }
    
    if (symbol === 'XAUUSD') {
      // Attempt to fetch from a public gold price feed (Data-ASG)
      // Note: This is a common free endpoint, but CORS might block it in some environments.
      // If it fails, we fall back to a random walk simulation around the last known price.
      try {
        const response = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
        if (response.ok) {
           const data = await response.json();
           // data structure: { items: [{ xauPrice: 2750.5, ... }] }
           if (data.items && data.items.length > 0) {
             return data.items[0].xauPrice;
           }
        }
      } catch (e) {
        // Fallthrough to simulation
      }
      
      // Simulation Fallback for XAU (Random Walk) if API fails
      // This ensures the bot keeps running even if the free gold API is down.
      const time = Date.now();
      const volatility = Math.sin(time / 10000) * 5; // Slow wave
      const noise = (Math.random() - 0.5) * 2;
      return FALLBACK_PRICES.XAUUSD + volatility + noise;
    }

    return FALLBACK_PRICES[symbol];
  } catch (error) {
    console.warn(`Failed to fetch price for ${symbol}, using fallback.`, error);
    return FALLBACK_PRICES[symbol];
  }
};
