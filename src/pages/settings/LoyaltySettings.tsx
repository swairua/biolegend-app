import { useState } from 'react';
import { Shield, Coins } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { useCustomers } from '@/hooks/useDatabase';
import { useLoyaltyAdminMutations, useLoyaltySettings } from '@/hooks/useLoyalty';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function LoyaltySettings() {
  const { isAdmin } = useAuth();
  const { currentCompany } = useCurrentCompany();
  const { data: settings } = useLoyaltySettings();
  const { data: customers } = useCustomers(currentCompany?.id);
  const { settings: saveSettings, adjust } = useLoyaltyAdminMutations();
  const [rate, setRate] = useState('1');
  const [customerId, setCustomerId] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');

  if (!isAdmin) {
    return <Card><CardContent className="pt-6 text-center"><Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">Access Denied</h2><p className="text-sm text-muted-foreground">Only administrators can manage loyalty points.</p></CardContent></Card>;
  }

  const saveRate = async () => {
    try { await saveSettings.mutateAsync(Number(rate)); toast.success('Loyalty conversion rate saved'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save conversion rate'); }
  };

  const submitAdjustment = async (value: number) => {
    if (!customerId || !Number.isInteger(value) || value === 0 || !reason.trim()) { toast.error('Choose a customer, enter a non-zero whole number, and provide a reason'); return; }
    try { await adjust.mutateAsync({ customerId, points: value, reason: reason.trim() }); setPoints(''); setReason(''); toast.success('Loyalty points updated'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update loyalty points'); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold">Loyalty Points</h1><p className="text-muted-foreground">Configure the point value and make audited customer adjustments.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" />Point conversion</CardTitle></CardHeader><CardContent className="flex items-end gap-4"><div className="space-y-2"><Label>KES value per point</Label><Input type="number" min="0.01" step="0.01" value={rate === '1' && settings?.kes_per_point ? String(settings.kes_per_point) : rate} onChange={event => setRate(event.target.value)} /></div><Button onClick={saveRate} disabled={saveSettings.isPending}>Save rate</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Manual adjustment</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Customer</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers?.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Points</Label><Input type="number" step="1" value={points} onChange={event => setPoints(event.target.value)} placeholder="Use a negative value to remove" /></div></div><div className="space-y-2"><Label>Reason</Label><Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Required audit reason" /></div><div className="flex gap-2"><Button onClick={() => submitAdjustment(Math.abs(Number(points)))} disabled={adjust.isPending}>Add points</Button><Button variant="outline" onClick={() => submitAdjustment(-Math.abs(Number(points)))} disabled={adjust.isPending}>Remove points</Button></div></CardContent></Card>
  </div>;
}
