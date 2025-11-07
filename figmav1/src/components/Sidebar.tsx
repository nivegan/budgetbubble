import {
  BarChart2,
  Wallet,
  Settings,
  Target,
  Landmark,
  ArrowLeftRight,
  Gift,
  Repeat,
  Package, // New icon for combined page
  PiggyBank, // New icon for combined page
} from 'lucide-react';
import { BubbleLogo } from './BubbleLogo';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  
  // New, consolidated nav items
  const navItems = [
    { name: 'Dashboard', icon: BarChart2 },
    { name: 'Transactions', icon: Wallet },
    { name: 'Savings & Goals', icon: PiggyBank }, // <-- New consolidated page
    { name: 'Assets & Ledgers', icon: Package },   // <-- New consolidated page
    { name: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#34495e] text-slate-300 flex flex-col h-screen p-4 border-r border-[#577189]/50">
      <div className="flex items-center gap-2 mb-8 px-2">
        <BubbleLogo className="h-8 w-8" />
        <span className="text-white text-2xl font-bold">Bubble</span>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onViewChange(item.name)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === item.name
                ? 'bg-[#69d2bb] text-[#2c3e50] font-semibold'
                : 'hover:bg-[#3d5a80]/60 text-slate-300'
            }`}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      
      {/* You can add a user/logout section here later */}
      {/* <div className="mt-auto"> ... </div> */}
    </div>
  );
}