import { useEffect, useState } from 'react';
import { ably } from '../lib/ably';
import { useAuthStore } from '../stores/authStore';
import { AlertTriangle, X } from 'lucide-react';

interface LiquidationAlert {
  positionId: string;
  symbol: string;
  closePrice: number;
  reason: string;
}

export function RiskListener() {
  const user = useAuthStore((state) => state.user);
  const [alert, setAlert] = useState<LiquidationAlert | null>(null);

  useEffect(() => {
    if (!user) return;

    if (ably.connection.state !== 'connected') {
      ably.connect();
    }

    const channelName = `private-user-${user.id}`;
    const channel = ably.channels.get(channelName);

    channel.subscribe('liquidation_alert', (message) => {
      setAlert(message.data);
      // Ideally trigger a refresh of account data here
      // window.location.reload(); or queryClient.invalidateQueries()
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-red-500 rounded-xl max-w-md w-full p-6 shadow-2xl shadow-red-500/20 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Position Liquidated</h3>
            <p className="text-red-400 text-sm font-medium">{alert.reason}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Symbol</span>
            <span className="text-white font-bold">{alert.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Exit Price</span>
            <span className="text-white font-bold">\${alert.closePrice}</span>
          </div>
        </div>

        <button
          onClick={() => {
            setAlert(null);
            window.location.reload(); // Refresh to update balance/positions
          }}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          Acknowledge & Refresh
        </button>
      </div>
    </div>
  );
}
