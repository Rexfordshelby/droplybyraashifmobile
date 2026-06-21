import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  Package,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Store,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';

const emptyAccountForm = {
  name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  business_type: 'store',
  gst_number: '',
  address: '',
  default_order_channel: 'b2p' as 'b2p' | 'b2b',
  monthly_volume_estimate: 25,
  notes: '',
};

function statusTone(status: string) {
  if (status === 'approved') return 'bg-emerald-600 text-white';
  if (status === 'suspended' || status === 'rejected') return 'bg-destructive text-destructive-foreground';
  return 'bg-amber-500 text-white';
}

export default function BusinessDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { accounts, activeAccount, batches, orders, loading, createBusinessAccount, createBatch } = useBusiness();
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [batchName, setBatchName] = useState('');
  const [batchStops, setBatchStops] = useState(3);
  const [batchNotes, setBatchNotes] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);

  const deliveredOrders = orders.filter((order) => order.status === 'delivered');
  const activeOrders = orders.filter((order) => ['pending', 'accepted', 'picked', 'in_transit'].includes(order.status));
  const totalSpend = orders.reduce((sum, order) => sum + Number(order.sender_paid_amount || order.fare_locked_amount || 0), 0);
  const channelMix = useMemo(() => ({
    b2p: orders.filter((order) => order.order_channel === 'b2p').length,
    b2b: orders.filter((order) => order.order_channel === 'b2b').length,
  }), [orders]);
  const accountMetrics: { label: string; value: string | number; icon: LucideIcon }[] = [
    { label: 'Active', value: activeOrders.length, icon: Clock3 },
    { label: 'Delivered', value: deliveredOrders.length, icon: CheckCircle2 },
    { label: 'B2P', value: channelMix.b2p, icon: Package },
    { label: 'Spend', value: `Rs ${Math.round(totalSpend).toLocaleString('en-IN')}`, icon: ReceiptText },
  ];

  if (authLoading) {
    return (
      <MainLayout showFooter={false}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const updateAccountForm = (key: keyof typeof accountForm, value: string | number) => {
    setAccountForm((current) => ({ ...current, [key]: value }));
  };

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAccount(true);
    const created = await createBusinessAccount(accountForm);
    setSavingAccount(false);
    if (created) setAccountForm(emptyAccountForm);
  };

  const submitBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeAccount) return;
    setSavingBatch(true);
    const created = await createBatch(activeAccount.id, batchName || `Batch ${new Date().toLocaleDateString('en-IN')}`, batchStops, batchNotes);
    setSavingBatch(false);
    if (created) {
      setBatchName('');
      setBatchStops(3);
      setBatchNotes('');
    }
  };

  return (
    <MainLayout showFooter={false}>
      <div className="app-screen container app-page-stack max-w-6xl py-4 md:py-8">
        <section className="app-hero p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="app-hero-chip">
              <Store className="h-3.5 w-3.5" />
              Store portal
            </div>
            <h1 className="mt-4 font-heading text-3xl font-extrabold sm:text-4xl">Business delivery cockpit</h1>
            <p className="app-hero-subtle mt-2 max-w-2xl text-sm leading-6 sm:text-base">
              Manage B2P customer deliveries, B2B supplier runs, batches, receipts, and approval status.
            </p>
          </div>
          <Button asChild className="h-12 rounded-2xl bg-white text-foreground shadow-xl hover:bg-white/92">
            <Link to="/send">
              Book business delivery
              <Send className="h-4 w-4" />
            </Link>
          </Button>
          </div>
        </section>

        {loading ? (
          <Card className="app-card">
            <CardContent className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="app-card">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Create your store profile</CardTitle>
              <CardDescription>Admin approval unlocks business delivery booking and store analytics.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={submitAccount}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="store-name">Store name</Label>
                  <Input id="store-name" required value={accountForm.name} onChange={(event) => updateAccountForm('name', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact person</Label>
                  <Input id="contact-name" required value={accountForm.contact_name} onChange={(event) => updateAccountForm('contact_name', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact phone</Label>
                  <Input
                    id="contact-phone"
                    required
                    inputMode="tel"
                    value={accountForm.contact_phone}
                    onChange={(event) => updateAccountForm('contact_phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact email</Label>
                  <Input id="contact-email" required type="email" value={accountForm.contact_email} onChange={(event) => updateAccountForm('contact_email', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Default channel</Label>
                  <Select value={accountForm.default_order_channel} onValueChange={(value) => updateAccountForm('default_order_channel', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="b2p">B2P - customers</SelectItem>
                      <SelectItem value="b2b">B2B - businesses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-type">Business type</Label>
                  <Input id="business-type" value={accountForm.business_type} onChange={(event) => updateAccountForm('business_type', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-volume">Monthly orders</Label>
                  <Input
                    id="monthly-volume"
                    type="number"
                    min={0}
                    value={accountForm.monthly_volume_estimate}
                    onChange={(event) => updateAccountForm('monthly_volume_estimate', parseInt(event.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Pickup/business address</Label>
                  <Textarea id="address" value={accountForm.address} onChange={(event) => updateAccountForm('address', event.target.value)} />
                </div>
                <Button className="btn-gradient h-11 md:col-span-2" disabled={savingAccount}>
                  {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                  {savingAccount ? 'Creating profile...' : 'Create store profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="app-card">
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-2xl font-bold">{activeAccount?.name}</h2>
                      {activeAccount && <Badge className={`rounded-full ${statusTone(activeAccount.status)}`}>{activeAccount.status}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeAccount?.contact_name || 'Store contact'} - {activeAccount?.contact_phone || 'phone pending'}
                    </p>
                    {activeAccount?.status !== 'approved' && (
                      <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                        Business delivery booking unlocks after admin approval. You can still use normal P2P delivery meanwhile.
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 lg:w-[460px]">
                  {accountMetrics.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border bg-background/80 p-3">
                      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                      <p className="text-lg font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="font-heading">Create delivery batch</CardTitle>
                  <CardDescription>Group multiple stops for business runs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={submitBatch}>
                    <div className="space-y-2">
                      <Label htmlFor="batch-name">Batch name</Label>
                      <Input id="batch-name" value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="Morning customer orders" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-stops">Stops</Label>
                      <Input id="batch-stops" type="number" min={1} max={8} value={batchStops} onChange={(event) => setBatchStops(parseInt(event.target.value, 10) || 1)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-notes">Notes</Label>
                      <Textarea id="batch-notes" value={batchNotes} onChange={(event) => setBatchNotes(event.target.value)} placeholder="Fragile, cash handling, preferred pickup time..." />
                    </div>
                    <Button className="h-11 w-full" disabled={!activeAccount || activeAccount.status !== 'approved' || savingBatch}>
                      {savingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create batch
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="font-heading">Recent business orders</CardTitle>
                  <CardDescription>B2P/B2B history for invoices, support, and repeat delivery planning.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="rounded-lg border bg-muted/30 p-5 text-center">
                      <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="font-semibold">No business orders yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">Book your first approved store delivery from the send flow.</p>
                    </div>
                  ) : (
                    orders.slice(0, 6).map((order) => (
                      <Link key={order.id} to={`/track/${order.id}`} className="flex items-center gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-muted/50">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{order.item_description}</p>
                          <p className="text-xs text-muted-foreground">{order.order_channel.toUpperCase()} - {order.status.replace('_', ' ')}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="app-card border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">B2B/B2P best practice</p>
                    <p className="text-sm text-muted-foreground">Use protected or premium protected for fragile, medicine, electronics, and high-value customer deliveries.</p>
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link to="/send">Send from store</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
