import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  PackageCheck,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const businessModes = [
  {
    title: 'B2P customer deliveries',
    detail: 'Send orders from your shop to customers with receiver tracking, OTP, and proof.',
    icon: PackageCheck,
  },
  {
    title: 'B2B supplier runs',
    detail: 'Move parcels between branches, offices, vendors, and partner stores.',
    icon: Building2,
  },
  {
    title: 'Store operations dashboard',
    detail: 'Track business orders, batches, receipts, credits, support, and delivery history.',
    icon: BarChart3,
  },
];

export default function Business() {
  return (
    <MainLayout>
      <div className="container space-y-8 py-6 md:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="rounded-full bg-primary text-primary-foreground">
              Built for Mumbai stores
            </Badge>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-normal sm:text-5xl">
                Business parcel delivery with proof, control, and support.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Droplix helps stores handle daily customer deliveries, supplier runs, multi-stop batches, and receipt-ready records without losing trust at handoff.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="btn-gradient h-12">
                <Link to="/business/apply">
                  Connect your store
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12">
                <Link to="/business/dashboard">Open store dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold">Store command center</p>
                <p className="text-sm text-muted-foreground">For B2P, B2B, and bulk delivery operations.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['2-8', 'stops per run'],
                ['OTP', 'receiver handoff'],
                ['Proof', 'photo chain'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-md border bg-background p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {businessModes.map((item) => (
            <Card key={item.title} className="card-elevated">
              <CardContent className="p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-heading text-2xl font-bold">What stores get after approval</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Bulk batches', ClipboardList],
                  ['GST/invoice-ready receipts', FileText],
                  ['Trusted riders and proof chain', ShieldCheck],
                  ['Priority human support', Users],
                ].map(([label, Icon]) => (
                  <div key={label as string} className="flex items-center gap-3 rounded-md border bg-background/70 p-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button asChild className="btn-gradient h-11">
              <Link to="/business/apply">Apply now</Link>
            </Button>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
