import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { householdAPI } from '../utils/api';

interface HouseholdSetupProps {
  accessToken: string;
  onComplete: () => void;
}

export function HouseholdSetup({ accessToken, onComplete }: HouseholdSetupProps) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await householdAPI.create(name, currency, accessToken);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2c3e50] p-4">
      <Card className="w-full max-w-md bg-[#3d5a80] border-[#577189] shadow-2xl">
        <CardHeader>
          <CardTitle className="text-[#69d2bb]">Create Your Household</CardTitle>
          <CardDescription className="text-[#c1d3e0]">
            Set up your household to start tracking finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Household Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Smith Family, My Household"
                className="bg-[#34495e] border-[#577189] text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[#c1d3e0]">Default Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189]">
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 bg-[#ee6c4d]/20 border border-[#ee6c4d]/50 rounded text-[#ee8b88]">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50] shadow-md"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Household'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
