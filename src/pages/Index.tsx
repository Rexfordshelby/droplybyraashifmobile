import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  CheckCircle,
  Clock,
  IndianRupee,
  KeyRound,
  MapPin,
  Package,
  Phone,
  Shield,
  Truck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import { FAQ } from '@/components/FAQ';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';

const featureCards = [
  {
    icon: Clock,
    title: 'Same-day moves',
    description: 'Fast local delivery for documents, food, clothes, gifts, and small parcels.',
  },
  {
    icon: KeyRound,
    title: 'OTP handoff',
    description: 'Pickup and delivery checks reduce wrong handoffs and confused receivers.',
  },
  {
    icon: Shield,
    title: 'Clear limits',
    description: 'Declared item value, fragile flags, proof photos, and clear rider instructions.',
  },
  {
    icon: IndianRupee,
    title: 'Simple pricing',
    description: 'Transparent route pricing with free-delivery promos for new senders.',
  },
];

const workflow = [
  {
    title: 'Book',
    detail: 'Enter pickup, drop, phones, item type, and value.',
  },
  {
    title: 'Match',
    detail: 'An approved rider accepts and sees the next best action.',
  },
  {
    title: 'Verify',
    detail: 'QR pickup, receiver OTP, proof photo, and live updates.',
  },
];

const trustPoints = [
  'Receiver tracking link',
  'Rider approval controls',
  'Admin support queue',
  'Delivery proof uploads',
];

const deliverySteps = [
  {
    title: 'Book a parcel',
    detail: 'Pickup, drop, item value and receiver phone.',
    icon: Package,
  },
  {
    title: 'Rider picks it up',
    detail: 'Approved rider follows one focused route.',
    icon: Bike,
  },
  {
    title: 'Receiver confirms OTP',
    detail: 'Delivery closes only after secure verification.',
    icon: KeyRound,
  },
];

