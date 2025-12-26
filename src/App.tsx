import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Trade } from './components/Trade';
import { AuthModal } from './components/AuthModal';
import { PaymentModal } from './components/PaymentModal';
import { ChallengeSelection } from './components/ChallengeSelection';
import { PriceListener } from './components/PriceListener';
import { RiskListener } from './components/RiskListener';
import type { Database } from './lib/database.types';

type Challenge = Database['public']['Tables']['challenges']['Row'];

function TradeRouter({
  showChallengeSelection,
  onCloseSelection,
  onSelectChallenge,
  refreshDashboard,
  onNewChallenge,
  onShowAuth,
}: {
  showChallengeSelection: boolean;
  onCloseSelection: () => void;
  onSelectChallenge: (challenge: Challenge) => void;
  refreshDashboard: number;
  onNewChallenge: () => void;
  onShowAuth: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('account');
  const [autoRedirecting, setAutoRedirecting] = useState(true);

  useEffect(() => {
    // Auto-redirect removed to allow access to Dashboard
    setAutoRedirecting(false);
  }, []);

  if (!user) {
    return <Trade />;
  }

  if (autoRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (showChallengeSelection) {
    return (
      <ChallengeSelection
        onClose={onCloseSelection}
        onSelectChallenge={onSelectChallenge}
      />
    );
  }

  if (accountId) {
    return <Trade />;
  }

  return (
    <Dashboard
      key={refreshDashboard}
      onNewChallenge={onNewChallenge}
    />
  );
}

function AppContent() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showChallengeSelection, setShowChallengeSelection] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [refreshDashboard, setRefreshDashboard] = useState(0);

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleNewChallenge = () => {
    setShowChallengeSelection(true);
  };

  const handleSelectChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setShowChallengeModal(true);
    setShowChallengeSelection(false);
  };

  const handleChallengeSuccess = () => {
    setRefreshDashboard(prev => prev + 1);
    setShowChallengeSelection(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              onGetStarted={handleGetStarted}
              onSelectChallenge={handleSelectChallenge}
            />
          }
        />
        <Route
          path="/trade"
          element={
            <TradeRouter
              showChallengeSelection={showChallengeSelection}
              onCloseSelection={() => setShowChallengeSelection(false)}
              onSelectChallenge={handleSelectChallenge}
              refreshDashboard={refreshDashboard}
              onNewChallenge={handleNewChallenge}
              onShowAuth={() => {
                setAuthMode('signin');
                setShowAuthModal(true);
              }}
            />
          }
        />
      </Routes>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      {showChallengeModal && (
        <PaymentModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          challenge={selectedChallenge}
          onSuccess={handleChallengeSuccess}
        />
      )}
      <PriceListener />
      <RiskListener />
    </>
  );
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
