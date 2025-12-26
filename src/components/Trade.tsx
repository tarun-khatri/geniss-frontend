import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useMarketStore } from '../stores/marketStore';
import { TrendingUp, ArrowLeft, Loader2, AlertCircle, TrendingDown, X, RefreshCw } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { TradingChart } from './TradingChart';
import type { Database } from '../lib/database.types';

type UserAccount = Database['public']['Tables']['user_accounts']['Row'];
type Challenge = Database['public']['Tables']['challenges']['Row'];
type Position = Database['public']['Tables']['positions']['Row'];

interface UserAccountWithChallenge extends UserAccount {
  challenges: Challenge;
}

interface MarketQuote {
  symbol: string;
  current: number;
  change: number;
  changePercent: number;
}

interface SearchResult {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
}

interface MonitorData {
  equity: number;
  unrealizedPnl: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  drawdown: number;
  liquidated: boolean;
  reason?: string;
}

// Helper component for real-time position updates
const PositionRow = ({ position, closePosition }: { position: Position; closePosition: (id: string) => void }) => {
  const getInternalSymbol = (sym: string) => {
    if (sym.includes('BTC')) return 'BTC-USD';
    if (sym.includes('ETH')) return 'ETH-USD';
    if (sym.includes('SOL')) return 'SOL-USD';
    return sym;
  };

  const internalSymbol = getInternalSymbol(position.symbol);
  const currentPrice = useMarketStore((state) => state.getPrice(internalSymbol));

  // Calculate PnL locally if price is available, otherwise fallback to DB value
  const pnl = currentPrice
    ? (position.side === 'long'
      ? (currentPrice - position.entry_price) * position.quantity
      : (position.entry_price - currentPrice) * position.quantity)
    : position.unrealized_pnl;

  const displayPrice = currentPrice || position.current_price || position.entry_price;
  const leverage = position.leverage || 1;
  const liquidationPrice = position.side === 'long'
    ? position.entry_price * (1 - (1 / leverage))
    : position.entry_price * (1 + (1 / leverage));

  return (
    <div className="p-5 bg-slate-950 rounded-xl border border-slate-800/50 hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-white font-bold text-lg">{position.symbol.split(':')[1]?.replace('USDT', '/USDT') || position.symbol}</div>
          <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${position.side === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
            {position.side}
          </span>
          <span className="text-slate-500 text-xs font-semibold bg-slate-800/50 px-2 py-1 rounded">{leverage}x</span>
        </div>
        <button
          onClick={() => closePosition(position.id)}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold transition-all border border-red-500/20"
        >
          Close Position
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div>
          <div className="text-slate-400 text-xs font-medium mb-1">Entry Price</div>
          <div className="text-white font-semibold">${position.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs font-medium mb-1">Current Price</div>
          <div className="text-white font-semibold">${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs font-medium mb-1">Liq. Price</div>
          <div className="text-orange-400 font-semibold">${liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs font-medium mb-1">Quantity</div>
          <div className="text-white font-semibold">{position.quantity}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs font-medium mb-1">Unrealized P&L</div>
          <div className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
};

export function Trade() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('account');

  const [accounts, setAccounts] = useState<UserAccountWithChallenge[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<UserAccountWithChallenge | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedSymbol, setSelectedSymbol] = useState<SearchResult | null>(null);

  // Map display symbol to internal symbol (e.g. BINANCE:BTCUSDT -> BTC-USD)
  const getInternalSymbol = (sym: string) => {
    if (sym.includes('BTC')) return 'BTC-USD';
    if (sym.includes('ETH')) return 'ETH-USD';
    if (sym.includes('SOL')) return 'SOL-USD';
    if (sym.includes('BNB')) return 'BNB-USD';
    if (sym.includes('XRP')) return 'XRP-USD';
    if (sym.includes('ADA')) return 'ADA-USD';
    if (sym.includes('DOGE')) return 'DOGE-USD';
    if (sym.includes('AVAX')) return 'AVAX-USD';
    if (sym.includes('MATIC')) return 'MATIC-USD';
    if (sym.includes('DOT')) return 'DOT-USD';
    return sym; // Fallback
  };

  const internalSymbol = selectedSymbol ? getInternalSymbol(selectedSymbol.symbol) : '';
  const currentPrice = useMarketStore((state) => internalSymbol ? state.getPrice(internalSymbol) : undefined);

  // Construct quote object compatible with UI
  const quote = currentPrice ? {
    symbol: selectedSymbol?.symbol || '',
    current: currentPrice,
    change: 0, // TODO: Calculate 24h change
    changePercent: 0 // TODO: Calculate 24h change
  } : null;

  const [priceFlash, setPriceFlash] = useState<'green' | 'red' | null>(null);
  const prevPriceRef = useRef<number | undefined>(undefined);

  const [orderSide, setOrderSide] = useState<'long' | 'short'>('long');
  const [quantity, setQuantity] = useState('1'); // Now represents Margin amount
  const [leverage, setLeverage] = useState(1);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (quote?.current && prevPriceRef.current) {
      if (quote.current > prevPriceRef.current) {
        setPriceFlash('green');
      } else if (quote.current < prevPriceRef.current) {
        setPriceFlash('red');
      }
      const timer = setTimeout(() => setPriceFlash(null), 300);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = quote?.current;
  }, [quote?.current]);

  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [monitoring, setMonitoring] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);

  const formatSymbol = (symbol: string): string => {
    if (symbol.includes(':')) {
      const parts = symbol.split(':');
      const pair = parts[1].replace('USDT', '/USDT');
      return pair;
    }
    return symbol;
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (accounts.length > 0 && accountId) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        setSelectedAccount(account);
        loadPositions(accountId);
        monitorAccount(accountId);
      }
    } else if (accounts.length > 0 && accounts[0].status === 'active') {
      setSelectedAccount(accounts[0]);
      loadPositions(accounts[0].id);
      monitorAccount(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (selectedAccount && selectedAccount.status === 'active') {
      const interval = setInterval(() => {
        monitorAccount(selectedAccount.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select(`
          *,
          challenges(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data as UserAccountWithChallenge[]);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_account_id', accountId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false });

      if (error) throw error;
      setPositions(data || []);
    } catch (err: any) {
      console.error('Error loading positions:', err);
    }
  };

  const monitorAccount = async (accountId: string) => {
    if (monitoring) return;
    setMonitoring(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/trade/monitor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userAccountId: accountId }),
        }
      );

      if (!response.ok) throw new Error('Failed to monitor account');

      const data = await response.json();
      setMonitorData(data);

      if (data.liquidated) {
        setError(data.reason || 'Account liquidated');
        await loadAccounts();
      } else {
        await loadPositions(accountId);
      }
    } catch (err: any) {
      console.error('Error monitoring account:', err);
    } finally {
      setMonitoring(false);
    }
  };

  const selectSymbol = (result: SearchResult) => {
    setSelectedSymbol(result);
  };

  const placeTrade = async () => {
    if (!selectedAccount || !selectedSymbol || !quote) return;

    setPlacing(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/trade/open`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAccountId: selectedAccount.id,
            symbol: selectedSymbol.symbol,
            side: orderSide,
            // Calculate actual unit quantity: (Margin * Leverage) / Price
            quantity: (parseFloat(quantity) * leverage) / quote.current,
            leverage: leverage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place trade');
      }

      setQuantity('1');
      await loadPositions(selectedAccount.id);
      await loadAccounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  const closePosition = async (positionId: string) => {
    if (!selectedAccount) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/trade/close`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            positionId,
            userAccountId: selectedAccount.id,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to close position');

      await loadPositions(selectedAccount.id);
      await loadAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="container mx-auto px-4 py-8">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Sign In Required</h2>
              <p className="text-slate-400 mb-6">Please sign in to access the trading platform</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
          disableSignup={true}
        />
      </>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/trade')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Trading Accounts Yet</h2>
            <p className="text-slate-400 mb-6">Get started by purchasing a trading challenge</p>
            <button
              onClick={() => navigate('/trade')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/trade')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white mb-6">Select an Account</h1>
          <div className="grid gap-4">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  setSelectedAccount(account);
                  loadPositions(account.id);
                  monitorAccount(account.id);
                }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/50 transition-all text-left"
              >
                <h3 className="text-xl font-bold text-white mb-2">{account.challenges.name}</h3>
                <p className="text-slate-400">Balance: ${account.balance.toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/trade')}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Account</div>
                <div className="text-sm font-semibold text-white">{selectedAccount.challenges.name}</div>
              </div>
              <button
                onClick={() => monitorAccount(selectedAccount.id)}
                disabled={monitoring}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${monitoring ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="text-red-400 text-sm font-medium flex-1">{error}</div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">Balance</div>
            <div className="text-2xl font-bold text-white">
              ${selectedAccount.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>

          {monitorData && (
            <>
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">Equity</div>
                <div className="text-2xl font-bold text-white">
                  ${monitorData.equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">Daily P&L</div>
                <div className="flex items-baseline gap-1.5">
                  <div className={`text-2xl font-bold ${monitorData.dailyPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {monitorData.dailyPnl >= 0 ? '+' : ''}${Math.abs(monitorData.dailyPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-sm font-medium ${monitorData.dailyPnl >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                    {monitorData.dailyPnlPercent >= 0 ? '+' : ''}{monitorData.dailyPnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">Unrealized P&L</div>
                <div className={`text-2xl font-bold ${monitorData.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {monitorData.unrealizedPnl >= 0 ? '+' : ''}${Math.abs(monitorData.unrealizedPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">Drawdown</div>
                <div className="text-2xl font-bold text-orange-400">
                  {monitorData.drawdown.toFixed(2)}%
                </div>
                <div className="mt-1 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                    style={{ width: `${Math.min((monitorData.drawdown / selectedAccount.challenges.max_drawdown) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
              </div>
              <div>
                <div className="text-red-400/80 text-xs font-medium uppercase tracking-wider">Daily Loss Limit</div>
                <div className="text-red-400 text-2xl font-bold">{selectedAccount.challenges.daily_loss_limit}%</div>
              </div>
            </div>
            <div className="text-slate-400 text-xs">Maximum allowed daily loss</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              </div>
              <div>
                <div className="text-orange-400/80 text-xs font-medium uppercase tracking-wider">Max Drawdown</div>
                <div className="text-orange-400 text-2xl font-bold">{selectedAccount.challenges.max_drawdown}%</div>
              </div>
            </div>
            <div className="text-slate-400 text-xs">Maximum allowed equity drawdown</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              <div>
                <div className="text-emerald-400/80 text-xs font-medium uppercase tracking-wider">Profit Target</div>
                <div className="text-emerald-400 text-2xl font-bold">{selectedAccount.challenges.profit_target}%</div>
              </div>
            </div>
            <div className="text-slate-400 text-xs">Target profit to pass challenge</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr,320px] gap-6">
          <div className="space-y-6">
            {selectedSymbol ? (
              <>
                <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm">
                  <div className="border-b border-slate-800/50 px-6 py-4 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-white font-bold text-xl">{selectedSymbol.displaySymbol}</div>
                        <div className="text-slate-400 text-sm">{selectedSymbol.description}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-white font-bold text-2xl transition-colors duration-300 ${priceFlash === 'green' ? 'text-emerald-400' : priceFlash === 'red' ? 'text-red-400' : 'text-white'
                          }`}>
                          {quote ? `$${quote.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : <Loader2 className="w-6 h-6 animate-spin text-slate-500" />}
                        </div>
                        {quote && (
                          <div className={`flex items-center gap-1 justify-end ${quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {quote.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="text-sm font-semibold">
                              {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="h-[600px] w-full">
                    <TradingChart symbol={selectedSymbol.symbol} isConnected={true} />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm">
                  <div className="border-b border-slate-800/50 px-6 py-4 bg-slate-900/50">
                    <h3 className="text-lg font-bold text-white">Place Order</h3>
                  </div>

                  <div className="p-6 space-y-5">

                    <div>
                      <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Order Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setOrderSide('long')}
                          className={`py-4 rounded-xl font-semibold transition-all ${orderSide === 'long'
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                            : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                            }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Long
                          </div>
                        </button>
                        <button
                          onClick={() => setOrderSide('short')}
                          className={`py-4 rounded-xl font-semibold transition-all ${orderSide === 'short'
                            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                            : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                            }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <TrendingDown className="w-5 h-5" />
                            Short
                          </div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Margin ($)</label>
                      <input
                        type="number"
                        value={quantity} // Reusing quantity state for Margin amount to minimize state changes, will rename variable logic in placeTrade
                        onChange={(e) => setQuantity(e.target.value)}
                        min="1"
                        step="1"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-lg font-semibold focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                        placeholder="Amount to invest..."
                      />
                      <div className="text-right mt-1 text-slate-500 text-xs">
                        Available: ${selectedAccount.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider">Leverage</label>
                        <span className="text-white font-bold">{leverage}x</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={leverage}
                        onChange={(e) => setLeverage(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-xs text-slate-600 mt-2">
                        <span>1x</span>
                        <span>25x</span>
                        <span>50x</span>
                        <span>75x</span>
                        <span>100x</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-medium">Position Size:</span>
                        <span className="text-white font-bold text-lg">
                          {quote ? `$${(parseFloat(quantity || '0') * leverage).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-medium">Quantity (Units):</span>
                        <span className="text-slate-300 font-mono">
                          {quote ? ((parseFloat(quantity || '0') * leverage) / quote.current).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }) : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-800/50 pt-3 mt-1">
                        <span className="text-slate-400 text-sm font-medium">Liquidation Price:</span>
                        <span className="text-orange-400 font-bold text-lg">
                          {quote ? (
                            orderSide === 'long'
                              ? `$${(quote.current * (1 - 1 / leverage)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : `$${(quote.current * (1 + 1 / leverage)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          ) : '-'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={placeTrade}
                      disabled={!selectedSymbol || !quote || placing || selectedAccount.status !== 'active' || !quantity || parseFloat(quantity) <= 0}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${orderSide === 'long'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25 disabled:from-slate-700 disabled:to-slate-800 disabled:shadow-none'
                        : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/25 disabled:from-slate-700 disabled:to-slate-800 disabled:shadow-none'
                        } disabled:text-slate-500 disabled:cursor-not-allowed`}
                    >
                      {placing ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Executing...
                        </span>
                      ) : (
                        `Place ${orderSide === 'long' ? 'Long' : 'Short'} Order`
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800/50 rounded-2xl mb-4">
                  <TrendingUp className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Select a Trading Pair</h3>
                <p className="text-slate-400">Choose a cryptocurrency from the Market Watch to begin trading</p>
              </div>
            )}

            <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm">
              <div className="border-b border-slate-800/50 px-6 py-4 bg-slate-900/50">
                <h3 className="text-lg font-bold text-white">Open Positions</h3>
              </div>

              <div className="p-6">
                {positions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800/50 rounded-2xl mb-3">
                      <TrendingUp className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-sm">No open positions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {positions.map((position) => (
                      <PositionRow key={position.id} position={position} closePosition={closePosition} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm sticky top-24">
              <div className="border-b border-slate-800/50 px-5 py-4 bg-slate-900/50">
                <h3 className="text-lg font-bold text-white">Market Watch</h3>
              </div>
              <div className="p-3">
                <div className="space-y-1.5">
                  {[
                    { symbol: 'BINANCE:BTCUSDT', display: 'BTC/USDT', name: 'Bitcoin' },
                    { symbol: 'BINANCE:ETHUSDT', display: 'ETH/USDT', name: 'Ethereum' },
                    { symbol: 'BINANCE:BNBUSDT', display: 'BNB/USDT', name: 'Binance Coin' },
                    { symbol: 'BINANCE:SOLUSDT', display: 'SOL/USDT', name: 'Solana' },
                    { symbol: 'BINANCE:XRPUSDT', display: 'XRP/USDT', name: 'Ripple' },
                    { symbol: 'BINANCE:ADAUSDT', display: 'ADA/USDT', name: 'Cardano' },
                    { symbol: 'BINANCE:DOGEUSDT', display: 'DOGE/USDT', name: 'Dogecoin' },
                    { symbol: 'BINANCE:AVAXUSDT', display: 'AVAX/USDT', name: 'Avalanche' },
                    { symbol: 'BINANCE:MATICUSDT', display: 'MATIC/USDT', name: 'Polygon' },
                    { symbol: 'BINANCE:DOTUSDT', display: 'DOT/USDT', name: 'Polkadot' },
                  ].map((crypto) => (
                    <button
                      key={crypto.symbol}
                      onClick={() => {
                        setSelectedSymbol({
                          symbol: crypto.symbol,
                          displaySymbol: crypto.display,
                          description: crypto.name,
                          type: 'crypto'
                        });
                      }}
                      className={`w-full p-3 rounded-lg transition-all text-left ${selectedSymbol?.symbol === crypto.symbol
                        ? 'bg-emerald-500/15 border border-emerald-500/40'
                        : 'bg-slate-950/50 hover:bg-slate-800/50 border border-slate-800/50 hover:border-slate-700'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-semibold text-sm">{crypto.display}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{crypto.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedSymbol?.symbol === crypto.symbol && (
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
