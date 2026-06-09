import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, MapPin, ShieldCheck, Truck } from "lucide-react";
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
      <div className="container py-5 md:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button variant="ghost" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to orders
            </Link>
          </Button>
          <div className="hidden rounded-full border bg-card/90 px-3 py-1 text-xs font-semibold text-muted-foreground sm:block">
            Secure sender booking
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="min-w-0">
            <div className="mb-5 rounded-lg border bg-card/90 p-5 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                Mumbai delivery command
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <h1 className="font-heading text-3xl md:text-4xl font-bold">Send a parcel</h1>
                  <p className="text-muted-foreground mt-2 max-w-2xl">
                    Book the route, declare the item, share the receiver link, and keep verification in one flow.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border bg-background p-2">
                    <p className="text-xs font-semibold text-muted-foreground">Step</p>
                    <p className="text-lg font-bold">4</p>
                  </div>
                  <div className="rounded-md border bg-background p-2">
                    <p className="text-xs font-semibold text-muted-foreground">OTP</p>
                    <p className="text-lg font-bold">On</p>
                  </div>
                  <div className="rounded-md border bg-background p-2">
                    <p className="text-xs font-semibold text-muted-foreground">Proof</p>
                    <p className="text-lg font-bold">Ready</p>
                  </div>
                </div>
              </div>
            </div>
            <CreateOrderForm />
          </div>

          <aside className="xl:sticky xl:top-24 space-y-4">
            <Card className="card-elevated">
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="font-heading text-lg font-semibold">What happens next</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Built to avoid lost parcels, wrong OTPs, and confused handoffs.
                  </p>
                </div>
                <div className="space-y-3">
                  {flowPoints.map((point) => (
                    <div key={point.title} className="flex gap-3 rounded-md border bg-background/80 p-3">
                      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
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

            <Card className="border-emerald-500/30 bg-emerald-500/10">
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
