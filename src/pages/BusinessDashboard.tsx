import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Headphones,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
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

const onboardingBenefits = [
  'Admin-approved store profile',
  'B2P and B2B order channels',
  'Batch planning for multi-stop runs',
  'Receipt-ready delivery history',
];

function statusTone(status: string) {
  if (status === 'approved') return 'bg-emerald-600 text-white';
  if (status === 'suspended' || status === 'rejected') return 'bg-destructive text-destructive-foreground';
  return 'bg-amber-500 text-foreground';
}

function formatInr(value: number) {
  return `Rs ${Math.round(value).toLocaleString('en-IN')}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function orderStatusTone(status: string) {
  if (status === 'delivered') return 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'cancelled') return 'bg-destructive/10 text-destructive';
  if (status === 'pending') return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
  return 'bg-primary/10 text-primary';
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
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const activeBatches = batches.filter((batch) => ['draft', 'active'].includes(batch.status));
  const totalSpend = orders.reduce((sum, order) => sum + Number(order.sender_paid_amount || order.fare_locked_amount || 0), 0);
  const isApproved = activeAccount?.status === 'approved';
  const completionRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;
  const averageFare = orders.length > 0 ? totalSpend / orders.length : 0;

  const channelMix = useMemo(() => ({
    b2p: orders.filter((order) => order.order_channel === 'b2p').length,
    b2b: orders.filter((order) => order.order_channel === 'b2b').length,
  }), [orders]);

  const accountMetrics: { label: string; value: string | number; detail: string; icon: LucideIcon }[] = [
    { label: 'Active', value: activeOrders.length, detail: 'Need attention', icon: Clock3 },
    { label: 'Delivered', value: deliveredOrders.length, detail: `${completionRate}% complete`, icon: CheckCircle2 },
    { label: 'Spend', value: formatInr(totalSpend), detail: `${formatInr(averageFare)} avg`, icon: ReceiptText },
    { label: 'Batches', value: batches.length, detail: `${activeBatches.length} open`, icon: ClipboardList },
  ];

  const setupSteps = [
    {
      label: 'Store profile',
      detail: accounts.length > 0 ? 'Created' : 'Add contact and pickup details',
      done: accounts.length > 0,
    },
    {
      label: 'Admin approval',
      detail: isApproved ? 'Approved for business orders' : 'Waiting for Droplix review',
      done: isApproved,
    },
    {
      label: 'First delivery',
      detail: orders.length > 0 ? `${orders.length} business orders` : 'Book from the send flow',
      done: orders.length > 0,
    },
    {
      label: 'Batch workflow',
      detail: batches.length > 0 ? `${batches.length} batches created` : 'Group store runs',
      done: batches.length > 0,
    },
  ];

  const channelCards = [
    {
      title: 'B2P customer orders',
      detail: 'Shop to customer parcels with receiver tracking, OTP handoff, proof photos, and support.',
      stat: channelMix.b2p,
      statLabel: 'B2P orders',
      icon: PackageCheck,
    },
    {
      title: 'B2B supplier runs',
      detail: 'Store to store, branch to office, and vendor handoffs with fare lock and proof trail.',
      stat: channelMix.b2b,
      statLabel: 'B2B orders',
      icon: Building2,
    },
    {
      title: 'Bulk delivery batches',
      detail: 'Plan 2 to 8 stops for daily store routes before assigning deliveries.',
      stat: activeBatches.length,
      statLabel: 'open batches',
      icon: Users,
    },
  ];

  const nextAction = !activeAccount
    ? {
        title: 'Create your store profile',
        detail: 'Add business details once. Approval unlocks B2P, B2B, batches, and store analytics.',
        action: 'Start profile',
        href: '#store-profile',
        icon: Store,
      }
    : !isApproved
      ? {
          title: 'Approval in progress',
          detail: 'Your store dashboard is ready. Business booking unlocks after admin approval.',
          action: 'Send as P2P',
          href: '/send',
          icon: AlertCircle,
        }
      : orders.length === 0
        ? {
            title: 'Book the first store delivery',
            detail: 'Choose business delivery in the send flow and attach this approved store account.',
            action: 'Book delivery',
            href: '/send',
            icon: Send,
          }
        : activeOrders.length > 0
          ? {
              title: 'Monitor active handoffs',
              detail: `${activeOrders.length} business ${activeOrders.length === 1 ? 'order needs' : 'orders need'} live tracking.`,
              action: 'Review orders',
              href: '#business-orders',
              icon: Clock3,
            }
          : {
              title: 'Plan the next store run',
              detail: 'Create a batch for morning customer orders, supplier returns, or repeat routes.',
              action: 'Create batch',
              href: '#batch-planner',
              icon: ClipboardList,
            };
  const NextActionIcon = nextAction.icon;

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
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <div className="app-hero-chip">
                <Store className="h-3.5 w-3.5" />
                Store command center
              </div>
              <h1 className="mt-4 font-heading text-3xl font-extrabold sm:text-4xl">Business delivery cockpit</h1>
              <p className="app-hero-subtle mt-2 max-w-2xl text-sm leading-6 sm:text-base">
                Run B2P customer deliveries, B2B supplier moves, multi-stop batches, receipts, and proof trails from one clear workflow.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[340px]">
              <Button asChild className="app-solid-cta h-12 rounded-2xl">
                <Link to="/send">
                  <Send className="h-4 w-4" />
                  {isApproved ? 'Book store delivery' : 'Send parcel'}
                </Link>
              </Button>
              <Button asChild className="app-muted-cta h-12 rounded-2xl">
                <Link to="/business/apply">
                  <Headphones className="h-4 w-4" />
                  Talk to Droplix
                </Link>
              </Button>
            </div>
          </div>

          <div className="app-metric-grid mt-5">
            {accountMetrics.map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="app-metric-tile">
                <span>{label}</span>
                <strong>{loading ? '-' : value}</strong>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/70">
                  <Icon className="h-3.5 w-3.5" />
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <Card className="business-cockpit-panel rounded-[1.35rem]">
            <CardContent className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card id="store-profile" className="business-cockpit-panel rounded-[1.35rem]">
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
              <CardTitle className="font-heading text-2xl">Create your store profile</CardTitle>
              <CardDescription>Admin approval unlocks business delivery booking, batches, analytics, and receipt-ready history.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2 sm:p-6 sm:pt-2">
              <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={submitAccount}>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="store-name">Store name</Label>
                    <Input id="store-name" className="h-12 rounded-2xl" required value={accountForm.name} onChange={(event) => updateAccountForm('name', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Contact person</Label>
                    <Input id="contact-name" className="h-12 rounded-2xl" required value={accountForm.contact_name} onChange={(event) => updateAccountForm('contact_name', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Contact phone</Label>
                    <Input
                      id="contact-phone"
                      className="h-12 rounded-2xl"
                      required
                      inputMode="tel"
                      value={accountForm.contact_phone}
                      onChange={(event) => updateAccountForm('contact_phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Contact email</Label>
                    <Input id="contact-email" className="h-12 rounded-2xl" required type="email" value={accountForm.contact_email} onChange={(event) => updateAccountForm('contact_email', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Default channel</Label>
                    <Select value={accountForm.default_order_channel} onValueChange={(value) => updateAccountForm('default_order_channel', value)}>
                      <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="b2p">B2P - customers</SelectItem>
                        <SelectItem value="b2b">B2B - businesses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-type">Business type</Label>
                    <Input id="business-type" className="h-12 rounded-2xl" value={accountForm.business_type} onChange={(event) => updateAccountForm('business_type', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly-volume">Monthly orders</Label>
                    <Input
                      id="monthly-volume"
                      className="h-12 rounded-2xl"
                      type="number"
                      min={0}
                      value={accountForm.monthly_volume_estimate}
                      onChange={(event) => updateAccountForm('monthly_volume_estimate', parseInt(event.target.value, 10) || 0)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Pickup/business address</Label>
                    <Textarea id="address" className="min-h-24 rounded-2xl" value={accountForm.address} onChange={(event) => updateAccountForm('address', event.target.value)} />
                  </div>
                  <Button className="btn-gradient h-12 rounded-2xl md:col-span-2" disabled={savingAccount}>
                    {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                    {savingAccount ? 'Creating profile...' : 'Create store profile'}
                  </Button>
                </form>

                <aside className="rounded-2xl border bg-secondary/45 p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-heading text-lg font-bold">Approval flow</p>
                      <p className="text-sm text-muted-foreground">Designed for B2B, B2P, and daily store routes.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {onboardingBenefits.map((benefit, index) => (
                      <div key={benefit} className="business-flow-step flex items-center gap-3 rounded-2xl p-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        <span className="text-sm font-semibold">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <section className="business-cockpit-panel rounded-[1.35rem] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <NextActionIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="profile-eyebrow">Next best action</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold">{nextAction.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextAction.detail}</p>
                    <Button asChild className="btn-gradient mt-4 h-11 rounded-2xl">
                      <Link to={nextAction.href}>
                        {nextAction.action}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>

              <section className="business-cockpit-panel rounded-[1.35rem] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="profile-eyebrow">Store status</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold">{activeAccount?.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {activeAccount?.address || activeAccount?.city || 'Mumbai pickup address pending'}
                    </p>
                  </div>
                  {activeAccount && <Badge className={`rounded-full px-3 py-1 ${statusTone(activeAccount.status)}`}>{activeAccount.status}</Badge>}
                </div>

                {!isApproved && (
                  <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                    Business booking unlocks after admin approval. Normal parcel sending still works while review is pending.
                  </div>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  {setupSteps.map((step) => (
                    <div key={step.label} className={`business-flow-step rounded-2xl p-3 ${step.done ? 'is-done' : ''}`}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase text-muted-foreground">{step.label}</span>
                        {step.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
              {channelCards.map(({ title, detail, stat, statLabel, icon: Icon }) => (
                <Link key={title} to="/send" className="business-channel-card rounded-[1.25rem] p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-heading text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
                  <div className="mt-4 rounded-2xl border bg-background/68 p-3">
                    <p className="text-2xl font-black text-primary">{stat}</p>
                    <p className="text-xs font-bold uppercase text-muted-foreground">{statLabel}</p>
                  </div>
                </Link>
              ))}
            </section>

            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
              <section id="batch-planner" className="business-cockpit-panel rounded-[1.35rem] p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="profile-eyebrow">Batch planner</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold">Create delivery batch</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Group multiple stops for customer drops, supplier runs, or repeat store routes.</p>
                  </div>
                  <Badge variant="outline" className="rounded-full">{activeBatches.length} open</Badge>
                </div>

                <form className="space-y-4" onSubmit={submitBatch}>
                  <div className="space-y-2">
                    <Label htmlFor="batch-name">Batch name</Label>
                    <Input id="batch-name" className="h-12 rounded-2xl" value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="Morning customer orders" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[0.6fr_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="batch-stops">Stops</Label>
                      <Input id="batch-stops" className="h-12 rounded-2xl" type="number" min={1} max={8} value={batchStops} onChange={(event) => setBatchStops(parseInt(event.target.value, 10) || 1)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-notes">Notes</Label>
                      <Input id="batch-notes" className="h-12 rounded-2xl" value={batchNotes} onChange={(event) => setBatchNotes(event.target.value)} placeholder="Fragile, cash, pickup time" />
                    </div>
                  </div>
                  <Button className="btn-gradient h-12 w-full rounded-2xl" disabled={!activeAccount || !isApproved || savingBatch}>
                    {savingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {isApproved ? 'Create batch' : 'Approval required'}
                  </Button>
                </form>

                {batches.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <p className="text-sm font-bold">Recent batches</p>
                    {batches.slice(0, 3).map((batch) => (
                      <div key={batch.id} className="business-order-row rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{batch.name}</p>
                            <p className="text-xs text-muted-foreground">{batch.total_stops} stops - {batch.status}</p>
                          </div>
                          <Badge variant="outline" className="rounded-full">{new Date(batch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section id="business-orders" className="business-cockpit-panel rounded-[1.35rem] p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="profile-eyebrow">Live history</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold">Business orders</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Use this list for tracking, support, receipts, and repeat delivery planning.</p>
                  </div>
                  <Badge variant="outline" className="rounded-full">{pendingOrders.length} pending</Badge>
                </div>

                {orders.length === 0 ? (
                  <div className="rounded-2xl border bg-secondary/45 p-6 text-center">
                    <ClipboardList className="mx-auto mb-3 h-9 w-9 text-primary" />
                    <p className="font-heading text-lg font-bold">No business orders yet</p>
                    <p className="mt-2 text-sm text-muted-foreground">Book your first approved store delivery from the send flow.</p>
                    <Button asChild className="btn-gradient mt-4 h-11 rounded-2xl">
                      <Link to="/send">Book first delivery</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 6).map((order) => (
                      <Link key={order.id} to={`/track/${order.id}`} className="business-order-row flex items-center gap-3 rounded-2xl p-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{order.item_description}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {order.order_channel.toUpperCase()} - {formatInr(Number(order.sender_paid_amount || order.fare_locked_amount || order.price_offered || 0))}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${orderStatusTone(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="business-cockpit-panel rounded-[1.35rem] p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-bold">Store operating rhythm</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Use B2P for customer parcels, B2B for supplier or branch handoffs, and protected tiers for fragile, medicine, electronics, and high-value orders.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="app-muted-cta h-11 rounded-2xl">
                  <Link to="/business">View business features</Link>
                </Button>
              </div>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}
