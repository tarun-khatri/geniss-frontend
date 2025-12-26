import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is GenissTrader?',
    answer: 'GenissTrader is a proprietary trading evaluation platform where traders can prove their skills and get access to funded demo accounts. After passing our evaluation, you can trade with our capital and keep up to 70% of the profits.'
  },
  {
    question: 'How does the evaluation process work?',
    answer: 'Choose your account size and pay a one-time evaluation fee in USDT. Trade on our demo platform following the rules (profit targets, daily loss limits, max drawdown). Once you hit the profit target while following all rules, you pass and receive a funded demo account.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept USDT (Tether) only for all challenge purchases. This ensures fast, secure, and borderless payments for traders worldwide.'
  },
  {
    question: 'How do I receive my payouts?',
    answer: 'All payouts are made in USDT directly to your crypto wallet. Payouts are processed within 1-3 business days after your withdrawal request is approved.'
  },
  {
    question: 'Are there any time limits for the evaluation?',
    answer: 'No! Unlike other prop firms, we believe in giving you the freedom to trade at your own pace. There are no minimum or maximum time limits. Take as long as you need to meet the profit target.'
  },
  {
    question: 'What trading rules must I follow?',
    answer: 'You must follow these rules: 1) Daily loss limit (5%), 2) Maximum drawdown (20%), 3) Minimum trading days (none), 4) No prohibited trading strategies (we allow most strategies including news trading and holding over weekends).'
  },
  {
    question: 'What can I trade?',
    answer: 'You can trade over 900 instruments including 715+ cryptocurrency pairs (Bitcoin, Ethereum, Solana, etc.), major forex pairs, commodities, indices, and stocks. All with leverage up to 1:100.'
  },
  {
    question: 'Is this real money trading?',
    answer: 'No, all trading is done on demo accounts. However, your performance is real and directly tied to your profit split. We pay you real USDT based on your demo trading profits.'
  },
  {
    question: 'What happens if I fail the evaluation?',
    answer: 'If you breach any of the trading rules (daily loss limit or max drawdown), your evaluation will be terminated. You can purchase a new challenge at any time to try again.'
  },
  {
    question: 'Can I have multiple accounts?',
    answer: 'Yes! You can purchase and manage multiple challenge accounts simultaneously. Many successful traders run multiple accounts to diversify their strategies.'
  },
  {
    question: 'What is the profit split?',
    answer: 'You keep 70% of all profits generated on your funded demo account. For example, if you make $10,000 in profit, you receive $7,000 in USDT and we keep $3,000.'
  },
  {
    question: 'How often can I request withdrawals?',
    answer: 'You can request withdrawals bi-weekly (every 14 days) once you have an active funded account. There is no minimum withdrawal amount.'
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 sm:py-24 lg:py-32 bg-slate-900/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <p className="text-xl sm:text-2xl lg:text-3xl text-slate-400">Everything you need to know about GenissTrader</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-8 lg:px-10 py-6 lg:py-8 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
              >
                <span className="text-lg sm:text-xl lg:text-2xl font-semibold text-white pr-6">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-6 h-6 lg:w-7 lg:h-7 text-emerald-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 lg:w-7 lg:h-7 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-8 lg:px-10 pb-6 lg:pb-8 pt-2">
                  <p className="text-slate-400 text-base lg:text-lg leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
