import { X, TrendingUp, Loader2, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Database } from '../lib/database.types';

declare global {
  interface Window {
    atlos?: {
      Pay: (config: {
        merchantId: string;
        orderId: string;
        orderAmount: number;
        orderCurrency?: string;
        onSuccess?: () => void;
        onCompleted?: () => void;
        onCanceled?: () => void;
      }) => void;
    };
  }
}

type Challenge = Database['public']['Tables']['challenges']['Row'];

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  onSuccess: () => void;
}

export function PaymentModal({ isOpen, onClose, challenge, onSuccess }: PaymentModalProps) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !challenge) return null;

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!window.atlos) {
      setError('Payment system not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let currentUserId = user?.id;

      if (!user) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: email,
              password: password,
            });

            if (signInError) {
              throw new Error('Invalid email or password');
            }

            currentUserId = signInData.user?.id;
          } else {
            throw signUpError;
          }
        } else {
          currentUserId = authData.user?.id;

          if (currentUserId) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: currentUserId,
                email: email,
              });

            if (profileError && !profileError.message.includes('duplicate')) {
              console.error('Profile creation error:', profileError);
            }
          }
        }
      }

      if (!currentUserId) {
        throw new Error('Authentication failed');
      }

      const orderId = `${challenge.id.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const { data: userAccount, error: accountError } = await supabase
        .from('user_accounts')
        .insert({
          user_id: currentUserId,
          challenge_id: challenge.id,
          status: 'pending',
          current_phase: 1,
          balance: challenge.account_size,
          initial_balance: challenge.account_size,
          profit_loss: 0,
          daily_profit_loss: 0,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: currentUserId,
          challenge_id: challenge.id,
          user_account_id: userAccount.id,
          invoice_id: orderId,
          order_id: orderId,
          amount: challenge.price,
          status: 'pending',
          user_email: email,
        });

      if (paymentError) throw paymentError;

      const merchantId = import.meta.env.VITE_ATLOS_MERCHANT_ID;
      if (!merchantId) {
        throw new Error('Payment configuration missing');
      }

      window.atlos.Pay({
        merchantId: merchantId,
        orderId: orderId,
        orderAmount: challenge.price,
        orderCurrency: 'USD',
        onSuccess: () => {
          onSuccess();
          onClose();
          navigate('/trade');
        },
        onCompleted: () => {
          onSuccess();
          onClose();
          navigate('/trade');
        },
        onCanceled: () => {
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to create payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{challenge.name}</h2>
          <div className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-2">
            ${challenge.price} USDT
          </div>
          <p className="text-slate-400 text-sm sm:text-base">One-time evaluation fee</p>
        </div>

        <form onSubmit={handleProceedToPayment} className="space-y-6">
          <div className="p-4 sm:p-6 bg-slate-950 border border-slate-800 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-white">Challenge Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-400 text-sm mb-1">Account Size</div>
                <div className="text-xl font-bold text-white">
                  ${challenge.account_size.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Profit Split</div>
                <div className="text-xl font-bold text-emerald-400">
                  {challenge.profit_split}%
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Profit Target</div>
                <div className="text-xl font-bold text-white">
                  {challenge.profit_target}%
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Max Drawdown</div>
                <div className="text-xl font-bold text-white">
                  {challenge.max_drawdown}%
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              required
              disabled={loading || !!user}
            />
            <p className="text-slate-400 text-sm mt-2">
              {user ? 'Using your account email' : 'Payment confirmation will be sent to this email'}
            </p>
          </div>

          {!user && (
            <div>
              <label className="block text-white font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min. 6 characters)"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-slate-400 text-sm mt-2">
                Use this password to access your trading account
              </p>
            </div>
          )}

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-emerald-400 text-sm font-medium mb-2">
              Secure Crypto Payment
            </p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Pay with USDT and other cryptocurrencies</li>
              <li>• Secure payment processing via ATLOS</li>
              <li>• Account activated instantly after payment</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Payment...
              </>
            ) : (
              <>
                Proceed to Payment
                <CreditCard className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-slate-500 text-xs">
            Secure crypto payment via ATLOS
          </p>
        </form>
      </div>
    </div>
  );
}
