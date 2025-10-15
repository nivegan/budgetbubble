import { useEffect, useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { HouseholdSetup } from './components/HouseholdSetup';
import { Sidebar } from './components/Sidebar';
import { ViewToggle } from './components/ViewToggle';
import { Dashboard } from './components/Dashboard';
import { Finances } from './components/Finances';
import { Goals } from './components/Goals';
import { Settings } from './components/Settings';
import { getSession, signOut } from './utils/auth';
import { householdAPI, userAPI } from './utils/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [household, setHousehold] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isPersonalView, setIsPersonalView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadUserData();
    }
  }, [isAuthenticated, accessToken]);

  /**
   * Check if user has an active session
   */
  const checkAuth = async () => {
    try {
      const { session, user } = await getSession();
      if (session && user) {
        setIsAuthenticated(true);
        setAccessToken(session.access_token);
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load user profile and household data
   */
  const loadUserData = async () => {
    try {
      const [userProfile, householdData] = await Promise.all([
        userAPI.getProfile(accessToken),
        householdAPI.getMy(accessToken),
      ]);

      setUser(userProfile.user);
      setHousehold(householdData.household);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  /**
   * Handle successful login
   */
  const handleLoginSuccess = (token: string, id: string) => {
    setAccessToken(token);
    setUserId(id);
    setIsAuthenticated(true);
  };

  /**
   * Handle household setup completion
   */
  const handleHouseholdSetupComplete = () => {
    loadUserData();
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setAccessToken('');
    setUserId('');
    setUser(null);
    setHousehold(null);
    setCurrentTab('dashboard');
    setIsPersonalView(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#2c3e50] flex items-center justify-center">
        <div className="text-[#c1d3e0]">Loading BudgetBubble...</div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated but no household - show setup
  if (!household) {
    return (
      <HouseholdSetup
        accessToken={accessToken}
        onComplete={handleHouseholdSetupComplete}
      />
    );
  }

  // Main application
  return (
    <div className="flex h-screen bg-[#2c3e50]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with View Toggle */}
        <div className="bg-[#3d5a80] border-b border-[#577189] px-6 py-4 flex justify-between items-center shadow-md">
          <div className="text-white">
            <span className="text-[#c1d3e0]">Household:</span>{' '}
            <span>{household.name}</span>
          </div>
          <ViewToggle
            isPersonalView={isPersonalView}
            onToggle={setIsPersonalView}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#2c3e50]">
          <div className="max-w-7xl mx-auto p-6">
            {currentTab === 'dashboard' && (
              <Dashboard
                accessToken={accessToken}
                householdId={household.id}
                isPersonalView={isPersonalView}
              />
            )}
            
            {currentTab === 'finances' && (
              <Finances
                accessToken={accessToken}
                householdId={household.id}
                isPersonalView={isPersonalView}
              />
            )}
            
            {currentTab === 'goals' && (
              <Goals
                accessToken={accessToken}
                householdId={household.id}
                isPersonalView={isPersonalView}
              />
            )}
            
            {currentTab === 'settings' && (
              <Settings
                accessToken={accessToken}
                user={user}
                household={household}
                onHouseholdUpdate={loadUserData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
