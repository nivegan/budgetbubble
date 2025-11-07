//
// 📄 NEW FILE: figmav1/src/components/GiftTracker.tsx
//
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, UserPlus, Gift } from 'lucide-react';
import { giftAPI, peopleAPI } from '../utils/api';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface GiftTrackerProps {
  accessToken: string;
  householdId: string;
  gifts: any[];
  people: any[];
  loadData: () => void;
  loading: boolean;
}

export function GiftTracker({ 
  accessToken, 
  householdId, 
  gifts, 
  people, 
  loadData, 
  loading 
}: GiftTrackerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filterPerson, setFilterPerson] = useState('all');

  const [formData, setFormData] = useState({
    id: null,
    direction: 'gave', // 'gave' or 'received'
    personId: '',
    newPersonName: '',
    occasion: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

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
        occasion: formData.occasion,
        description: formData.description,
        direction: formData.direction,
        date: formData.date,
      };

      await giftAPI.create(data, accessToken);
      toast.success('Gift entry saved');

      setShowDialog(false);
      resetFormData();
      loadData();
    } catch (error) {
      console.error('Failed to save gift:', error);
      toast.error('Failed to save gift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      id: null,
      direction: 'gave',
      personId: '',
      newPersonName: '',
      occasion: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const filteredGifts = useMemo(() => {
    return gifts
      .filter(gift => filterPerson === 'all' || gift.personId === filterPerson)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [gifts, filterPerson]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-white text-2xl font-semibold">Gift Tracker</h2>
        <Button
          onClick={() => {
            resetFormData();
            setShowDialog(true);
          }}
          className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
        >
          <Plus size={18} className="mr-2" />
          Add Gift
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="pt-6 flex gap-4">
          <Select value={filterPerson} onValueChange={setFilterPerson}>
            <SelectTrigger className="w-full bg-[#34495e] border-[#577189] text-slate-100">
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

      {/* Gift Table */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading gift ledger...</div>
          ) : filteredGifts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No gifts found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Direction</TableHead>
                  <TableHead className="text-slate-300">Person</TableHead>
                  <TableHead className="text-slate-300">Occasion</TableHead>
                  <TableHead className="text-slate-300">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGifts.map((gift) => {
                  const person = people.find(p => p.id === gift.personId);
                  return (
                    <TableRow key={gift.id} className="border-slate-700">
                      <TableCell className="text-slate-300">
                        {new Date(gift.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-slate-100 capitalize">
                        {gift.direction}
                      </TableCell>
                      <TableCell className="text-slate-300">{person?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-slate-300">{gift.occasion}</TableCell>
                      <TableCell className="text-slate-300">{gift.description}</TableCell>
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
            <DialogTitle>Add Gift</DialogTitle>
            <DialogDescription className="text-slate-400">
              Log a gift you gave or received.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-slate-300">Direction</label>
              <Select value={formData.direction} onValueChange={(val) => setFormData({ ...formData, direction: val })}>
                <SelectTrigger className="bg-[#34495e] border-[#577189] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#34495e] border-[#577189] text-white">
                  <SelectItem value="gave">Gave Gift</SelectItem>
                  <SelectItem value="received">Received Gift</SelectItem>
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
                  placeholder="e.g., Jane Smith"
                />
              </div>
            )}
            
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
              <label className="text-slate-300">Occasion</label>
              <Input
                value={formData.occasion}
                onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-slate-100"
                placeholder="e.g., Birthday, Christmas"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300">Description / Gift Idea</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#34495e] border-[#577189] text-slate-100"
                placeholder="e.g., Red Scarf, $50 Amazon Voucher"
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
              disabled={isSubmitting || !formData.occasion || (formData.personId === 'new' && !formData.newPersonName)}
            >
              {isSubmitting ? 'Saving...' : 'Save Gift'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}