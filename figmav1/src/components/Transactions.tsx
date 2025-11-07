import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Upload, Trash2, Search } from 'lucide-react';
import { transactionAPI } from '../utils/api';
import { SmartUploadDialog } from './SmartUploadDialog';
import { formatCurrency } from '../utils/helpers'; // <-- Import formatter
import { toast } from 'sonner'; // <-- Import toast

interface TransactionsProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
  householdCurrency: string; // <-- Prop for currency
}

export function Transactions({ accessToken, householdId, isPersonalView, householdCurrency }: TransactionsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'expense',
    category: 'Uncategorized',
    currency: householdCurrency, // <-- Add currency to form
  });
  
  const loadTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionAPI.getAll(householdId, isPersonalView, accessToken);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [householdId, isPersonalView, accessToken]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);
  
  // Update form currency if household currency changes
  useEffect(() => {
    setFormData(fd => ({ ...fd, currency: householdCurrency }));
  }, [householdCurrency]);

  useEffect(() => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, categoryFilter, typeFilter]);

  const handleAddTransaction = async () => {
    if (!formData.description || !formData.amount) {
      toast.error('Please fill out a description and amount.');
      return;
    }
    
    try {
      await transactionAPI.create({
        ...formData,
        amount: parseFloat(formData.amount),
        householdId,
        personal: isPersonalView,
      }, accessToken);
      
      setShowAddDialog(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'expense',
        category: 'Uncategorized',
        currency: householdCurrency,
      });
      loadTransactions();
      toast.success('Transaction added!');
    } catch (error) {
      console.error('Failed to add transaction:', error);
      toast.error('Failed to add transaction.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await transactionAPI.delete(id, householdId, isPersonalView, accessToken);
      loadTransactions();
      toast.success('Transaction deleted.');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      toast.error('Failed to delete transaction.');
    }
  };

  const handleUpdateCategory = async (id: string, category: string) => {
    try {
      await transactionAPI.update(id, { category, householdId, personalView: isPersonalView }, accessToken);
      loadTransactions();
      toast.success('Category updated.');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Failed to update category.');
    }
  };

  const categories = [
    'Uncategorized', 'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities',
    'Entertainment', 'Healthcare', 'Education', 'Travel', 'Income', 'Other',
  ];

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category).concat(categories)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-white text-2xl font-semibold">Transactions</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-[#3d5a80] hover:bg-[#4a6d9c] text-slate-100"
          >
            <Upload size={18} className="mr-2" />
            Upload File
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
          >
            <Plus size={18} className="mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#34495e] border-[#577189] text-slate-100"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-[#34495e] border-[#577189] text-slate-100">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-[#34495e] border-[#577189] text-slate-100">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No transactions found. Add your first transaction or upload a file.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Date</TableHead>
                    <TableHead className="text-slate-300">Description</TableHead>
                    <TableHead className="text-slate-300">Category</TableHead>
                    <TableHead className="text-slate-300">Type</TableHead>
                    <TableHead className="text-slate-300 text-right">Amount</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="border-slate-700">
                      <TableCell className="text-slate-300">
                        {new Date(transaction.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-slate-100">{transaction.description}</TableCell>
                      <TableCell>
                        <Select
                          value={transaction.category}
                          onValueChange={(value) => handleUpdateCategory(transaction.id, value)}
                        >
                          <SelectTrigger className="w-40 bg-[#34495e] border-[#577189] text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                            {uniqueCategories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.type === 'income' 
                            ? 'bg-emerald-400/10 text-emerald-400' 
                            : 'bg-red-400/10 text-red-400'
                        }`}>
                          {transaction.type}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}>
                        {transaction.type === 'expense' ? '-' : ''}
                        {/* Use formatter, pass householdCurrency as a fallback */}
                        {formatCurrency(transaction.amount, transaction.currency || householdCurrency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#3d5a80] border-[#577189] text-slate-100">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manually add a new transaction to your {isPersonalView ? "Personal" : "Household"} view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-300">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-slate-100"
                placeholder="e.g., Grocery shopping"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-slate-300">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-[#34495e] border-[#577189] text-slate-100"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-slate-300">Currency</label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  className="bg-[#34495e] border-[#577189] text-slate-100"
                  placeholder="e.g., USD"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Type</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddTransaction}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
            >
              Add Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <SmartUploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onSuccess={loadTransactions}
        householdId={householdId}
        isPersonalView={isPersonalView}
        accessToken={accessToken}
        type="transactions"
      />
    </div>
  );
}