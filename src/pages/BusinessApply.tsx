import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, Loader2, Mail, Phone, Store } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useBusiness } from '@/hooks/useBusiness';

const initialForm = {
  business_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  business_type: 'store',
  estimated_orders_per_month: 25,
  message: '',
};

export default function BusinessApply() {
  const { submitInquiry } = useBusiness();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const ok = await submitInquiry(form);
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
      setForm(initialForm);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl space-y-5 py-6 md:py-10">
        <Button variant="ghost" asChild>
          <Link to="/business">
            <ArrowLeft className="h-4 w-4" />
            Business
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="font-heading text-3xl font-bold">Connect your store</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Share your business details. Admin approval unlocks the store dashboard, B2P/B2B orders, batches, and invoice-ready history.
            </p>
            <div className="mt-5 space-y-3">
              {['Business profile review', 'Store dashboard after approval', 'Bulk and multi-stop delivery support'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <Card className="card-elevated">
            <CardContent className="p-5">
              {submitted && (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                  Your request is in. Droplix will review it and contact you.
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="business_name">Business name</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="business_name"
                        required
                        value={form.business_name}
                        onChange={(event) => update('business_name', event.target.value)}
                        className="pl-10"
                        placeholder="e.g. Rexford Store"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact person</Label>
                    <Input
                      id="contact_name"
                      required
                      value={form.contact_name}
                      onChange={(event) => update('contact_name', event.target.value)}
                      placeholder="Owner or operations lead"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Phone</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contact_phone"
                        required
                        inputMode="tel"
                        value={form.contact_phone}
                        onChange={(event) => update('contact_phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="pl-10"
                        placeholder="10-digit phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contact_email"
                        required
                        type="email"
                        value={form.contact_email}
                        onChange={(event) => update('contact_email', event.target.value)}
                        className="pl-10"
                        placeholder="store@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Business type</Label>
                    <Select value={form.business_type} onValueChange={(value) => update('business_type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store">Retail store</SelectItem>
                        <SelectItem value="restaurant">Restaurant / food</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy / medicine</SelectItem>
                        <SelectItem value="office">Office / documents</SelectItem>
                        <SelectItem value="supplier">Supplier / wholesale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="estimated_orders_per_month">Estimated orders per month</Label>
                    <Input
                      id="estimated_orders_per_month"
                      type="number"
                      min={0}
                      value={form.estimated_orders_per_month}
                      onChange={(event) => update('estimated_orders_per_month', parseInt(event.target.value, 10) || 0)}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="message">What do you need from Droplix?</Label>
                    <Textarea
                      id="message"
                      value={form.message}
                      onChange={(event) => update('message', event.target.value)}
                      placeholder="Daily parcels, fragile items, customer deliveries, supplier runs..."
                    />
                  </div>
                </div>

                <Button className="btn-gradient h-12 w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                  {submitting ? 'Sending request...' : 'Send business request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
