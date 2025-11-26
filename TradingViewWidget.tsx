
import React, { useEffect, useRef, memo } from 'react';
import { Symbol } from '../types';

interface TradingViewWidgetProps {
  symbol: Symbol;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ symbol }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Map internal symbols to TradingView symbols
    let tvSymbol = 'OANDA:XAUUSD';
    if (symbol === 'BTCUSD') tvSymbol = 'BINANCE:BTCUSDT';
    if (symbol === 'ETHUSD') tvSymbol = 'BINANCE:ETHUSDT';

    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // Clear previous widget
      
      const script = document.createElement('script');
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": tvSymbol,
        "interval": "1",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "calendar": false,
        "hide_volume": true,
        "support_host": "https://www.tradingview.com"
      });
      containerRef.current.appendChild(script);
    }
  }, [symbol]);

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 h-96 overflow-hidden flex flex-col relative">
      <div className="h-full w-full" ref={containerRef}>
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Loading TradingView Chart...
        </div>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);
