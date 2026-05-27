import { Link, useNavigate } from 'react-router-dom';
import { Package, Truck, Shield, Clock, MapPin, IndianRupee, ArrowRight, Bike, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import { FAQ } from '@/components/FAQ';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';

const features = [
  {
    icon: Clock,
    title: 'Same Day Delivery',
    description: 'Get your parcels delivered within hours, not days',
  },
  {
    icon: MapPin,
    title: 'Real-time Tracking',
    description: 'Track your delivery status from pickup to drop-off',
  },
  {
    icon: Shield,
    title: 'Secure Delivery',
    description: 'OTP-verified delivery ensures your parcel reaches the right person',
  },
  {
    icon: IndianRupee,
    title: 'Affordable Pricing',
    description: 'Transparent pricing starting at just ₹30 + ₹8/km',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Book a Delivery',
    description: 'Enter pickup and drop addresses, describe your item, and set your price',
  },
  {
    step: 2,
    title: 'Rider Accepts',
    description: 'A nearby rider accepts your order and heads to pickup location',
  },
  {
    step: 3,
    title: 'Track & Receive',
    description: 'Track the delivery in real-time and receive with OTP verification',
  },
];

export default function Index() {
  const { user } = useAuth();
  const { signInAsGuest, loading: guestLoading } = useGuestAuth();
  const navigate = useNavigate();

  const handleQuickSend = async () => {
    if (user) {
      navigate('/send');
    } else {
      const { error } = await signInAsGuest();
      if (!error) {
        navigate('/send');
      }
    }
  };

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="container py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-emerald-500/30">
                <Zap className="h-4 w-4" />
                🎁 First 2 deliveries FREE for new users
              </div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Mumbai's Fastest{' '}
                <span className="text-primary">Parcel Delivery</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                Send parcels across the city with our network of reliable riders. 
                Same-day delivery, real-time tracking, and secure OTP verification.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="btn-gradient text-lg"
                  onClick={handleQuickSend}
                  disabled={guestLoading}
                >
                  <Package className="mr-2 h-5 w-5" />
                  {guestLoading ? 'Starting...' : 'Quick Send'}
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg">
                  <Link to="/become-rider">
                    <Bike className="mr-2 h-5 w-5" />
                    Become a Rider
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Guest users get a 24-hour session. <Link to="/auth?tab=signup" className="text-primary hover:underline">Create an account</Link> to track all orders.
              </p>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-success/20 rounded-3xl blur-3xl" />
              <Card className="card-elevated relative z-10">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-success/10 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-success animate-soft-pulse" />
                      <div>
                        <p className="text-sm font-medium">Pickup: Andheri West</p>
                        <p className="text-xs text-muted-foreground">Near Metro Station</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">Drop: Bandra East</p>
                        <p className="text-xs text-muted-foreground">BKC Complex</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Estimated Price</span>
                      <span className="text-2xl font-bold">₹78</span>
                    </div>
                    <Button className="w-full btn-gradient" disabled>
                      <Truck className="mr-2 h-4 w-4" />
                      Rider on the way!
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access CTA for Mobile */}
      <section className="lg:hidden py-4 bg-primary/5 sticky top-16 z-40">
        <div className="container">
          <Button 
            className="w-full btn-gradient"
            size="lg"
            onClick={handleQuickSend}
            disabled={guestLoading}
          >
            <Zap className="mr-2 h-5 w-5" />
            {guestLoading ? 'Starting...' : 'Send Parcel Now - No Signup'}
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Why Choose Droply?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We make local deliveries simple, fast, and affordable for everyone
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-elevated text-center">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get your parcel delivered in 3 simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <IndianRupee className="h-12 w-12 mx-auto text-primary mb-6" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mb-8">
              No hidden charges. Pay only for what you use.
            </p>
            <Card className="card-elevated inline-block">
              <CardContent className="p-8">
                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="text-5xl font-bold">₹30</span>
                  <span className="text-muted-foreground">base</span>
                  <span className="text-3xl font-bold">+</span>
                  <span className="text-5xl font-bold">₹8</span>
                  <span className="text-muted-foreground">/km</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Example: 5km delivery = ₹30 + (5 × ₹8) = <strong>₹70</strong>
                </p>
                <Button onClick={handleQuickSend} className="btn-gradient" disabled={guestLoading}>
                  Calculate Your Price
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Rider CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Bike className="h-16 w-16 mx-auto text-primary mb-6" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Want to Earn with Your Vehicle?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join our rider network and earn money on your own schedule. 
              Whether you have a bicycle, bike, scooter, or car - we welcome you!
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Flexible hours</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Weekly payouts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Be your own boss</span>
              </div>
            </div>
            <Button asChild size="lg" className="btn-gradient">
              <Link to="/become-rider">
                Apply Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Final CTA */}
      <section className="py-20">
        <div className="container">
          <Card className="card-elevated bg-gradient-to-r from-primary/10 to-success/10 border-0">
            <CardContent className="py-12 text-center">
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                Ready to Send Your First Parcel?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of users who trust Droply for their delivery needs. 
                No signup required to get started!
              </p>
              <Button 
                size="lg" 
                className="btn-gradient text-lg"
                onClick={handleQuickSend}
                disabled={guestLoading}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
