import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/info';
import { Session } from '@supabase/supabase-js';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { DashboardNew } from './components/DashboardNew';
import { Transactions } from './components/Transactions';
import { SettingsNew } from './components/SettingsNew';
import { HouseholdSetup } from './components/HouseholdSetup';
import { ViewToggle } from './components/ViewToggle';
import { householdAPI } from './utils/api';
import { SavingsGoals } from './components/SavingsGoals';   // <-- IMPORT NEW
import { AssetsLedgers } from './components/AssetsLedgers'; // <-- IMPORT NEW

// Remove individual component imports if they are now inside consolidated pages
// (e.g., Pockets, Subscriptions, Holdings, IouTracker, GiftTracker)

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('Dashboard');
  const [isPersonalView, setIsPersonalView] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session);
      } else {
        setLoading(false);
        setUser(null);
        setHousehold(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (session: Session) => {
    setLoading(true);
    try {
      const { data, error } = await householdAPI.getHousehold(session.access_token);
      
      if (error) throw error;
      
      if (data.household) {
        setHousehold(data.household);
        setUser(data.user);
      } else {
        // No household, user needs to set one up
        setUser(data.user);
        setHousehold(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onHouseholdUpdate = () => {
    if (session) fetchData(session);
  };

  const renderView = () => {
    if (!household || !user || !session) return null;

    const props = {
      accessToken: session.access_token,
      householdId: household.id,
      isPersonalView,
      // Pass the household object or currency to all components that need it
      household: household,
      householdCurrency: household.currency || 'USD',
    };

    switch (currentView) {
      case 'Dashboard':
        return <DashboardNew {...props} />;
      case 'Transactions':
        return <Transactions {...props} />;
      
      // --- NEW CONSOLIDATED VIEWS ---
      case 'Savings & Goals':
        return <SavingsGoals {...props} onToggleView={() => setIsPersonalView(false)} />;
      case 'Assets & Ledgers':
        return <AssetsLedgers {...props} />;
      // --- END NEW VIEWS ---

      case 'Settings':
        return <SettingsNew {...props} user={user} onHouseholdUpdate={onHouseholdUpdate} />;
      default:
        return <DashboardNew {...props} />;
    }
  };

  if (loading) {
    return <div className="bg-[#2c3e50] h-screen w-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  if (!household) {
    return <HouseholdSetup user={user} onSetupComplete={onHouseholdUpdate} />;
  }

  return (
    <div className="flex h-screen bg-[#2c3e50]">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#2c3e50] p-4 flex justify-end border-b border-[#577189]/50">
          <ViewToggle
            isPersonalView={isPersonalView}
            onToggle={setIsPersonalView}
          />
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {renderView()}
        </div>
      </main>
    </div>
  );
}