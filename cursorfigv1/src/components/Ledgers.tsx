import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus } from 'lucide-react';
import { Subscriptions } from './Subscriptions';
import { ledgerAPI } from '../utils/api';

interface LedgersProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

type IouEntry = {
  id: string;
  direction: 'owed_to_me' | 'i_owe';
  person: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  settled: boolean;
};

type GiftEntry = {
  id: string;
  type: 'given' | 'received';
  person: string;
  what: string;
  isMoney: boolean;
  currency?: string;
  amount?: number;
  occasion?: string;
  date: string;
};

export function Ledgers({ accessToken, householdId, isPersonalView }: LedgersProps) {
  // IOU state
  const [ious, setIous] = useState<IouEntry[]>([]);
  const [iousLoading, setIousLoading] = useState(false);
  const [iousError, setIousError] = useState('');
  const [iouFilter, setIouFilter] = useState<{ q: string; status: 'all' | 'active' | 'settled'; direction: 'all' | 'owed_to_me' | 'i_owe'; }>({ q: '', status: 'all', direction: 'all' });
  const [iouForm, setIouForm] = useState({ direction: 'owed_to_me', person: '', amount: '', currency: 'USD', description: '', date: new Date().toISOString().split('T')[0] });

  // Gifts state
  const [gifts, setGifts] = useState<GiftEntry[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [giftsError, setGiftsError] = useState('');
  const [giftFilter, setGiftFilter] = useState<{ q: string; type: 'all' | 'given' | 'received'; person: string; } >({ q: '', type: 'all', person: '' });
  const [giftForm, setGiftForm] = useState({ type: 'given', person: '', what: '', isMoney: 'no', currency: 'USD', amount: '', occasion: '', date: new Date().toISOString().split('T')[0] });

  const knownPeople = useMemo(() => Array.from(new Set([...(ious ?? []).map(i => i.person), ...(gifts ?? []).map(g => g.person)].filter(Boolean))).sort(), [ious, gifts]);

  // Fetch IOUs from API
  const fetchIous = async () => {
    setIousLoading(true);
    setIousError('');
    try {
      const result = await ledgerAPI.listIous(householdId, accessToken);
      setIous(result.ious || []);
    } catch (e: any) {
      setIousError(e?.message || 'Failed to load IOUs');
    } finally {
      setIousLoading(false);
    }
  };

  // Fetch gifts from API
  const fetchGifts = async () => {
    setGiftsLoading(true);
    setGiftsError('');
    try {
      const result = await ledgerAPI.listGifts(householdId, accessToken);
      setGifts(result.gifts || []);
    } catch (e: any) {
      setGiftsError(e?.message || 'Failed to load gifts');
    } finally {
      setGiftsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && householdId) {
      fetchIous();
      fetchGifts();
    }
    // eslint-disable-next-line
  }, [accessToken, householdId]);

  // Add IOU
  const addIou = async () => {
    const entry = {
      ...iouForm,
      amount: parseFloat(iouForm.amount || '0'),
      settled: false,
      householdId,
    };
    try {
      await ledgerAPI.addIou(entry, accessToken);
      fetchIous();
      setIouForm({ direction: 'owed_to_me', person: '', amount: '', currency: 'USD', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (e) {
      alert('Failed to save IOU');
    }
  };

  // Add Gift
  const addGift = async () => {
    const entry: any = {
      ...giftForm,
      isMoney: giftForm.isMoney === 'yes',
      currency: giftForm.isMoney === 'yes' ? giftForm.currency : undefined,
      amount: giftForm.isMoney === 'yes' ? parseFloat(giftForm.amount || '0') : undefined,
      householdId,
    };
    try {
      await ledgerAPI.addGift(entry, accessToken);
      fetchGifts();
      setGiftForm({ type: 'given', person: '', what: '', isMoney: 'no', currency: 'USD', amount: '', occasion: '', date: new Date().toISOString().split('T')[0] });
    } catch (e) {
      alert('Failed to save gift');
    }
  };

  const settleIou = (id: string) => setIous(prev => prev.map(i => i.id === id ? { ...i, settled: true } : i));

  const filteredIous = useMemo(() => {
    return ious.filter(i => {
      if (iouFilter.status !== 'all' && (iouFilter.status === 'active') === i.settled) return false;
      if (iouFilter.direction !== 'all' && iouFilter.direction !== i.direction) return false;
      if (iouFilter.q && !(`${i.person} ${i.description}`.toLowerCase().includes(iouFilter.q.toLowerCase()))) return false;
      return true;
    });
  }, [ious, iouFilter]);

  const filteredGifts = useMemo(() => {
    return gifts.filter(g => {
      if (giftFilter.type !== 'all' && giftFilter.type !== g.type) return false;
      if (giftFilter.person && giftFilter.person !== g.person) return false;
      if (giftFilter.q && !(`${g.person} ${g.what} ${g.occasion || ''}`.toLowerCase().includes(giftFilter.q.toLowerCase()))) return false;
      return true;
    });
  }, [gifts, giftFilter]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="iou" className="w-full">
        <TabsList className="bg-[#3d5a80] border border-[#577189]">
          <TabsTrigger value="iou" className="data-[state=active]:bg-[#69d2bb] data-[state=active]:text-[#2c3e50]">IOU</TabsTrigger>
          <TabsTrigger value="gifts" className="data-[state=active]:bg-[#69d2bb] data-[state=active]:text-[#2c3e50]">Gift Tracker</TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#69d2bb] data-[state=active]:text-[#2c3e50]">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="iou" className="mt-6 space-y-4">
          <h3 className="text-white">IOU</h3>
          <Card className="bg-[#3d5a80] border-[#577189]">
            <CardHeader>
              <CardTitle className="text-white">Add IOU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={iouForm.direction} onValueChange={(v) => setIouForm({ ...iouForm, direction: v })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="owed_to_me">Owes me</SelectItem>
                    <SelectItem value="i_owe">I owe</SelectItem>
                  </SelectContent>
                </Select>
                <Input list="people" placeholder="Person" value={iouForm.person} onChange={(e) => setIouForm({ ...iouForm, person: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <datalist id="people">
                  {knownPeople.map(p => <option key={p} value={p} />)}
                </datalist>
                <Input type="number" step="0.01" placeholder="Amount" value={iouForm.amount} onChange={(e) => setIouForm({ ...iouForm, amount: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <Select value={iouForm.currency} onValueChange={(v) => setIouForm({ ...iouForm, currency: v })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue placeholder="Currency" /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={iouForm.date} onChange={(e) => setIouForm({ ...iouForm, date: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <Input placeholder="Description" value={iouForm.description} onChange={(e) => setIouForm({ ...iouForm, description: e.target.value })} className="bg-[#34495e] border-[#577189] text-white md:col-span-3" />
              </div>
              <Button onClick={addIou} className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"><Plus size={16} className="mr-2"/>Add</Button>
            </CardContent>
          </Card>

          <Card className="bg-[#3d5a80] border-[#577189]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Input placeholder="Search..." value={iouFilter.q} onChange={(e) => setIouFilter({ ...iouFilter, q: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <Select value={iouFilter.status} onValueChange={(v) => setIouFilter({ ...iouFilter, status: v as any })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={iouFilter.direction} onValueChange={(v) => setIouFilter({ ...iouFilter, direction: v as any })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue placeholder="Direction" /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="owed_to_me">Owes me</SelectItem>
                    <SelectItem value="i_owe">I owe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#577189]">
                      <TableHead className="text-white">Person</TableHead>
                      <TableHead className="text-white">Direction</TableHead>
                      <TableHead className="text-white">Amount</TableHead>
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Description</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIous.map(i => (
                      <TableRow key={i.id} className="border-[#577189]">
                        <TableCell className="text-white">{i.person}</TableCell>
                        <TableCell className="text-white">{i.direction === 'owed_to_me' ? 'Owes me' : 'I owe'}</TableCell>
                        <TableCell className="text-white">{i.currency} {i.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-white">{new Date(i.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-white">{i.description || '-'}</TableCell>
                        <TableCell className="text-white">{i.settled ? 'Settled' : 'Active'}</TableCell>
                        <TableCell className="text-right">
                          {!i.settled && (
                            <Button size="sm" onClick={() => settleIou(i.id)} className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]">Resolve</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts" className="mt-6 space-y-4">
          <h3 className="text-white">Gift Tracker</h3>
          <Card className="bg-[#3d5a80] border-[#577189]">
            <CardHeader>
              <CardTitle className="text-white">Add Gift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={giftForm.type} onValueChange={(v) => setGiftForm({ ...giftForm, type: v })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="given">Given</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
                <Input list="people" placeholder="Person" value={giftForm.person} onChange={(e) => setGiftForm({ ...giftForm, person: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <Input placeholder="Item or description" value={giftForm.what} onChange={(e) => setGiftForm({ ...giftForm, what: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <Select value={giftForm.isMoney} onValueChange={(v) => setGiftForm({ ...giftForm, isMoney: v })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue placeholder="Is it money?" /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="no">Gift</SelectItem>
                    <SelectItem value="yes">Money</SelectItem>
                  </SelectContent>
                </Select>
                {giftForm.isMoney === 'yes' && (
                  <>
                    <Input placeholder="Currency" value={giftForm.currency} onChange={(e) => setGiftForm({ ...giftForm, currency: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                    <Input type="number" step="0.01" placeholder="Amount" value={giftForm.amount} onChange={(e) => setGiftForm({ ...giftForm, amount: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                  </>
                )}
                <Input type="date" value={giftForm.date} onChange={(e) => setGiftForm({ ...giftForm, date: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <Input placeholder="Occasion (optional)" value={giftForm.occasion} onChange={(e) => setGiftForm({ ...giftForm, occasion: e.target.value })} className="bg-[#34495e] border-[#577189] text-white md:col-span-3" />
              </div>
              <Button onClick={addGift} className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"><Plus size={16} className="mr-2"/>Add</Button>
            </CardContent>
          </Card>

          <Card className="bg-[#3d5a80] border-[#577189]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Input placeholder="Search..." value={giftFilter.q} onChange={(e) => setGiftFilter({ ...giftFilter, q: e.target.value })} className="bg-[#34495e] border-[#577189] text-white" />
                <Select value={giftFilter.type} onValueChange={(v) => setGiftFilter({ ...giftFilter, type: v as any })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="given">Given</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={giftFilter.person} onValueChange={(v) => setGiftFilter({ ...giftFilter, person: v })}>
                  <SelectTrigger className="bg-[#34495e] border-[#577189] text-white"><SelectValue placeholder="Person" /></SelectTrigger>
                  <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                    <SelectItem value="">All</SelectItem>
                    {knownPeople.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#577189]">
                      <TableHead className="text-white">Person</TableHead>
                      <TableHead className="text-white">Type</TableHead>
                      <TableHead className="text-white">Gift</TableHead>
                      <TableHead className="text-white">Amount</TableHead>
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Occasion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGifts.map(g => (
                      <TableRow key={g.id} className="border-[#577189]">
                        <TableCell className="text-white">{g.person}</TableCell>
                        <TableCell className="text-white capitalize">{g.type}</TableCell>
                        <TableCell className="text-white">{g.what}</TableCell>
                        <TableCell className="text-white">{g.isMoney ? `${g.currency} ${(g.amount || 0).toFixed(2)}` : '-'}</TableCell>
                        <TableCell className="text-white">{new Date(g.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-white">{g.occasion || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <Subscriptions accessToken={accessToken} householdId={householdId} isPersonalView={isPersonalView} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


