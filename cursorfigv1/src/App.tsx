import { useState, useEffect } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/LoginPage';
import { HouseholdSetup } from './components/HouseholdSetup';
import { Dashboard } from './components/Dashboard'; // <-- NEW
import { Transactions } from './components/Transactions';
import { Pockets } from './components/Pockets'; // <-- RENAMED
import { Holdings } from './components/Holdings';
import { Settings } from './components/Settings';
import { userAPI, householdAPI } from './utils/api';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { ViewToggle } from './components/ViewToggle';
import { AlertCircle, Home, LogOut, Settings as SettingsIcon, User, Users } from 'lucide-react';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPersonalView, setIsPersonalView] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadData(session.access_token);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadData(session.access_token);
      } else {
        setProfile(null);
        setHousehold(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (token: string) => {
    setLoading(true);
    try {
      const userProfile = await userAPI.getProfile(token);
      setProfile(userProfile);
      
      const households = await householdAPI.getMy(token);
      if (households && households.length > 0) {
        setHousehold(households[0]); // Auto-select first household
      } else {
        setHousehold(null); // No household found
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Handle error, e.g., sign out user if token is invalid
      if ((error as Error).message.includes('401')) {
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="bg-slate-900 text-slate-100 h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <LoginPage supabaseClient={supabase} />;
  }

  if (!household) {
    return <HouseholdSetup 
            accessToken={session.access_token} 
            onHouseholdCreated={() => loadData(session.access_token)} 
          />;
  }
  
  const mainContentProps = {
    accessToken: session.access_token,
    householdId: household.id,
    isPersonalView,
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <Sidebar profile={profile} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-auto">
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700">
          <div className="text-lg font-semibold text-white">
            <CurrentPageTitle />
          </div>
          <ViewToggle 
            isPersonalView={isPersonalView} 
            setIsPersonalView={setIsPersonalView} 
          />
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard {...mainContentProps} />} />
            <Route path="/transactions" element={<Transactions {...mainContentProps} />} />
            <Route path="/pockets" element={<Pockets {...mainContentProps} setIsPersonalView={setIsPersonalView} />} />
            <Route path="/holdings" element={<Holdings {...mainContentProps} />} />
            <Route path="/settings" element={<Settings {...mainContentProps} profile={profile} household={household} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function CurrentPageTitle() {
  const location = useLocation();
  switch (location.pathname) {
    case '/': return 'Dashboard';
    case '/transactions': return 'Transactions';
    case '/pockets': return 'Pockets';
    case '/holdings': return 'Assets & Investments';
    case '/settings': return 'Settings';
    default: return 'Dashboard';
  }
}