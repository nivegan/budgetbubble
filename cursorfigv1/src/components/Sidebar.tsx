import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Home,
  ArrowLeftRight,
  Wallet,
  Target,
  TrendingUp,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { BubbleLogo } from './BubbleLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface SidebarProps {
  profile: any;
  onLogout: () => void;
}

export function Sidebar({ profile, onLogout }: SidebarProps) {
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
    { name: 'Pockets', href: '/pockets', icon: Target },
    { name: 'Holdings', href: '/holdings', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="w-64 h-full bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 flex items-center gap-2">
        <BubbleLogo />
        <h1 className="text-xl font-bold text-white">BudgetBubble</h1>
      </div>
      <div className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.name}
            variant={location.pathname === item.href ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${
              location.pathname === item.href
                ? 'bg-emerald-400 text-slate-900 hover:bg-emerald-500'
                : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'
            }`}
            asChild
          >
            <Link to={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Link>
          </Button>
        ))}
      </div>
      <div className="p-4 border-t border-slate-700">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-slate-300 hover:bg-slate-700 hover:text-slate-100">
              <div className="flex items-center gap-2 truncate">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>
                    {profile?.name ? profile.name[0].toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{profile?.name || profile?.email}</span>
              </div>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700 text-slate-100">
            <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem onClick={onLogout} className="focus:bg-red-500/20 focus:text-red-300">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}