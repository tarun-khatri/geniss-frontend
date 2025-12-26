import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, LogOut, Plus, Activity, TrendingDown, DollarSign, Target, AlertTriangle, BarChart3, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserAccount = Database['public']['Tables']['user_accounts']['Row'];
type Challenge = Database['public']['Tables']['challenges']['Row'];
type UserAccountWithChallenge = UserAccount & { challenge: Challenge };

interface DashboardProps {
  onNewChallenge: () => void;
}

export function Dashboard({ onNewChallenge }: DashboardProps) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<UserAccountWithChallenge[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<UserAccountWithChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
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

      if (error) {
        console.error('Error fetching accounts:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const accountsWithChallenge = data.map((account: any) => ({
          ...account,
          challenge: account.challenges
        }));
        setAccounts(accountsWithChallenge);
        if (accountsWithChallenge.length > 0 && !selectedAccount) {
          setSelectedAccount(accountsWithChallenge[0]);
        }
      }
    } catch (err) {
      console.error('Exception fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'passed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const calculateProgress = (account: UserAccountWithChallenge) => {
    const profitPercent = (account.profit_loss / account.initial_balance) * 100;
    return (profitPercent / account.challenge.profit_target) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
            <span className="text-lg sm:text-xl font-bold text-white">Geniss<span className="text-emerald-400">Trader</span></span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-slate-400 text-xs sm:text-sm hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 lg:mb-12">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Trading Dashboard</h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg">Manage your challenges and track performance</p>
          </div>
          <button
            onClick={onNewChallenge}
            className="flex items-center justify-center gap-2 px-6 sm:px-7 lg:px-8 py-2.5 lg:py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm lg:text-base font-semibold rounded-xl transition-colors w-full lg:w-auto shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            New Challenge
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-24 lg:py-32">
            <div className="inline-flex items-center justify-center w-24 h-24 lg:w-32 lg:h-32 bg-slate-800 rounded-full mb-8">
              <BarChart3 className="w-12 h-12 lg:w-16 lg:h-16 text-slate-600" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">No Active Challenges</h2>
            <p className="text-lg lg:text-xl text-slate-400 mb-8">Start your first trading challenge to begin</p>
            <button
              onClick={onNewChallenge}
              className="inline-flex items-center gap-2 px-8 lg:px-10 py-4 lg:py-5 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
              Start Challenge
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-white mb-6">Your Accounts</h2>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className={`p-5 lg:p-6 rounded-xl border cursor-pointer transition-all ${selectedAccount?.id === account.id
                      ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-white font-semibold text-lg">{account.challenge.name}</div>
                      <div className="text-base text-slate-400">Phase {account.current_phase}</div>
                    </div>
                    <span className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${getStatusColor(account.status)}`}>
                      {account.status}
                    </span>
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold text-white mb-2">
                    ${account.balance.toLocaleString()}
                  </div>
                  <div className={`text-base lg:text-lg font-semibold mb-4 ${account.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {account.profit_loss >= 0 ? '+' : ''}${account.profit_loss.toLocaleString()} ({((account.profit_loss / account.initial_balance) * 100).toFixed(2)}%)
                  </div>
                  {account.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trade?account=${account.id}`);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Trade Now
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {selectedAccount && (
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 text-base mb-3">
                      <DollarSign className="w-5 h-5" />
                      Balance
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-white truncate" title={`$${selectedAccount.balance.toLocaleString()}`}>
                      ${selectedAccount.balance.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 text-base mb-3">
                      <TrendingUp className="w-5 h-5" />
                      P&L
                    </div>
                    <div className={`text-2xl lg:text-3xl font-bold truncate ${selectedAccount.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedAccount.profit_loss >= 0 ? '+' : ''}${selectedAccount.profit_loss.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 text-base mb-3">
                      <Activity className="w-5 h-5" />
                      Today's P&L
                    </div>
                    <div className={`text-2xl lg:text-3xl font-bold truncate ${selectedAccount.daily_profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedAccount.daily_profit_loss >= 0 ? '+' : ''}${selectedAccount.daily_profit_loss.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 text-base mb-3">
                      <BarChart3 className="w-5 h-5" />
                      Trades
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-white">
                      {selectedAccount.total_trades}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
                  <h3 className="text-2xl font-semibold text-white mb-6">Challenge Progress</h3>

                  <div className="mb-8">
                    <div className="flex justify-between text-base mb-3">
                      <span className="text-slate-400">Profit Target</span>
                      <span className="text-white font-semibold text-lg">
                        {((selectedAccount.profit_loss / selectedAccount.initial_balance) * 100).toFixed(2)}% / {selectedAccount.challenge.profit_target}%
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(calculateProgress(selectedAccount), 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <Target className="w-4 h-4" />
                        Phase
                      </div>
                      <div className="text-xl font-bold text-white">
                        {selectedAccount.current_phase} / {selectedAccount.challenge.phase_count}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Max Drawdown
                      </div>
                      <div className="text-xl font-bold text-white">
                        {selectedAccount.challenge.max_drawdown}%
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <TrendingDown className="w-4 h-4" />
                        Daily Limit
                      </div>
                      <div className="text-xl font-bold text-white">
                        {selectedAccount.challenge.daily_loss_limit}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Trading Statistics</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-slate-400 text-sm mb-1">Win Rate</div>
                      <div className="text-2xl font-bold text-white">
                        {selectedAccount.total_trades > 0
                          ? ((selectedAccount.winning_trades / selectedAccount.total_trades) * 100).toFixed(1)
                          : '0'}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">Winning Trades</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {selectedAccount.winning_trades}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">Losing Trades</div>
                      <div className="text-2xl font-bold text-red-400">
                        {selectedAccount.losing_trades}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedAccount.status === 'active' && (
                  <button
                    onClick={() => navigate(`/trade?account=${selectedAccount.id}`)}
                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xl font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                  >
                    <TrendingUp className="w-6 h-6" />
                    Open Trading Terminal
                    <ArrowRight className="w-6 h-6" />
                  </button>
                )}

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-400 text-sm">
                    Demo Trading: All trades are simulated. No real capital is at risk.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
