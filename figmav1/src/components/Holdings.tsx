import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Plus, TrendingUp, TrendingDown, Upload } from 'lucide-react';
import { holdingsAPI } from '../utils/api';
import { SmartUploadDialog } from './SmartUploadDialog';

interface HoldingsProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

export function Holdings({ accessToken, householdId, isPersonalView }: HoldingsProps) {
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
  });

  // Updated to load holdings in BOTH views
  const loadHoldings = React.useCallback(async () => {
    setLoading(true);
    try {
      // Pass isPersonalView to the API
      const data = await holdingsAPI.getAll(householdId, isPersonalView, accessToken);
      setHoldings(data.holdings || []);
    } catch (error) {
      console.error('Failed to load holdings:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId, isPersonalView, accessToken]);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  const handleAddHolding = async () => {
    try {
      await holdingsAPI.create({
        ...formData,
        householdId,
        personal: isPersonalView, // Tell API if this is a personal holding
      }, accessToken);
      
      setShowAddDialog(false);
      setFormData({ name: '', type: 'stock', initialValue: '', currentValue: '' });
      loadHoldings();
    } catch (error) {
      console.error('Failed to add holding:', error);
      alert('Failed to add holding');
    }
  };

  const handleUpdateValue = async () => {
    if (!selectedHolding) return;
    
    try {
      await holdingsAPI.update(
        selectedHolding.id,
        parseFloat(updateValue),
        householdId,
        isPersonalView, // Pass view context
        accessToken
      );
      
      setShowUpdateDialog(false);
      setSelectedHolding(null);
      setUpdateValue('');
      loadHoldings();
    } catch (error) {
      console.error('Failed to update holding:', error);
      alert('Failed to update holding');
    }
  };

  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalInitialValue = holdings.reduce((sum, h) => sum + (h.initialValue || 0), 0);
  const totalGain = totalValue - totalInitialValue;
  const totalGainPercent = totalInitialValue > 0 ? (totalGain / totalInitialValue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-white text-2xl font-semibold">Assets & Investments</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-[#3d5a80] hover:bg-[#4a6d9c] text-slate-100"
          >
            <Upload size={18} className="mr-2" />
            Upload CSV/XLS
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
          >
            <Plus size={18} className="mr-2" />
            Add Holding
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#c1d3e0]">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#c1d3e0]">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalGain >= 0 ? '+' : ''}${totalGain.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#c1d3e0]">Return %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGainPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings List */}
      {loading ? (
        <div className="text-center py-8 text-[#c1d3e0]">Loading holdings...</div>
      ) : holdings.length === 0 ? (
        <Card className="bg-[#3d5a80] border-[#577189]">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-[#577189]" />
            <h3 className="text-white mb-2">No holdings yet</h3>
            <p className="text-[#c1d3e0] mb-4">
              {isPersonalView ? "Add your first personal holding" : "Add your first household holding"}
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
            >
              Add Your First Holding
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holdings.map((holding) => {
            const gain = (holding.currentValue || 0) - (holding.initialValue || 0);
            const gainPercent = (holding.initialValue && holding.initialValue !== 0) ? (gain / holding.initialValue) * 100 : 0;

            return (
              <Card key={holding.id} className="bg-[#3d5a80] border-[#577189]">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <div>
                      <div className="text-white">{holding.name}</div>
                      <div className="text-sm text-[#c1d3e0] capitalize mt-1">{holding.type}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedHolding(holding);
                        setUpdateValue(String(holding.currentValue));
                        setShowUpdateDialog(true);
                      }}
                      className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
                    >
                      Update
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#c1d3e0]">Current Value:</span>
                    <span className="text-white">${(holding.currentValue || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#c1d3e0]">Initial Value:</span>
                    <span className="text-white">${(holding.initialValue || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#577189]">
                    <span className="text-[#c1d3e0]">Gain/Loss:</span>
                    <div className="text-right">
                      <div className={`flex items-center justify-end gap-1 ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{gain >= 0 ? '+' : ''}${gain.toFixed(2)}</span>
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
        <DialogContent className="bg-[#3d5a80] border-[#577189] text-white">
          <DialogHeader>
            <DialogTitle>Add New Holding</DialogTitle>
            <DialogDescription className="text-[#c1d3e0]">
              Track an asset or investment. This will be added to your {isPersonalView ? "Personal" : "Household"} view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="e.g., Apple Stock, Investment Property"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Type</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="mutual-fund">Mutual Fund</SelectItem>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Initial Value</label>
              <Input
                type="number"
                step="0.01"
                value={formData.initialValue}
                onChange={(e) => setFormData({ ...formData, initialValue: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Current Value</label>
              <Input
                type="number"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value || formData.initialValue })}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="Leave empty to use initial value"
              />
            </div>

            <Button
              onClick={handleAddHolding}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
            >
              Add Holding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Value Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-[#3d5a80] border-[#577189] text-white">
          <DialogHeader>
            <DialogTitle>Update Value</DialogTitle>
            <DialogDescription className="text-[#c1d3e0]">
              Update current value for: {selectedHolding?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">New Value</label>
              <Input
                type="number"
                step="0.01"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                className="bg-[#34495e] border-[#577189] text-white"
                placeholder="0.00"
              />
            </div>

            <Button
              onClick={handleUpdateValue}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
            >
              Update Value
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW UPLOAD DIALOG */}
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