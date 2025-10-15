import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Trash2, Calendar, DollarSign } from 'lucide-react';
import { transactionAPI } from '../utils/api';

interface SubscriptionsProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

export function Subscriptions({ accessToken, householdId, isPersonalView }: SubscriptionsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    nextBillingDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadTransactions();
  }, [householdId, isPersonalView]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await transactionAPI.getAll(householdId, isPersonalView, accessToken);
      const txs = data.transactions || [];
      setTransactions(txs);
      
      // Detect recurring transactions (simplified logic)
      detectSubscriptions(txs);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectSubscriptions = (txs: any[]) => {
    // Group transactions by description to find recurring ones
    const grouped: Record<string, any[]> = {};
    
    txs.forEach(tx => {
      const desc = tx.description.toLowerCase();
      if (!grouped[desc]) {
        grouped[desc] = [];
      }
      grouped[desc].push(tx);
    });

    // Find subscriptions (transactions that occur multiple times with similar amounts)
    const detected: any[] = [];
    Object.entries(grouped).forEach(([desc, txList]) => {
      if (txList.length >= 2) {
        // Check if amounts are similar
        const amounts = txList.map(t => t.amount);
        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const variance = amounts.every(a => Math.abs(a - avgAmount) < avgAmount * 0.1);
        
        if (variance) {
          const sortedDates = txList.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
          const daysDiff = sortedDates.length > 1 
            ? (sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) / (1000 * 60 * 60 * 24) / (sortedDates.length - 1)
            : 30;
          
          const frequency = daysDiff < 10 ? 'weekly' : daysDiff < 35 ? 'monthly' : 'yearly';
          
          detected.push({
            id: txList[0].id,
            name: txList[0].description,
            amount: avgAmount,
            frequency,
            occurrences: txList.length,
            lastBillingDate: sortedDates[sortedDates.length - 1].toISOString().split('T')[0],
            category: txList[0].category,
          });
        }
      }
    });

    setSubscriptions(detected);
  };

  const calculateMonthlyTotal = () => {
    return subscriptions.reduce((sum, sub) => {
      if (sub.frequency === 'monthly') return sum + sub.amount;
      if (sub.frequency === 'weekly') return sum + (sub.amount * 4.33);
      if (sub.frequency === 'yearly') return sum + (sub.amount / 12);
      return sum;
    }, 0);
  };

  const handleAddSubscription = async () => {
    // Add as a transaction
    try {
      await transactionAPI.create({
        date: formData.nextBillingDate,
        description: formData.name,
        amount: formData.amount,
        type: 'expense',
        category: 'Subscription',
        householdId,
        personalView: isPersonalView,
      }, accessToken);
      
      setShowAddDialog(false);
      setFormData({
        name: '',
        amount: '',
        frequency: 'monthly',
        nextBillingDate: new Date().toISOString().split('T')[0],
      });
      loadTransactions();
    } catch (error) {
      console.error('Failed to add subscription:', error);
      alert('Failed to add subscription');
    }
  };

  const monthlyTotal = calculateMonthlyTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-white">Subscription Tracker</h3>
          <p className="text-[#c1d3e0] text-sm mt-1">
            Automatically detected recurring payments
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
        >
          <Plus size={18} className="mr-2" />
          Add Subscription
        </Button>
      </div>

      {/* Monthly Total */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign size={20} className="text-[#69d2bb]" />
            Monthly Subscription Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[#69d2bb]">${monthlyTotal.toFixed(2)}/month</div>
          <p className="text-[#c1d3e0] text-sm mt-1">
            ${(monthlyTotal * 12).toFixed(2)}/year
          </p>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-[#c1d3e0]">Loading subscriptions...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-[#c1d3e0]">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-[#577189]" />
              <p>No recurring subscriptions detected yet</p>
              <p className="text-sm mt-2 text-[#a7b8c5]">
                Add transactions or manually track subscriptions
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#577189]">
                    <TableHead className="text-[#c1d3e0]">Service</TableHead>
                    <TableHead className="text-[#c1d3e0]">Amount</TableHead>
                    <TableHead className="text-[#c1d3e0]">Frequency</TableHead>
                    <TableHead className="text-[#c1d3e0]">Last Billing</TableHead>
                    <TableHead className="text-[#c1d3e0]">Occurrences</TableHead>
                    <TableHead className="text-[#c1d3e0] text-right">Monthly Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => {
                    const monthlyCost = 
                      sub.frequency === 'monthly' ? sub.amount :
                      sub.frequency === 'weekly' ? sub.amount * 4.33 :
                      sub.amount / 12;

                    return (
                      <TableRow key={sub.id} className="border-[#577189]">
                        <TableCell className="text-white">{sub.name}</TableCell>
                        <TableCell className="text-[#ee8b88]">${sub.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded bg-[#69d2bb]/20 text-[#69d2bb] text-xs capitalize">
                            {sub.frequency}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#c1d3e0]">
                          {new Date(sub.lastBillingDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-[#c1d3e0]">{sub.occurrences}x</TableCell>
                        <TableCell className="text-right text-[#c1d3e0]">
                          ${monthlyCost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subscription Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#3d5a80] border-[#577189] text-white">
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
            <DialogDescription className="text-[#c1d3e0]">
              Manually track a recurring subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Service Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="e.g., Netflix, Spotify"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Billing Frequency</label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189]">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Next Billing Date</label>
              <Input
                type="date"
                value={formData.nextBillingDate}
                onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
              />
            </div>

            <Button
              onClick={handleAddSubscription}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
            >
              Add Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
