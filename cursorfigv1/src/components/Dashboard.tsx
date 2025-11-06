import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar as CalendarIcon } from 'lucide-react';
import { transactionAPI, holdingsAPI } from '../utils/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

export function Dashboard({ accessToken, householdId, isPersonalView }: DashboardProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [householdId, isPersonalView]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txData, holdingData] = await Promise.all([
        transactionAPI.getAll(householdId, isPersonalView, accessToken),
        isPersonalView ? { holdings: [] } : holdingsAPI.getAll(householdId, accessToken),
      ]);
      
      setTransactions(txData.transactions || []);
      setHoldings(holdingData.holdings || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions by date range
  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'fy':
        // Fiscal year (assuming Jan-Dec, adjust as needed)
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1-year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'custom':
        if (!customStartDate) return transactions;
        startDate = customStartDate;
        break;
      case 'all':
      default:
        return transactions;
    }

    return transactions.filter(t => {
      const txDate = new Date(t.date);
      if (dateRange === 'custom' && customEndDate) {
        return txDate >= startDate && txDate <= customEndDate;
      }
      return txDate >= startDate;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate summary stats
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate cash savings (income - expenses from transactions)
  const cashSavings = totalIncome - totalExpense;
  
  const holdingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const netWorth = cashSavings + holdingsValue;

  // Calculate spending by category
  const categoryData = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any, t) => {
      const category = t.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  // Calculate monthly spending trend
  const monthlyData = filteredTransactions.reduce((acc: any, t) => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, income: 0, expense: 0 };
    }
    
    if (t.type === 'income') {
      acc[monthKey].income += t.amount;
    } else {
      acc[monthKey].expense += t.amount;
    }
    
    return acc;
  }, {});

  const lineData = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));

  const COLORS = ['#69d2bb', '#ee8b88', '#ffd166', '#ee6c4d', '#a7c4db', '#577189'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#3d5a80] p-3 rounded border border-[#577189] shadow-lg">
          <p className="text-[#69d2bb]">{payload[0].name}</p>
          <p className="text-white">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#c1d3e0]">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-white">Dashboard</h2>
        <div className="flex gap-2 items-center">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48 bg-[#34495e] border-[#577189] text-white">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-[#34495e] border-[#577189]">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="3-months">Last 3 Months</SelectItem>
              <SelectItem value="fy">This Fiscal Year</SelectItem>
              <SelectItem value="1-year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-[#34495e] border-[#577189] text-[#c1d3e0]">
                  <CalendarIcon size={16} className="mr-2" />
                  {customStartDate && customEndDate
                    ? `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`
                    : 'Pick dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#3d5a80] border-[#577189]">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-[#c1d3e0] text-sm">Start Date</label>
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      className="rounded-md border border-[#577189]"
                    />
                  </div>
                  <div>
                    <label className="text-[#c1d3e0] text-sm">End Date</label>
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      className="rounded-md border border-[#577189]"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[#c1d3e0]">
              <ArrowUpCircle size={20} className="text-[#69d2bb]" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white">${totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[#c1d3e0]">
              <ArrowDownCircle size={20} className="text-[#ee8b88]" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white">${totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[#c1d3e0]">
              <Wallet size={20} className="text-[#69d2bb]" />
              Cash Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cashSavings >= 0 ? 'text-[#69d2bb]' : 'text-[#ee8b88]'}>
              ${cashSavings.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[#c1d3e0]">
              <Wallet size={20} className="text-[#ffd166]" />
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white">${netWorth.toFixed(2)}</div>
            <p className="text-xs text-[#a7b8c5] mt-1">
              Cash + Holdings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader>
            <CardTitle className="text-white">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[#c1d3e0]">
                No expense data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader>
            <CardTitle className="text-white">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {lineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#577189" />
                  <XAxis dataKey="month" stroke="#c1d3e0" />
                  <YAxis stroke="#c1d3e0" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#c1d3e0' }} />
                  <Bar dataKey="income" fill="#69d2bb" />
                  <Bar dataKey="expense" fill="#ee8b88" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[#c1d3e0]">
                No transaction data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-[#34495e] rounded border border-[#577189]">
                <div>
                  <div className="text-white">{tx.description}</div>
                  <div className="text-xs text-[#a7b8c5]">{new Date(tx.date).toLocaleDateString()}</div>
                </div>
                <div className={tx.type === 'income' ? 'text-[#69d2bb]' : 'text-[#ee8b88]'}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-[#c1d3e0]">
                No transactions in selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
