//
// 📄 NEW FILE: figmav1/src/components/IouTracker.tsx
//
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Check, UserPlus, ArrowLeftRight } from 'lucide-react';
import { iouAPI, peopleAPI } from '../utils/api';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/helpers';

interface IouTrackerProps {
  accessToken: string;
  householdId: string;
  householdCurrency: string;
  ious: any[];
  people: any[];
  loadData: () => void;
  loading: boolean;
}

export function IouTracker({ 
  accessToken, 
  householdId, 
  householdCurrency, 
  ious, 
  people, 
  loadData, 
  loading 
}: IouTrackerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterStatus, setFilterStatus] = useState('unresolved');

  const [formData, setFormData] = useState({
    id: null,
    direction: 'owed', // 'owed' (by me) or 'owe' (to them)
    personId: '',
    newPersonName: '',
    title: '',
    description: '',
    amount: '',
    currency: householdCurrency,
  });

  // Update form currency if household currency changes
  useEffect(() => {
    setFormData(fd => ({ ...fd, currency: householdCurrency }));
  }, [householdCurrency]);

  const handleSave = async () => {
    setIsSubmitting(true);
    let personId = formData.personId;

    try {
      // Create new person if needed
      if (formData.personId === 'new' && formData.newPersonName) {
        const newPerson = await peopleAPI.create({
          name: formData.newPersonName,
          householdId,
        }, accessToken);
        personId = newPerson.people[0].id;
        toast.success(`Created new person: ${formData.newPersonName}`);
      }

      if (!personId || personId === 'new') {
        toast.error('Please select or create a person.');
        setIsSubmitting(false);
        return;
      }

      const data = {
        householdId,
        personId,
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        direction: formData.direction,
        status: 'unresolved', // Default status
      };

      await iouAPI.create(data, accessToken);
      toast.success('IOU created successfully');

      setShowDialog(false);
      resetFormData();
      loadData(); // This refetches all data in App.tsx
    } catch (error) {
      console.error('Failed to save IOU:', error);
      toast.error('Failed to save IOU.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (iouId: string) => {
    if (!confirm('Mark this item as resolved?')) return;
    try {
      await iouAPI.update(iouId, {
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      }, householdId, accessToken);
      toast.success('IOU marked as resolved');
      loadData();
    } catch (error) {
      console.error('Failed to resolve IOU:', error);
      toast.error('Failed to resolve IOU.');
    }
  };

  const resetFormData = () => {
    setFormData({
      id: null,
      direction: 'owed',
      personId: '',
      newPersonName: '',
      title: '',
      description: '',
      amount: '',
      currency: householdCurrency,
    });
  };

  const filteredIous = useMemo(() => {
    return ious
      .filter(iou => filterStatus === 'all' || iou.status === filterStatus)
      .filter(iou => filterPerson === 'all' || iou.personId === filterPerson)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ious, filterStatus, filterPerson]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-white text-2xl font-semibold">IOU Ledger</h2>
        <Button
          onClick={() => {
            resetFormData();
            setShowDialog(true);
          }}
          className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
        >
          <Plus size={18} className="mr-2" />
          Add IOU
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="pt-6 flex gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 bg-[#34495e] border-[#577189] text-slate-100">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#34495e] border-[#577189] text-white">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPerson} onValueChange={setFilterPerson}>
            <SelectTrigger className="flex-1 bg-[#34495e] border-[#577189] text-slate-100">
              <SelectValue placeholder="Filter by person" />
            </SelectTrigger>
            <SelectContent className="bg-[#34495e] border-[#577189] text-white">
              <SelectItem value="all">All People</SelectItem>
              {people.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* IOU Table */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading IOU ledger...</div>
          ) : filteredIous.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No IOUs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Title</TableHead>
                  <TableHead className="text-slate-300">Person</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300 text-right">Amount</TableHead>
                  <TableHead className="text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIous.map((iou) => {
                  const person = people.find(p => p.id === iou.personId);
                  const isOwedToMe = iou.direction === 'owed'; // Owed to me
                  return (
                    <TableRow key={iou.id} className="border-slate-700">
                      <TableCell className="text-slate-300">
                        {new Date(iou.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-slate-100">{iou.title}</TableCell>
                      <TableCell className="text-slate-300">{person?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={iou.status === 'resolved' ? 'secondary' : 'default'}
                          className={iou.status === 'resolved' ? 'bg-slate-500/20 text-slate-400' : 'bg-amber-400/20 text-amber-400'}
                        >
                          {iou.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        isOwedToMe ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {isOwedToMe ? '+' : '-'}{formatCurrency(iou.amount, iou.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {iou.status === 'unresolved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResolve(iou.id)}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                          >
                            <Check size={16} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#3d5a80] border-[#577189] text-slate-100">
          <DialogHeader>
            <DialogTitle>Add IOU</DialogTitle>
            <DialogDescription className="text-slate-400">
              Track money owed or lent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-slate-300">This is an...</label>
              <Select value={formData.direction} onValueChange={(val) => setFormData({ ...formData, direction: val })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                  <SelectItem value="owed">IOU (Someone owes me)</SelectItem>
                  <SelectItem value="owe">Debt (I owe someone)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Person</label>
              <Select value={formData.personId} onValueChange={(val) => setFormData({ ...formData, personId: val })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-slate-100">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                  {people.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  <SelectItem value="new">
                    <span className="flex items-center gap-2"><UserPlus size={16} /> Add new person...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.personId === 'new' && (
              <div className="space-y-2">
                <label className="text-slate-300">New Person's Name</label>
                <Input
                  value={formData.newPersonName}
                  onChange={(e) => setFormData({ ...formData, newPersonName: e.target.value })}
                  className="bg-[#34495e] border-[#577189] text-slate-100"
                  placeholder="e.g., John Doe"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-slate-300">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-slate-100"
                placeholder="e.g., Dinner last night"
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
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="bg-[#34495e] border-[#577189] text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Description (Optional)</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-slate-100"
                placeholder="Any extra details..."
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
              disabled={isSubmitting || !formData.title || !formData.amount || (formData.personId === 'new' && !formData.newPersonName)}
            >
              {isSubmitting ? 'Saving...' : 'Save IOU'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}