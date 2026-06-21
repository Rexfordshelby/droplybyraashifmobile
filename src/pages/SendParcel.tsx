import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, MapPin, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/MainLayout";
import { CreateOrderForm } from "@/components/orders/CreateOrderForm";
import { useAuth } from "@/hooks/useAuth";

const flowPoints = [
  {
    icon: MapPin,
    title: "Book clearly",
    copy: "Pickup, drop, phone numbers, item details, and optional photo.",
  },
  {
    icon: Truck,
    title: "Rider verifies pickup",
    copy: "The rider must scan your one-time pickup QR. Public order IDs are only for tracking.",
  },
  {
    icon: KeyRound,
    title: "Receiver controls OTP",
    copy: "The delivery OTP appears only on the receiver tracking link at drop-off.",
  },
];

export default function SendParcel() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <MainLayout showFooter={false}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <MainLayout showFooter={false}>
      <div className="app-screen container app-page-stack max-w-6xl py-4 md:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button variant="ghost" asChild className="rounded-full">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to orders
            </Link>
          </Button>
          <div className="app-action-pill hidden sm:inline-flex">
            Secure sender booking
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="min-w-0">
            <section className="app-hero mb-5 p-5 sm:p-6">
              <div className="app-hero-chip mb-4">
                <ShieldCheck className="h-4 w-4" />
                Mumbai delivery command
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <h1 className="font-heading text-3xl font-extrabold md:text-4xl">Send with confidence</h1>
                  <p className="app-hero-subtle mt-2 max-w-2xl text-sm leading-6 sm:text-base">
                    A guided handoff flow for pickup, protection, locked fare, receiver link, and OTP delivery.
                  </p>
                </div>
                <div className="app-metric-grid min-w-[260px]">
                  <div className="app-metric-tile">
                    <span>Flow</span>
                    <strong>4</strong>
                  </div>
                  <div className="app-metric-tile">
                    <span>OTP</span>
                    <strong>On</strong>
                  </div>
                  <div className="app-metric-tile">
                    <span>Proof</span>
                    <strong>Ready</strong>
                  </div>
                </div>
              </div>
            </section>
            <CreateOrderForm />
          </div>

          <aside className="xl:sticky xl:top-24 space-y-4">
            <Card className="app-card">
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="font-heading text-lg font-semibold">What happens next</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Built to avoid lost parcels, wrong OTPs, and confused handoffs.
                  </p>
                </div>
                <div className="space-y-3">
                  {flowPoints.map((point) => (
                    <div key={point.title} className="app-flow-card flex gap-3 p-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <point.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{point.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{point.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="app-card border-emerald-500/30 bg-emerald-500/10">
              <CardContent className="p-5 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    Best practice
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add the receiver phone number. It makes WhatsApp sharing and drop-off calls much smoother.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
