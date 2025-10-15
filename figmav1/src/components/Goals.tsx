import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Plus, Target, TrendingUp, Calendar } from 'lucide-react';
import { goalAPI, transactionAPI } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface GoalsProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

export function Goals({ accessToken, householdId, isPersonalView }: GoalsProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'savings', // 'savings' or 'contribution'
  });

  useEffect(() => {
    loadData();
  }, [householdId, isPersonalView]);

  const loadData = async () => {
    if (isPersonalView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [goalData, txData] = await Promise.all([
        goalAPI.getAll(householdId, accessToken),
        transactionAPI.getAll(householdId, isPersonalView, accessToken),
      ]);
      setGoals(goalData.goals || []);
      setTransactions(txData.transactions || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentSavings = () => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return income - expenses;
  };

  const generateBurndownData = (goal: any) => {
    const currentSavings = goal.type === 'savings' ? calculateCurrentSavings() : (goal.currentAmount || 0);
    const targetAmount = goal.targetAmount;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const createdDate = new Date(goal.createdAt);
    
    const totalDays = Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const weeklyTarget = daysRemaining > 0 ? (targetAmount - currentSavings) / (daysRemaining / 7) : 0;
    const monthlyTarget = daysRemaining > 0 ? (targetAmount - currentSavings) / (daysRemaining / 30) : 0;
    
    // Generate projection data points
    const data = [];
    const weeksRemaining = Math.ceil(daysRemaining / 7);
    
    for (let week = 0; week <= weeksRemaining; week++) {
      const weekDate = new Date(today.getTime() + week * 7 * 24 * 60 * 60 * 1000);
      const projectedAmount = currentSavings + (weeklyTarget * week);
      
      data.push({
        week: `Week ${week}`,
        date: weekDate.toLocaleDateString(),
        projected: Math.min(projectedAmount, targetAmount),
        current: week === 0 ? currentSavings : null,
        target: targetAmount,
      });
    }
    
    return { data, weeklyTarget, monthlyTarget, daysRemaining, currentSavings };
  };

  const handleAddGoal = async () => {
    try {
      await goalAPI.create({
        name: formData.name,
        targetAmount: formData.targetAmount,
        targetDate: formData.targetDate,
        type: formData.type,
        householdId,
      }, accessToken);

      setShowAddDialog(false);
      setFormData({
        name: '',
        targetAmount: '',
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'savings',
      });
      loadData();
    } catch (error) {
      console.error('Failed to add goal:', error);
      alert('Failed to add goal');
    }
  };

  const handleContribute = async (goalId: string, amount: number) => {
    try {
      await goalAPI.contribute(goalId, amount, accessToken);
      loadData();
    } catch (error) {
      console.error('Failed to contribute:', error);
      alert('Failed to add contribution');
    }
  };

  if (isPersonalView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-[#c1d3e0]">
          <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Goals are only available in Household view</p>
          <p className="text-sm mt-2">Switch to Household view to manage goals</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#c1d3e0]">Loading goals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-white">Financial Goals</h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
        >
          <Plus size={18} className="mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardContent className="py-12 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-[#577189]" />
            <p className="text-[#c1d3e0]">No goals yet</p>
            <p className="text-sm text-[#a7b8c5] mt-2">
              Create a savings goal to track your progress
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => {
            const { data, weeklyTarget, monthlyTarget, daysRemaining, currentSavings } = generateBurndownData(goal);
            const progress = (currentSavings / goal.targetAmount) * 100;
            const isOnTrack = currentSavings >= (goal.targetAmount * 
              (1 - (daysRemaining / Math.ceil((new Date(goal.targetDate).getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24)))));

            return (
              <Card key={goal.id} className="bg-[#3d5a80] border-[#577189]">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Target size={20} className="text-[#69d2bb]" />
                        {goal.name}
                      </CardTitle>
                      <p className="text-[#c1d3e0] text-sm mt-1">
                        {goal.type === 'savings' ? 'Savings Target' : 'Contribution Goal'}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded ${isOnTrack ? 'bg-[#69d2bb]/20 text-[#69d2bb]' : 'bg-[#ee8b88]/20 text-[#ee8b88]'}`}>
                      {isOnTrack ? 'On Track' : 'Behind'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#c1d3e0]">Progress</span>
                      <span className="text-white">
                        ${currentSavings.toFixed(2)} / ${goal.targetAmount.toFixed(2)}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <div className="text-xs text-[#a7b8c5]">
                      {progress.toFixed(1)}% complete
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-[#34495e] rounded border border-[#577189]">
                    <div>
                      <div className="text-xs text-[#a7b8c5]">Days Remaining</div>
                      <div className="text-white flex items-center gap-1">
                        <Calendar size={16} className="text-[#69d2bb]" />
                        {daysRemaining > 0 ? daysRemaining : 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#a7b8c5]">Weekly Target</div>
                      <div className="text-white">${weeklyTarget.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#a7b8c5]">Monthly Target</div>
                      <div className="text-white">${monthlyTarget.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Burndown Chart */}
                  <div className="mt-4">
                    <h4 className="text-[#c1d3e0] mb-3">Savings Projection</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#577189" />
                        <XAxis 
                          dataKey="week" 
                          stroke="#c1d3e0" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis stroke="#c1d3e0" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#3d5a80', 
                            border: '1px solid #577189',
                            borderRadius: '4px',
                            color: '#fff'
                          }} 
                        />
                        <ReferenceLine 
                          y={goal.targetAmount} 
                          stroke="#69d2bb" 
                          strokeDasharray="3 3"
                          label={{ value: 'Target', fill: '#69d2bb', fontSize: 12 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="projected" 
                          stroke="#69d2bb" 
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="current" 
                          stroke="#ffd166" 
                          strokeWidth={3}
                          dot={{ fill: '#ffd166', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 text-xs text-[#a7b8c5] mt-2 justify-center">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#69d2bb] rounded"></div>
                        Projected Path
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#ffd166] rounded"></div>
                        Current
                      </div>
                    </div>
                  </div>

                  {/* Contribution Button (for contribution type goals) */}
                  {goal.type === 'contribution' && (
                    <Button
                      onClick={() => setSelectedGoal(goal)}
                      variant="outline"
                      className="w-full bg-[#34495e] border-[#577189] hover:bg-[#3d5a80] text-[#c1d3e0]"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Contribution
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#3d5a80] border-[#577189] text-white">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription className="text-[#c1d3e0]">
              Set a financial goal and track your progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Goal Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="e.g., Emergency Fund, Vacation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Goal Type</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189]">
                  <SelectItem value="savings">Savings Target (tracks total cash savings)</SelectItem>
                  <SelectItem value="contribution">Contribution Goal (manually track contributions)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Target Amount</label>
              <Input
                type="number"
                step="0.01"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Target Date</label>
              <Input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
              />
            </div>

            <Button
              onClick={handleAddGoal}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
              disabled={!formData.name || !formData.targetAmount || !formData.targetDate}
            >
              Create Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      {selectedGoal && (
        <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
          <DialogContent className="bg-[#3d5a80] border-[#577189] text-white">
            <DialogHeader>
              <DialogTitle>Add Contribution</DialogTitle>
              <DialogDescription className="text-[#c1d3e0]">
                Add money to {selectedGoal.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                className="bg-[#34495e] border-[#577189] text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const amount = parseFloat((e.target as HTMLInputElement).value);
                    if (amount > 0) {
                      handleContribute(selectedGoal.id, amount);
                      setSelectedGoal(null);
                    }
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
