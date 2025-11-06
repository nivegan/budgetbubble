import { useEffect, useState } from 'react';
import { transactionAPI, holdingsAPI, goalAPI } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { TrendingUp, Wallet, Target, DollarSign, BarChart } from 'lucide-react';
import { Bar } from 'recharts';

interface DashboardProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

export function Dashboard({ accessToken, householdId, isPersonalView }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCash: 0,
    totalHoldings: 0,
    totalPockets: 0,
    netWorth: 0,
    availableToAssign: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, [householdId, isPersonalView, accessToken]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get all transactions to calculate cash
      const { transactions } = await transactionAPI.getAll(householdId, isPersonalView, accessToken);
      const income = transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
      const expenses = transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalCash = income - expenses;

      // 2. Get all holdings to calculate investment value
      const { holdings } = await holdingsAPI.getAll(householdId, isPersonalView, accessToken);
      const totalHoldings = holdings.reduce((sum: number, h: any) => sum + h.currentValue, 0);

      // 3. Get all pockets (goals) to calculate assigned money
      let totalPockets = 0;
      let availableToAssign = totalCash;

      // Pockets are household-only
      if (!isPersonalView) {
        const { goals: pockets } = await goalAPI.getAll(householdId, accessToken);
        totalPockets = pockets
          .filter((p: any) => p.status === 'active')
          .reduce((sum: number, p: any) => sum + p.currentAmount, 0);
        availableToAssign = totalCash - totalPockets;
      }

      // 4. Calculate Net Worth
      const netWorth = totalCash + totalHoldings;

      setStats({
        totalCash,
        totalHoldings,
        totalPockets,
        netWorth,
        availableToAssign,
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Net Worth */}
        <Card className="bg-slate-800 border-slate-700 col-span-1 md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Net Worth</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-400">{formatCurrency(stats.netWorth)}</div>
            <p className="text-xs text-slate-400 mt-2">Total Cash + Total Holdings</p>
          </CardContent>
        </Card>

        {/* Total Cash */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Cash</CardTitle>
            <Wallet className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalCash)}</div>
            <p className="text-xs text-slate-400 mt-2">Based on all transactions</p>
          </CardContent>
        </Card>

        {/* Total Holdings */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Holdings</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalHoldings)}</div>
            <p className="text-xs text-slate-400 mt-2">{isPersonalView ? "Your personal assets" : "Household assets"}</p>
          </CardContent>
        </Card>

        {/* Available to Assign */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Available to Assign</CardTitle>
            <Wallet className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.availableToAssign)}</div>
            <p className="text-xs text-slate-400 mt-2">
              {isPersonalView ? "Switch to Household view" : "Total Cash - Pockets"}
            </p>
          </CardContent>
        </Card>

        {/* Total in Pockets */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total in Pockets</CardTitle>
            <Target className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalPockets)}</div>
            <p className="text-xs text-slate-400 mt-2">
              {isPersonalView ? "Switch to Household view" : "Money assigned to goals"}
            </p>
          </CardContent>
        </Card>

      </div>
      
      {/* TODO: Add charts or recent transactions here */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-base font-medium text-slate-300">Future Development</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-slate-400">
            <BarChart className="h-8 w-8 mr-4" />
            <p>Cash Flow Charts and Recent Transactions will be shown here.</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700 col-span-1 md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}