import { X, CheckCircle, TrendingUp, Shield, Zap } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Database } from '../lib/database.types';

type Challenge = Database['public']['Tables']['challenges']['Row'];

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  onSuccess: () => void;
}

export function ChallengeModal({ isOpen, onClose, challenge, onSuccess }: ChallengeModalProps) {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !challenge) return null;

  const handlePurchase = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { error: accountError } = await supabase
        .from('user_accounts')
        .insert({
          user_id: user.id,
          challenge_id: challenge.id,
          balance: challenge.account_size,
          initial_balance: challenge.account_size,
          status: 'active',
          current_phase: 1,
        });

      if (accountError) throw accountError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{challenge.name}</h2>
          <div className="text-4xl font-bold text-emerald-400 mb-2">
            ${challenge.price} USDT
          </div>
          <p className="text-slate-400">One-time evaluation fee (USDT only)</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Account Size</div>
            <div className="text-2xl font-bold text-white">
              ${challenge.account_size.toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Profit Split</div>
            <div className="text-2xl font-bold text-emerald-400">
              {challenge.profit_split}%
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Profit Target</div>
            <div className="text-2xl font-bold text-white">
              {challenge.profit_target}%
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-slate-400 text-sm mb-1">Phases</div>
            <div className="text-2xl font-bold text-white">
              {challenge.phase_count}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-white">Challenge Rules</h3>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-medium">Daily Loss Limit</div>
                <div className="text-sm text-slate-400">Maximum {challenge.daily_loss_limit}% loss per day</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-medium">Maximum Drawdown</div>
                <div className="text-sm text-slate-400">Account cannot drop more than {challenge.max_drawdown}% from initial balance</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-medium">Minimum Trading Days</div>
                <div className="text-sm text-slate-400">{challenge.min_trading_days > 0 ? `At least ${challenge.min_trading_days} days` : 'No minimum'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-medium">Leverage</div>
                <div className="text-sm text-slate-400">Up to {challenge.leverage} on all instruments</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-blue-400 font-medium text-sm">No Time Limits</div>
              <div className="text-sm text-slate-400">Complete the challenge at your own pace</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-emerald-400 font-medium text-sm">Demo Trading Only</div>
              <div className="text-sm text-slate-400">All trading is simulated - no real capital at risk</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold text-lg rounded-lg transition-colors"
        >
          {loading ? 'Creating Account...' : `Start Challenge - $${challenge.price} USDT`}
        </button>

        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-center text-emerald-400 text-sm font-medium mb-1">
            Payment Method: USDT Only
          </p>
          <p className="text-center text-slate-400 text-xs">
            All payouts are processed in USDT
          </p>
        </div>

        <p className="text-center text-slate-500 text-sm mt-4">
          By starting this challenge, you agree to follow all trading rules and guidelines
        </p>
      </div>
    </div>
  );
}
