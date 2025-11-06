import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Upload, Pencil, Trash2, Search } from 'lucide-react';
import { transactionAPI } from '../utils/api';
import { SmartUploadDialog } from './SmartUploadDialog';

interface TransactionsProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

export function Transactions({ accessToken, householdId, isPersonalView }: TransactionsProps) {
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
  });

  useEffect(() => {
    loadTransactions();
  }, [householdId, isPersonalView]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, categoryFilter, typeFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await transactionAPI.getAll(householdId, isPersonalView, accessToken);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredTransactions(filtered);
  };

  const handleAddTransaction = async () => {
    try {
      await transactionAPI.create({
        ...formData,
        householdId,
        personalView: isPersonalView,
      }, accessToken);
      
      setShowAddDialog(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'expense',
        category: 'Uncategorized',
      });
      loadTransactions();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await transactionAPI.delete(id, householdId, isPersonalView, accessToken);
      loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleUpdateCategory = async (id: string, category: string) => {
    try {
      await transactionAPI.update(id, { category, householdId, personalView: isPersonalView }, accessToken);
      loadTransactions();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const categories = [
    'Uncategorized',
    'Food & Dining',
    'Shopping',
    'Transportation',
    'Bills & Utilities',
    'Entertainment',
    'Healthcare',
    'Education',
    'Travel',
    'Income',
    'Other',
  ];

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-slate-100">Transactions</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-100"
          >
            <Upload size={18} className="mr-2" />
            Upload CSV/XLS
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-emerald-400 hover:bg-emerald-500 text-slate-900"
          >
            <Plus size={18} className="mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No transactions found. Add your first transaction or upload a CSV file.
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
                          <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            {categories.map(cat => (
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
                      <TableCell className={`text-right ${
                        transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ${transaction.amount.toFixed(2)}
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
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manually add a new transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-300">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-100"
                placeholder="e.g., Grocery shopping"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-100"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Type</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddTransaction}
              className="w-full bg-emerald-400 hover:bg-emerald-500 text-slate-900"
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
