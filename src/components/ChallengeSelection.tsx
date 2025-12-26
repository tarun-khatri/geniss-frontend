import { useState, useEffect } from 'react';
import { X, TrendingUp, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Challenge = Database['public']['Tables']['challenges']['Row'];

interface ChallengeSelectionProps {
  onClose: () => void;
  onSelectChallenge: (challenge: Challenge) => void;
}

export function ChallengeSelection({ onClose, onSelectChallenge }: ChallengeSelectionProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('account_size', { ascending: true });

    if (data && !error) {
      setChallenges(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm lg:text-base font-medium mb-8">
            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Start a New Challenge</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6">Choose Your Account Size</h1>
          <p className="text-xl sm:text-2xl lg:text-3xl text-slate-400 mb-3">Simple pricing, powerful trading potential</p>
          <p className="text-base sm:text-lg lg:text-xl text-emerald-400 font-medium">Pay in USDT only</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6 max-w-7xl mx-auto mb-16 lg:mb-20 items-stretch">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="flex flex-col p-5 lg:p-6 bg-slate-950 border-2 border-slate-800 rounded-xl hover:border-emerald-500 transition-all cursor-pointer group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10"
              onClick={() => onSelectChallenge(challenge)}
            >
              <div className="text-center flex-grow flex flex-col">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-4">
                  ${(challenge.account_size / 1000).toFixed(0)}K
                </div>
                <div className="text-emerald-400 font-bold text-2xl lg:text-3xl mb-2">
                  ${challenge.price} USDT
                </div>
                <div className="text-slate-500 text-xs mb-5">One-time fee</div>
                <div className="space-y-2.5 mb-5 flex-grow">
                  <div className="flex items-center gap-2 text-left">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs">Single phase evaluation</span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs">{challenge.profit_target}% profit target</span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs">20% max drawdown</span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs">{challenge.profit_split}% profit split (USDT)</span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs">No minimum days</span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs">Leverage up to 1:100</span>
                  </div>
                </div>
                <button className="w-full py-3 bg-slate-800 group-hover:bg-emerald-500 text-white font-bold text-sm rounded-lg transition-colors">
                  Get Started
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
            <p className="text-emerald-400 text-sm sm:text-base font-medium mb-1">
              Payment & Payouts in USDT Only
            </p>
            <p className="text-slate-400 text-xs sm:text-sm">
              Fast, secure, and borderless transactions
            </p>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-center">
            <p className="text-slate-300 text-xs sm:text-sm">
              All trading is demo only - no real capital is involved
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
