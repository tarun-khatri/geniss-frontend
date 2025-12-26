import { TrendingUp, Shield, Zap, Trophy, CheckCircle, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FAQ } from './FAQ';
import type { Database } from '../lib/database.types';

type Challenge = Database['public']['Tables']['challenges']['Row'];

interface LandingPageProps {
  onGetStarted: () => void;
  onSelectChallenge: (challenge: Challenge) => void;
}

export function LandingPage({ onGetStarted, onSelectChallenge }: LandingPageProps) {
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

  const scrollToOffers = () => {
    const offersSection = document.getElementById('offers-section');
    if (offersSection) {
      offersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
            <span className="text-xl sm:text-2xl font-bold text-white">Geniss<span className="text-emerald-400">Trader</span></span>
          </div>
          <button
            onClick={scrollToOffers}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-base font-semibold rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-32 pb-24 sm:pb-32 lg:pb-40">
        <div className="text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm lg:text-base font-medium mb-8">
            <Zap className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Trade Over 900 Instruments</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl xl:text-8xl font-bold text-white mb-8 leading-tight px-4">
            Get Funded to Trade
            <span className="block text-emerald-400 mt-2 lg:mt-4">Assets Today</span>
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-400 mb-12 leading-relaxed px-4 max-w-3xl mx-auto">
            Pass our trading evaluation and earn 70% profit split on demo accounts.
            No time limits, competitive spreads, and leverage up to 1:100.
          </p>
          <button
            onClick={scrollToOffers}
            className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 lg:px-12 py-4 lg:py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg lg:text-xl rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/20"
          >
            Start Your Challenge
            <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 mt-12 sm:mt-16 lg:mt-20 items-stretch">
          {[
            {
              icon: Shield,
              title: 'No Time Limits',
              description: 'Complete your evaluation at your own pace without deadline pressure'
            },
            {
              icon: TrendingUp,
              title: '70% Profit Split',
              description: 'Keep 70% of your profits with transparent USDT payouts'
            },
            {
              icon: Trophy,
              title: '715+ Crypto Pairs',
              description: 'Trade Bitcoin, Ethereum, and hundreds of other cryptocurrencies'
            }
          ].map((feature, idx) => (
            <div key={idx} className="flex flex-col p-6 lg:p-7 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm hover:border-emerald-500/50 transition-all hover:transform hover:scale-105 h-full">
              <div className="flex justify-center mb-4">
                <feature.icon className="w-10 h-10 lg:w-12 lg:h-12 text-emerald-400" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-white mb-2 text-center">{feature.title}</h3>
              <p className="text-slate-400 text-sm lg:text-base text-center leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="offers-section" className="bg-slate-900/50 backdrop-blur-xl py-20 sm:py-24 lg:py-32 border-y border-slate-800 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6">Choose Your Account Size</h2>
            <p className="text-xl sm:text-2xl lg:text-3xl text-slate-400 mb-3">Simple pricing, powerful trading potential</p>
            <p className="text-base sm:text-lg lg:text-xl text-emerald-400 font-medium">Pay in USDT only</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6 max-w-7xl mx-auto items-stretch">
            {challenges.length === 0 ? (
              <div className="col-span-full text-center text-slate-400 py-12">
                Loading offers...
              </div>
            ) : (
              challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="flex flex-col p-5 lg:p-6 bg-slate-950 border-2 border-slate-800 rounded-xl hover:border-emerald-500 transition-all cursor-pointer group hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10"
                  onClick={() => onSelectChallenge(challenge)}
                >
                  <div className="text-center flex-grow flex flex-col">
                    <div className="mb-4">
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                        Account Size
                      </div>
                      <div className="text-3xl lg:text-4xl font-bold text-white">
                        ${(Number(challenge.account_size) / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div className="mb-5">
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                        Challenge Price (USDT)
                      </div>
                      <div className="text-emerald-400 font-bold text-2xl lg:text-3xl">
                        ${Number(challenge.price)}
                      </div>
                    </div>
                  <div className="space-y-2.5 mb-5 flex-grow">
                    <div className="flex items-center gap-2 text-left">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300 text-xs">Single phase evaluation</span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300 text-xs">{Number(challenge.profit_target)}% profit target</span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300 text-xs">20% max drawdown</span>
                    </div>
                    <div className="flex items-center gap-2 text-left">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300 text-xs">{Number(challenge.profit_split)}% profit split</span>
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
              ))
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6">How It Works</h2>
          <p className="text-xl sm:text-2xl lg:text-3xl text-slate-400 mb-8">Simple steps to get funded</p>
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
            GenissTrader provides a clear path to becoming a funded trader. Follow these four simple steps to start earning real profits on demo accounts.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
          {[
            {
              step: '01',
              title: 'Choose & Pay in USDT',
              description: 'Select your account size and pay the one-time evaluation fee using USDT'
            },
            {
              step: '02',
              title: 'Pass Evaluation',
              description: 'Trade on our demo platform and meet profit targets while following risk rules'
            },
            {
              step: '03',
              title: 'Get Funded Demo Account',
              description: 'Receive your funded demo trading account with full access to 900+ instruments'
            },
            {
              step: '04',
              title: 'Earn & Withdraw USDT',
              description: 'Keep 70% of your profits and withdraw in USDT bi-weekly'
            }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col text-center p-6 lg:p-7 rounded-xl bg-slate-900/30 border border-slate-800 hover:border-emerald-500/50 transition-all hover:transform hover:scale-105 h-full">
              <div className="flex justify-center mb-5">
                <div className="inline-flex items-center justify-center w-16 h-16 lg:w-18 lg:h-18 bg-emerald-500/10 border-2 border-emerald-500 rounded-full text-2xl lg:text-3xl font-bold text-emerald-400">
                  {item.step}
                </div>
              </div>
              <h3 className="text-base lg:text-lg font-bold text-white mb-3">{item.title}</h3>
              <p className="text-sm lg:text-base text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 lg:mt-20 p-8 lg:p-12 bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-emerald-500/20 rounded-3xl">
          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-8 lg:mb-12">Why Choose GenissTrader?</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mt-6">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-10 h-10 lg:w-12 lg:h-12 text-emerald-400 mb-4" />
                <p className="text-slate-300 text-base lg:text-lg">No time pressure to complete challenges</p>
              </div>
              <div className="flex flex-col items-center">
                <CheckCircle className="w-10 h-10 lg:w-12 lg:h-12 text-emerald-400 mb-4" />
                <p className="text-slate-300 text-base lg:text-lg">Fast USDT payments in & out</p>
              </div>
              <div className="flex flex-col items-center">
                <CheckCircle className="w-10 h-10 lg:w-12 lg:h-12 text-emerald-400 mb-4" />
                <p className="text-slate-300 text-base lg:text-lg">Trade 900+ instruments with high leverage</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQ />

      <section className="bg-gradient-to-r from-emerald-900/20 to-emerald-800/20 border-y border-emerald-500/20 py-16 sm:py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 lg:mb-8">Ready to Start Trading?</h2>
          <p className="text-xl sm:text-2xl lg:text-3xl text-slate-300 mb-10 lg:mb-12 max-w-4xl mx-auto">Join thousands of traders who have passed our evaluation</p>
          <button
            onClick={scrollToOffers}
            className="inline-flex items-center justify-center gap-2 px-10 sm:px-12 lg:px-14 py-4 lg:py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg lg:text-2xl rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/20"
          >
            Get Started Now
            <ChevronRight className="w-6 h-6 lg:w-7 lg:h-7" />
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-slate-500">
          <p className="mb-2 text-sm sm:text-base">All trading is demo only - no real capital involved</p>
          <p className="text-sm sm:text-base">&copy; 2024 GenissTrader. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
