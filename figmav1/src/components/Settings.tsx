import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Users, UserPlus, Trash2, FileText, DollarSign, Edit } from 'lucide-react';
import { householdAPI, userAPI, templateAPI } from '../utils/api';

interface SettingsProps {
  accessToken: string;
  user: any;
  household: any;
  onHouseholdUpdate: () => void;
}

export function Settings({ accessToken, user, household, onHouseholdUpdate }: SettingsProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [householdName, setHouseholdName] = useState(household?.name || '');
  const [currency, setCurrency] = useState(household?.currency || 'USD');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setHouseholdName(household?.name || '');
    setCurrency(household?.currency || 'USD');
  }, [household]);

  const loadTemplates = async () => {
    try {
      const data = await templateAPI.getAll(accessToken);
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleUpdateHousehold = async () => {
    setLoading(true);
    try {
      await householdAPI.update(household.id, { 
        name: householdName,
        currency: currency,
      }, accessToken);
      setEditing(false);
      onHouseholdUpdate();
      alert('Household updated successfully');
    } catch (error) {
      console.error('Failed to update household:', error);
      alert('Failed to update household');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await householdAPI.addMember(household.id, inviteEmail, accessToken);
      setInviteEmail('');
      onHouseholdUpdate();
      alert('Member invited successfully');
    } catch (error) {
      console.error('Failed to invite member:', error);
      alert(error instanceof Error ? error.message : 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await householdAPI.removeMember(household.id, memberId, accessToken);
      onHouseholdUpdate();
      alert('Member removed successfully');
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-white">Settings</h2>

      {/* Household Information */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">Household Information</CardTitle>
              <CardDescription className="text-[#c1d3e0]">
                Basic information about your household
              </CardDescription>
            </div>
            {!editing && (
              <Button
                onClick={() => setEditing(true)}
                variant="outline"
                className="bg-[#34495e] border-[#577189] hover:bg-[#3d5a80] text-[#c1d3e0]"
              >
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <label className="text-[#c1d3e0]">Household Name</label>
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="bg-[#34495e] border-[#577189] text-white"
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
                    <SelectItem value="CHF">CHF (Fr)</SelectItem>
                    <SelectItem value="CNY">CNY (¥)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#a7b8c5]">
                  All amounts will be displayed in this currency
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditing(false);
                    setHouseholdName(household?.name || '');
                    setCurrency(household?.currency || 'USD');
                  }}
                  variant="outline"
                  className="flex-1 bg-[#34495e] border-[#577189] hover:bg-[#3d5a80] text-[#c1d3e0]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateHousehold}
                  className="flex-1 bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[#a7b8c5]">Household Name</label>
                <p className="text-white mt-1">{household?.name}</p>
              </div>
              <div>
                <label className="text-[#a7b8c5]">Currency</label>
                <p className="text-white mt-1 flex items-center gap-2">
                  <DollarSign size={16} className="text-[#69d2bb]" />
                  {household?.currency}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Household Members */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users size={20} className="text-[#69d2bb]" />
            Household Members
          </CardTitle>
          <CardDescription className="text-[#c1d3e0]">
            Manage members who have access to this household
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite Member */}
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email to invite"
              className="bg-[#34495e] border-[#577189] text-white"
            />
            <Button
              onClick={handleInviteMember}
              disabled={loading}
              className="bg-[#69d2bb] hover:bg-[#5bc4ab] text-[#2c3e50]"
            >
              <UserPlus size={18} className="mr-2" />
              Invite
            </Button>
          </div>

          {/* Members List */}
          <div className="border border-[#577189] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#577189]">
                  <TableHead className="text-[#c1d3e0]">Name</TableHead>
                  <TableHead className="text-[#c1d3e0]">Email</TableHead>
                  <TableHead className="text-[#c1d3e0] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {household?.members?.map((member: any) => (
                  <TableRow key={member.id} className="border-[#577189]">
                    <TableCell className="text-white">{member.name}</TableCell>
                    <TableCell className="text-[#c1d3e0]">{member.email}</TableCell>
                    <TableCell className="text-right">
                      {member.id !== user.id && household.members.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-[#ee8b88] hover:text-[#ee6c4d] hover:bg-[#ee6c4d]/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                      {member.id === user.id && (
                        <span className="text-[#69d2bb] text-sm">You</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Data Import Templates */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText size={20} className="text-[#69d2bb]" />
            Data Import Templates
          </CardTitle>
          <CardDescription className="text-[#c1d3e0]">
            Saved column mappings for CSV imports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-[#c1d3e0]">
              <p>No templates saved yet</p>
              <p className="text-sm mt-2 text-[#a7b8c5]">
                Templates are created when you upload a CSV file and save the column mapping
              </p>
            </div>
          ) : (
            <div className="border border-[#577189] rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#577189]">
                    <TableHead className="text-[#c1d3e0]">Template Name</TableHead>
                    <TableHead className="text-[#c1d3e0]">Created</TableHead>
                    <TableHead className="text-[#c1d3e0]">Skip Rows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} className="border-[#577189]">
                      <TableCell className="text-white">{template.name}</TableCell>
                      <TableCell className="text-[#c1d3e0]">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-[#c1d3e0]">{template.skipRows}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="bg-[#3d5a80] border-[#577189]">
        <CardHeader>
          <CardTitle className="text-white">Your Profile</CardTitle>
          <CardDescription className="text-[#c1d3e0]">
            Your personal account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#a7b8c5]">Name</label>
              <p className="text-white mt-1">{user?.name}</p>
            </div>
            <div>
              <label className="text-[#a7b8c5]">Email</label>
              <p className="text-white mt-1">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
