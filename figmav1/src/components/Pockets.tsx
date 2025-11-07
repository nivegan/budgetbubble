import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { Plus, Target, Calendar, Archive, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { goalAPI, transactionAPI } from '../utils/api';
import { Badge } from './ui/badge';

interface PocketsProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
  onToggleView: () => void; // Function to toggle the view in App.tsx
}

export function Pockets({ accessToken, householdId, isPersonalView, onToggleView }: PocketsProps) {
  const [pockets, setPockets] = useState<any[]>([]);
  const [totalCash, setTotalCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPocket, setSelectedPocket] = useState<any>(null);
  const [moneyAmount, setMoneyAmount] = useState('');
  const [isAdding, setIsAdding] = useState(true); // true for Add, false for Withdraw

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
  });

  const loadData = React.useCallback(async () => {
    if (isPersonalView) {
      setLoading(false);
      return; // Pockets are household only
    }

    setLoading(true);
    try {
      const [pocketData, txData] = await Promise.all([
        goalAPI.getAll(householdId, accessToken),
        transactionAPI.getAll(householdId, false, accessToken), // Always use household transactions
      ]);
      
      setPockets(pocketData.goals || []);
      
      const income = txData.transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
      const expenses = txData.transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);
      setTotalCash(income - expenses);

    } catch (error) {
      console.error('Failed to load pockets:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId, accessToken, isPersonalView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalInPockets = pockets
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + p.currentAmount, 0);
  
  const availableToAssign = totalCash - totalInPockets;

  const handleAddPocket = async () => {
    try {
      await goalAPI.create({
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount) || null,
        targetDate: formData.targetDate || null, // Allow empty date
        type: 'contribution', // All pockets are 'contribution' type now
        householdId,
      }, accessToken);

      setShowAddDialog(false);
      setFormData({ name: '', targetAmount: '', targetDate: '' });
      loadData();
    } catch (error) {
      console.error('Failed to add pocket:', error);
      alert('Failed to add pocket');
    }
  };

  const handleMoneyMove = async () => {
    if (!selectedPocket) return;
    const amount = parseFloat(moneyAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (!isAdding && amount > selectedPocket.currentAmount) {
      alert("You cannot withdraw more than is in the pocket.");
      return;
    }

    if (isAdding && amount > availableToAssign) {
      alert("You cannot add more than is available to assign.");
      return;
    }

    const newAmount = isAdding 
      ? (selectedPocket.currentAmount || 0) + amount
      : (selectedPocket.currentAmount || 0) - amount;
    
    try {
      await goalAPI.update(selectedPocket.id, { currentAmount: newAmount }, householdId, accessToken);
      loadData(); // Reload all data to update totals
      setSelectedPocket(null);
      setMoneyAmount('');
    } catch (error) {
      console.error('Failed to move money:', error);
      alert('Failed to move money');
    }
  };

  const handleInactivate = async (pocketId: string) => {
    if (!confirm('Are you sure you want to mark this pocket as inactive? This will freeze its progress.')) return;
    try {
      await goalAPI.inactivate(pocketId, householdId, accessToken);
      loadData();
    } catch (error) {
      console.error('Failed to inactivate pocket:', error);
      alert('Failed to inactivate pocket');
    }
  };
  
  // CTA for personal view
  if (isPersonalView) {
    return (
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="py-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-[#577189]" />
          <h3 className="text-xl font-semibold text-white mb-2">Pockets are a Household Feature</h3>
          <p className="text-[#c1d3e0] mb-6">
            Switch to your household view to create and manage shared savings pockets.
          </p>
          <Button
            onClick={onToggleView}
            className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
          >
            <Users size={18} className="mr-2" />
            Switch to Household View
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#c1d3e0]">Loading Pockets...</div>
      </div>
    );
  }

  const sortedPockets = [...pockets].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header & Available Pot */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-white text-2xl font-semibold">Pockets</h2>
        <Card className="bg-emerald-800/50 border-emerald-700 w-full md:w-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-200">Available to Assign</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${availableToAssign.toFixed(2)}</div>
            <p className="text-xs text-emerald-300">Total Cash - Total in Pockets</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[#c1d3e0]">Assign your cash to different savings pockets.</p>
        <Button
          onClick={() => {
            setFormData({ name: '', targetAmount: '', targetDate: '' });
            setShowAddDialog(true);
          }}
          className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
        >
          <Plus size={18} className="mr-2" />
          New Pocket
        </Button>
      </div>

      {/* Pockets List */}
      {pockets.length === 0 ? (
        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardContent className="py-12 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-[#577189]" />
            <p className="text-[#c1d3e0]">No pockets yet</p>
            <p className="text-sm text-[#a7b8c5] mt-2">
              Create a pocket to start assigning your savings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPockets.map((pocket) => {
            const isInactive = pocket.status !== 'active';
            const progress = (pocket.targetAmount > 0) ? (pocket.currentAmount / pocket.targetAmount) * 100 : 0;

            return (
              <Card key={pocket.id} className={`bg-[#3d5a80] border-[#577189] transition-opacity ${isInactive ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target size={20} className="text-[#69d2bb]" />
                      {pocket.name}
                    </CardTitle>
                    {isInactive ? (
                      <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-slate-500/30">Inactive</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-400/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-bold text-lg">${pocket.currentAmount.toFixed(2)}</span>
                      {pocket.targetAmount > 0 && (
                        <span className="text-[#a7b8c5]">
                          / ${pocket.targetAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {pocket.targetAmount > 0 && (
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                    )}
                  </div>
                  
                  {pocket.targetDate && (
                    <div className="flex items-center gap-2 text-sm text-[#c1d3e0]">
                      <Calendar size={16} />
                      <span>Target: {new Date(pocket.targetDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isInactive && (
                    <div className="flex gap-2 pt-2 border-t border-[#577189]/50">
                      <Button
                        onClick={() => {
                          setIsAdding(true);
                          setMoneyAmount('');
                          setSelectedPocket(pocket);
                        }}
                        variant="outline"
                        className="flex-1 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400"
                      >
                        <ArrowUp size={16} className="mr-2" /> Add
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAdding(false);
                          setMoneyAmount('');
                          setSelectedPocket(pocket);
                        }}
                        variant="outline"
                        className="flex-1 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400"
                        disabled={pocket.currentAmount === 0}
                      >
                        <ArrowDown size={16} className="mr-2" /> Withdraw
                      </Button>
                    </div>
                  )}
                  
                  {!isInactive && (
                     <Button
                        onClick={() => handleInactivate(pocket.id)}
                        variant="outline"
                        className="w-full bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-slate-400"
                      >
                        <Archive size={16} className="mr-2" />
                        Mark as Inactive
                      </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Pocket Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#3d5a80] border-[#577189] text-white">
          <DialogHeader>
            <DialogTitle>Create New Pocket</DialogTitle>
            <DialogDescription className="text-[#c1d3e0]">
              Create a "bucket" to assign your savings to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Pocket Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="e.g., Emergency Fund, Vacation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Target Amount (Optional)</label>
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
              <label className="text-[#c1d3e0]">Target Date (Optional)</label>
              <Input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
              />
            </div>

            <Button
              onClick={handleAddPocket}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
              disabled={!formData.name}
            >
              Create Pocket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Withdraw Money Dialog */}
      {selectedPocket && (
        <Dialog open={!!selectedPocket} onOpenChange={() => setSelectedPocket(null)}>
          <DialogContent className="bg-[#3d5a80] border-[#577189] text-white">
            <DialogHeader>
              <DialogTitle>{isAdding ? 'Add Money to' : 'Withdraw from'} {selectedPocket.name}</DialogTitle>
              <DialogDescription className="text-[#c1d3e0]">
                {isAdding 
                  ? `Available to Assign: $${availableToAssign.toFixed(2)}`
                  : `Currently in Pocket: $${selectedPocket.currentAmount.toFixed(2)}`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                className="bg-[#34495e] border-[#577189] text-white"
                value={moneyAmount}
                onChange={(e) => setMoneyAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleMoneyMove();
                }}
              />
              <Button
                onClick={handleMoneyMove}
                className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
              >
                {isAdding ? 'Add to Pocket' : 'Withdraw from Pocket'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}