export default function Index() {
  const { user } = useAuth();
  const { signInAsGuest, loading: guestLoading } = useGuestAuth();
  const navigate = useNavigate();

  const handleQuickSend = async () => {
    if (user) {
      navigate('/send');
      return;
    }

    const { error } = await signInAsGuest();
    if (!error) navigate('/send');
  };

  return (
    <MainLayout>
      <section className="home-hero-section">
        <div className="home-hero-shell mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="home-hero-grid">
            <div className="min-w-0">
              <div className="home-promo-badge">
                <Zap className="h-4 w-4" />
                First 2 deliveries free for new users
              </div>

              <h1 className="home-hero-title mt-5">
                Mumbai parcel delivery with <span>complete control</span> from booking to handoff.
              </h1>

              <p className="home-hero-copy mt-5">
                Book local deliveries in minutes, follow every stage of the journey, and confirm secure handoffs with OTP verification.
              </p>

              <div className="home-hero-actions mt-7">
                <Button
                  size="lg"
                  className="home-primary-button text-base"
                  onClick={handleQuickSend}
                  disabled={guestLoading}
                >
                  <Package className="h-5 w-5" />
                  {guestLoading ? 'Starting order' : 'Send a parcel'}
                </Button>
                <Button asChild size="lg" variant="outline" className="home-secondary-button text-base">
                  <Link to="/become-rider">
                    <Bike className="h-5 w-5" />
                    Become a rider
                  </Link>
                </Button>
              </div>

              <div className="home-trust-list mt-7">
                <div className="home-trust-item">
                  <Shield className="h-4 w-4" />
                  OTP-secured delivery
                </div>
                <div className="home-trust-item">
                  <CheckCircle className="h-4 w-4" />
                  Verified rider workflow
                </div>
                <div className="home-trust-item">
                  <Truck className="h-4 w-4" />
                  Live delivery updates
                </div>
              </div>
            </div>

            <div className="home-visual-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase text-[var(--brand-blue)]">Live delivery flow</p>
                  <h2 className="mt-1 font-heading text-2xl font-bold text-[var(--heading)]">Secure handoff dashboard</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">
                    A clear route, single rider focus, and OTP confirmation at the receiver side.
                  </p>
                </div>
                <span className="rounded-full border border-[var(--teal-border)] bg-[var(--soft-teal)] px-3 py-1 text-xs font-bold text-[var(--teal-text)]">
                  OTP ready
                </span>
              </div>

              <div className="home-route-panel mt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--muted-text)]">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Pickup
                    </div>
                    <p className="mt-2 font-semibold text-[var(--heading)]">Andheri West</p>
                    <p className="text-xs text-[var(--muted-text)]">Sender QR verified</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--muted-text)]">
                      <Package className="h-3.5 w-3.5 text-[var(--brand-blue)]" />
                      Drop
                    </div>
                    <p className="mt-2 font-semibold text-[var(--heading)]">Bandra East</p>
                    <p className="text-xs text-[var(--muted-text)]">Receiver OTP pending</p>
                  </div>
                </div>

                <div className="home-route-line" />

                <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted-text)]">
                  <span>Booked</span>
                  <span>Picked up</span>
                  <span>Delivered</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {deliverySteps.map((step, index) => (
                  <div key={step.title} className="home-step-row">
                    <div className="home-step-icon">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--heading)]">{step.title}</p>
                      <p className="text-xs leading-5 text-[var(--muted-text)]">{step.detail}</p>
                    </div>
                    <span className="rounded-full bg-[var(--brand-blue-light)] px-2.5 py-1 text-xs font-bold text-[var(--brand-blue)]">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="home-process-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--soft-teal)] text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[var(--soft-teal)] px-2.5 py-1 text-xs font-bold text-[var(--teal-text)]">Ready</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-[var(--heading)]">Live route</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--body-text)]">
                Pickup and drop details stay visible so sender, rider, and receiver know what happens next.
              </p>
            </div>

            <div className="home-process-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-blue-light)] text-[var(--brand-blue)]">
                <Bike className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[var(--heading)]">Rider focus</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--body-text)]">
                Single-delivery mode keeps the handoff simple, trackable, and easier for support to audit.
              </p>
            </div>

            <div className="home-process-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--soft-teal)] text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[var(--heading)]">Support view</h3>
              <div className="mt-3 space-y-2">
                {trustPoints.slice(0, 3).map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm font-semibold text-[var(--body-text)]">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-white py-6">
        <div className="container grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <div key={point} className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-[var(--heading)]">{point}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Built for real deliveries</p>
              <h2 className="mt-2 font-heading text-3xl font-bold md:text-4xl">A better flow for everyone involved</h2>
            </div>
            <p className="max-w-xl text-muted-foreground">
              The product now separates sender booking, rider execution, admin support, and receiver confirmation.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => (
              <Card key={feature.title} className="card-elevated hover-lift">
                <CardHeader className="pb-3">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card/70 py-16 md:py-20">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">How it works</p>
              <h2 className="mt-2 font-heading text-3xl font-bold md:text-4xl">From request to delivery proof</h2>
              <p className="mt-4 text-muted-foreground">
                The flow is intentionally simple: the sender describes the job, the rider accepts one route, and the receiver confirms completion.
              </p>
              <Button className="btn-gradient mt-6" onClick={handleQuickSend} disabled={guestLoading}>
                Start booking
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3">
              {workflow.map((item, index) => (
                <div key={item.title} className="section-shell flex gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <div className="section-shell grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Pricing</p>
              <h2 className="mt-2 font-heading text-3xl font-bold">Transparent local pricing</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Use the in-app estimate, offer a fair rider payout, and keep payment instructions visible through the whole order.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-5 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Starts from</p>
              <div className="mt-2 flex items-end justify-center gap-1">
                <span className="text-4xl font-bold">Rs 30</span>
                <span className="pb-1 text-sm text-muted-foreground">+ Rs 8/km</span>
              </div>
              <Button className="btn-gradient mt-5 w-full" onClick={handleQuickSend} disabled={guestLoading}>
                Calculate order
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card/70 py-16 md:py-20">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Rider network</p>
              <h2 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Earn on routes that are easier to complete</h2>
              <p className="mt-4 text-muted-foreground">
                Rider mode keeps the next action visible, gives quick call/navigation controls, and supports delivery proof upload.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {['Flexible hours', 'Verified order flow', 'Clear payout view', 'Admin support'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="h-4 w-4 text-success" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="section-shell p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Rider today</p>
                  <p className="font-heading text-2xl font-bold">3 deliveries queued</p>
                </div>
                <Bike className="h-8 w-8 text-primary" />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-md border bg-background p-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Call sender or receiver without searching</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border bg-background p-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Open route in maps from the order card</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border bg-background p-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Complete with OTP and proof photo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQ />

      <section className="py-16">
        <div className="container">
          <div className="section-shell p-6 text-center md:p-10">
            <h2 className="font-heading text-3xl font-bold">Ready to send your first parcel?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Start as a guest or sign in to keep your full order history.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="btn-gradient" onClick={handleQuickSend} disabled={guestLoading}>
                Send now
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth?tab=signup">Create account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
