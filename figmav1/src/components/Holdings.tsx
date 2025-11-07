import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { holdingsAPI } from '../utils/api';
import { SmartUploadDialog } from './SmartUploadDialog';
import { formatCurrency } from '../utils/helpers'; // <-- Import formatter
import { toast } from 'sonner'; // <-- Import toast

interface HoldingsProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
  householdCurrency: string; // <-- Prop for currency
}

export function Holdings({ accessToken, householdId, isPersonalView, householdCurrency }: HoldingsProps) {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<any>(null);
  const [updateValue, setUpdateValue] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'stock',
    initialValue: '',
    currentValue: '',
    currency: householdCurrency, // <-- Add currency to form
  });

  useEffect(() => {
    if (!isPersonalView) {
      loadHoldings();
    } else {
      setLoading(false);
      setHoldings([]); // Clear holdings in personal view
    }
  }, [householdId, isPersonalView, accessToken]);
  
  // Update form currency if household currency changes
  useEffect(() => {
    setFormData(fd => ({ ...fd, currency: householdCurrency }));
  }, [householdCurrency]);

  const loadHoldings = async () => {
    setLoading(true);
    try {
      const data = await holdingsAPI.getAll(householdId, accessToken);
      setHoldings(data.holdings || []);
    } catch (error) {
      console.error('Failed to load holdings:', error);
      toast.error('Failed to load holdings.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHolding = async () => {
    if (!formData.name || !formData.initialValue) {
      toast.error('Please fill out a name and initial value.');
      return;
    }
    
    try {
      await holdingsAPI.create({
        ...formData,
        householdId,
        initialValue: parseFloat(formData.initialValue),
        // Use current value if provided, else default to initial value
        currentValue: parseFloat(formData.currentValue) || parseFloat(formData.initialValue),
      }, accessToken);
      
      setShowAddDialog(false);
      setFormData({ name: '', type: 'stock', initialValue: '', currentValue: '', currency: householdCurrency });
      loadHoldings();
      toast.success('Holding added!');
    } catch (error) {
      console.error('Failed to add holding:', error);
      toast.error('Failed to add holding.');
    }
  };

  const handleUpdateValue = async () => {
    if (!selectedHolding || !updateValue) return;
    
    try {
      await holdingsAPI.update(
        selectedHolding.id,
        parseFloat(updateValue),
        householdId,
        accessToken
      );
      
      setShowUpdateDialog(false);
      setSelectedHolding(null);
      setUpdateValue('');
      loadHoldings();
      toast.success('Holding value updated!');
    } catch (error) {
      console.error('Failed to update holding:', error);
      toast.error('Failed to update holding.');
    }
  };
  
  // NOTE: This calculation is now simplified.
  // For *true* multi-currency, this math must be done in the Dashboard
  // after converting all holdings to the base currency.
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGain = holdings.reduce((sum, h) => sum + (h.currentValue - h.initialValue), 0);
  const totalInitial = holdings.reduce((sum, h) => sum + h.initialValue, 0);
  const totalGainPercent = totalInitial > 0 ? (totalGain / totalInitial) * 100 : 0;


  if (isPersonalView) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-slate-300 mb-2">Holdings are a Household Feature</h3>
          <p className="text-slate-400">
            Switch to Household view to track shared assets and investments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-slate-100 text-2xl font-semibold">Assets & Investments</h2>
        <div className="flex gap-2">
           <Button
            onClick={() => setShowUploadDialog(true)}
            variant="outline"
            className="bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-slate-300"
          >
            <TrendingUp size={18} className="mr-2" />
            Upload Holdings
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-emerald-400 hover:bg-emerald-500 text-slate-900"
          >
            <Plus size={18} className="mr-2" />
            Add Holding
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-300">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            {/* This is a simple sum. For multi-currency, it's an estimate. */}
            <div className="text-emerald-400">{formatCurrency(totalValue, householdCurrency)} (Estimate)</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-300">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain, householdCurrency)} (Estimate)
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-300">Return %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={totalGainPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading holdings...</div>
      ) : holdings.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-slate-300 mb-2">No holdings yet</h3>
            <p className="text-slate-400 mb-4">
              Track your assets, investments, real estate, and more
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holdings.map((holding) => {
            const gain = holding.currentValue - holding.initialValue;
            const gainPercent = (gain / holding.initialValue) * 100;

            return (
              <Card key={holding.id} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <div>
                      <div className="text-slate-100">{holding.name}</div>
                      <div className="text-sm text-slate-400 capitalize mt-1">{holding.type}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedHolding(holding);
                        setUpdateValue(String(holding.currentValue));
                        setShowUpdateDialog(true);
                      }}
                      className="bg-emerald-400 hover:bg-emerald-500 text-slate-900"
                    >
                      Update
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Value:</span>
                    <span className="text-slate-100">{formatCurrency(holding.currentValue, holding.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Initial Value:</span>
                    <span className="text-slate-300">{formatCurrency(holding.initialValue, holding.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Gain/Loss:</span>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{gain >= 0 ? '+' : ''}{formatCurrency(gain, holding.currency)}</span>
                      </div>
                      <div className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      

      {/* Add Holding Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Add New Holding</DialogTitle>
            <DialogDescription className="text-slate-400">
              Track an asset or investment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-300">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-100"
                placeholder="e.g., Apple Stock, Investment Property"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Type</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="mutual-fund">Mutual Fund</SelectItem>
                  <SelectItem valuem="bond">Bond</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-slate-300">Initial Value</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.initialValue}
                  onChange={(e) => setFormData({ ...formData, initialValue: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-slate-300">Currency</label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  placeholder="e.g., USD"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Current Value (optional)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-100"
                placeholder="Leave empty to use initial value"
              />
            </div>

            <Button
              onClick={handleAddHolding}
              className="w-full bg-emerald-400 hover:bg-emerald-500 text-slate-900"
            >
              Add Holding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Value Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Update Value</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update current value for: {selectedHolding?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-300">New Value</label>
              <Input
                type="number"
                step="0.01"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-100"
                placeholder="0.00"
              />
            </div>

            <Button
              onClick={handleUpdateValue}
              className="w-full bg-emerald-400 hover:bg-emerald-500 text-slate-900"
            >
              Update Value
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <SmartUploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onSuccess={loadHoldings}
        householdId={householdId}
        isPersonalView={isPersonalView}
        accessToken={accessToken}
        type="holdings"
      />
    </div>
  );
}