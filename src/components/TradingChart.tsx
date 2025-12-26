import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  isConnected?: boolean;
}

export function TradingChart({ symbol, isConnected = true }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !isConnected) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined' && containerRef.current) {
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: '5',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          width: "100%",
          height: "100%",
          backgroundColor: '#0f172a',
          gridColor: '#1e293b',
          hide_side_toolbar: false,
          studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
          overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#10b981',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
            'paneProperties.background': '#0f172a',
            'paneProperties.vertGridProperties.color': '#1e293b',
            'paneProperties.horzGridProperties.color': '#1e293b',
          },
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (widgetRef.current && widgetRef.current.remove) {
        widgetRef.current.remove();
      }
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [symbol, isConnected]);

  if (!isConnected) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-slate-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Connecting to market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/50 shadow-2xl">
      <div id={`tradingview_${symbol.replace(/:/g, '_')}`} ref={containerRef} className="w-full h-full" />
    </div>
  );
}

declare global {
  interface Window {
    TradingView: any;
  }
}
