import { LayoutDashboard, Wallet, Target, Settings, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { BubbleLogo } from './BubbleLogo';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ currentTab, onTabChange, onLogout }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#34495e] border-r border-[#577189] flex flex-col h-screen shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-[#577189]">
        <div className="flex items-center gap-3">
          <BubbleLogo size={40} />
          <h1 className="text-[#69d2bb]">BudgetBubble</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentTab === tab.id
                  ? 'bg-[#69d2bb]/20 text-[#69d2bb] shadow-md border border-[#69d2bb]/30'
                  : 'text-[#c1d3e0] hover:bg-[#3d5a80]'
              }`}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[#577189]">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start text-[#c1d3e0] hover:bg-[#3d5a80] hover:text-white"
        >
          <LogOut size={20} className="mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
