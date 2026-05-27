import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, Car, CheckCircle, ArrowRight, Zap, IndianRupee, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRider, VehicleType } from '@/hooks/useRider';

const vehicles = [
  { value: 'bicycle', label: 'Bicycle', icon: Bike, description: 'Eco-friendly' },
  { value: 'bike', label: 'Bike', icon: Bike, description: 'Fast delivery' },
  { value: 'scooter', label: 'Scooter', icon: Bike, description: 'Fuel efficient' },
  { value: 'car', label: 'Car', icon: Car, description: 'Large parcels' },
];

const benefits = [
  { icon: IndianRupee, title: 'Earn ₹15,000+/month', description: 'Top riders earn this working part-time' },
  { icon: Clock, title: 'Flexible Hours', description: 'Work when you want, be your own boss' },
  { icon: Zap, title: 'Instant Payouts', description: 'Get paid weekly to your bank account' },
];

export default function BecomeRider() {
  const { user, loading: authLoading, hasRole } = useAuth();
  const { rider, loading: riderLoading, applyAsRider } = useRider();
  const [vehicleType, setVehicleType] = useState<VehicleType>('bike');
  const [submitting, setSubmitting] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect to rider dashboard once the user is approved AND has the rider role.
  // Without checking the role, /rider's guard would bounce them right back here.
  useEffect(() => {
    if (justApproved && rider?.status === 'approved' && hasRole('rider')) {
      const t = setTimeout(() => navigate('/rider'), 1500);
      return () => clearTimeout(t);
    }
  }, [justApproved, rider, hasRole, navigate]);

  if (authLoading || riderLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (rider) {
    const isApproved = rider.status === 'approved';
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg mx-auto">
          <Card className="card-elevated text-center">
            <CardContent className="pt-8 pb-8">
              <div className={`h-24 w-24 mx-auto rounded-full flex items-center justify-center mb-6 ${isApproved ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                {isApproved ? (
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                ) : (
                  <Clock className="h-12 w-12 text-amber-500" />
                )}
              </div>
              
              <h1 className="font-heading text-3xl font-bold mb-4">
                {isApproved ? "🎉 You're a Rider!" : '⏳ Application Pending'}
              </h1>
              
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {isApproved 
                  ? 'Your account is active! Go to your dashboard and toggle "Go Online" to start receiving orders.' 
                  : "We're reviewing your application. You'll be notified once approved (usually within 24 hours)."}
              </p>

              {isApproved && (
                <div className="bg-primary/10 rounded-lg p-4 mb-6 text-left">
                  <p className="font-medium text-primary mb-2">🚀 Quick Start:</p>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Open Rider Dashboard</li>
                    <li>2. Flip the "Go Online" switch</li>
                    <li>3. Accept orders and start earning!</li>
                  </ol>
                </div>
              )}
              
              {isApproved && justApproved && (
                <p className="text-xs text-muted-foreground mb-3 animate-pulse">
                  Taking you to the rider dashboard…
                </p>
              )}

              <Button asChild className="btn-gradient w-full" size="lg">
                <Link to="/rider">
                  {isApproved ? 'Open Rider Dashboard' : 'View Status'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const result = await applyAsRider(vehicleType);
    setSubmitting(false);
    if (result) setJustApproved(true);
  };

  return (
    <MainLayout>
      <div className="container py-8 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Bike className="h-4 w-4" />
            Join 1000+ riders earning daily
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Earn Money <span className="text-primary">Delivering Parcels</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Be your own boss. Work flexible hours. Get paid weekly.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="card-elevated text-center">
              <CardContent className="pt-6">
                <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Application Form */}
        <div className="max-w-lg mx-auto">
          <Card className="card-elevated">
            <CardHeader className="text-center">
              <CardTitle className="font-heading text-2xl">Apply Now - It's Free!</CardTitle>
              <CardDescription>Takes less than 2 minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!user ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Sign in to apply as a rider</p>
                  <Button asChild size="lg" className="btn-gradient">
                    <Link to="/auth?tab=signup">
                      Sign Up / Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-base font-medium mb-4 block">
                      🚗 What vehicle will you use?
                    </Label>
                    <RadioGroup 
                      value={vehicleType} 
                      onValueChange={(v) => setVehicleType(v as VehicleType)} 
                      className="grid grid-cols-2 gap-4"
                    >
                      {vehicles.map((v) => (
                        <Label 
                          key={v.value} 
                          htmlFor={v.value} 
                          className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            vehicleType === v.value 
                              ? 'border-primary bg-primary/5 shadow-md' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <RadioGroupItem value={v.value} id={v.value} className="sr-only" />
                          <v.icon className={`h-8 w-8 mb-2 ${vehicleType === v.value ? 'text-primary' : ''}`} />
                          <span className="text-sm font-medium">{v.label}</span>
                          <span className="text-xs text-muted-foreground">{v.description}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Instant Approval Available!</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start earning as soon as you're approved
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full btn-gradient" 
                    size="lg" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    By applying, you agree to our terms of service
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}