import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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

  useEffect(() => {
    if (!isPersonalView) {
      loadHoldings();
    }
  }, [householdId, isPersonalView]);

  const loadHoldings = async () => {
    setLoading(true);
    try {
      const data = await holdingsAPI.getAll(householdId, accessToken);
      setHoldings(data.holdings || []);
    } catch (error) {
      console.error('Failed to load holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHolding = async () => {
    try {
      await holdingsAPI.create({
        ...formData,
        householdId,
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

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGain = holdings.reduce((sum, h) => sum + (h.currentValue - h.initialValue), 0);
  const totalGainPercent = holdings.reduce((sum, h) => sum + h.initialValue, 0) > 0
    ? (totalGain / holdings.reduce((sum, h) => sum + h.initialValue, 0)) * 100
    : 0;

  if (isPersonalView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-slate-400">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Holdings are only available in Household view</p>
          <p className="text-sm mt-2">Switch to Household view to track assets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="assets" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-900">
            Assets & Investments
          </TabsTrigger>
          <TabsTrigger value="iou" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-900">
            IOU Ledger
          </TabsTrigger>
          <TabsTrigger value="gifts" className="data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-900">
            Gift Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-6 mt-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-slate-100">Assets & Investments</h2>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-emerald-400 hover:bg-emerald-500 text-slate-900"
            >
              <Plus size={18} className="mr-2" />
              Add Holding
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-300">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-emerald-400">${totalValue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-300">Total Gain/Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {totalGain >= 0 ? '+' : ''}${totalGain.toFixed(2)}
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
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-emerald-400 hover:bg-emerald-500 text-slate-900"
                >
                  Add Your First Holding
                </Button>
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
                        <span className="text-slate-100">${holding.currentValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Initial Value:</span>
                        <span className="text-slate-300">${holding.initialValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                        <span className="text-slate-400">Gain/Loss:</span>
                        <div className="text-right">
                          <div className={`flex items-center gap-1 ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
        </TabsContent>

        <TabsContent value="iou" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <h3 className="text-slate-300 mb-2">IOU Ledger</h3>
              <p className="text-slate-400">
                Track personal IOUs and money owed between household members
              </p>
              <p className="text-sm text-slate-500 mt-4">Coming soon in a future update</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <h3 className="text-slate-300 mb-2">Gift Tracker</h3>
              <p className="text-slate-400">
                Keep track of gifts given and received throughout the year
              </p>
              <p className="text-sm text-slate-500 mt-4">Coming soon in a future update</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
