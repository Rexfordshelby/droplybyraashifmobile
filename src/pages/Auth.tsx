import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Zap, Phone, ShieldCheck } from 'lucide-react';
import { DroplixLogo } from '@/components/brand/DroplixLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useToast } from '@/hooks/use-toast';
import { requestSignupPhoneOtp, verifySignupPhoneOtp } from '@/lib/phoneVerification';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { signInAsGuest, loading: guestLoading } = useGuestAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', phone: '', otp: '', password: '', confirmPassword: '' },
  });

  const signupPhone = signupForm.watch('phone');
  const isPhoneVerified = Boolean(phoneVerificationToken && verifiedPhone === signupPhone);

  const resetPhoneVerification = () => {
    setVerifiedPhone('');
    setPhoneVerificationToken('');
  };

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    const { error } = await signIn(values.email, values.password);
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      navigate(redirectTo);
    }
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    if (!phoneVerificationToken || verifiedPhone !== values.phone) {
      toast({
        title: 'Phone verification required',
        description: 'Verify your phone with the SMS OTP before creating an account.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      values.email,
      values.password,
      values.fullName,
      values.phone,
      phoneVerificationToken
    );
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Account created! You can now sign in.' });
      navigate(redirectTo);
    }
  };

  const handleGuestLogin = async () => {
    const { error } = await signInAsGuest();
    if (!error) {
      navigate('/send');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle(redirectTo);
    setGoogleLoading(false);

    if (error) {
      toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSendSignupOtp = async () => {
    const phoneIsValid = await signupForm.trigger('phone');
    if (!phoneIsValid) return;

    setOtpLoading(true);
    resetPhoneVerification();
    try {
      await requestSignupPhoneOtp(signupForm.getValues('phone'));
      setOtpSent(true);
      signupForm.setValue('otp', '');
      toast({ title: 'OTP sent', description: 'Check your phone for the 6-digit Droplix code.' });
    } catch (error) {
      toast({
        title: 'Could not send OTP',
        description: error instanceof Error ? error.message : 'Check Twilio setup and try again.',
        variant: 'destructive',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    const phoneAndOtpValid = await signupForm.trigger(['phone', 'otp']);
    if (!phoneAndOtpValid) return;

    setVerifyLoading(true);
    try {
      const result = await verifySignupPhoneOtp(signupForm.getValues('phone'), signupForm.getValues('otp'));
      setVerifiedPhone(signupForm.getValues('phone'));
      setPhoneVerificationToken(result.verificationToken);
      toast({ title: 'Phone verified', description: 'You can now create your Droplix account.' });
    } catch (error) {
      resetPhoneVerification();
      toast({
        title: 'Wrong OTP',
        description: error instanceof Error ? error.message : 'Request a new OTP and try again.',
        variant: 'destructive',
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center cozy-gradient p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <DroplixLogo size={44} wordmarkClassName="text-2xl" />
        </Link>

        <Card className="glass-card animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Guest Mode Quick Access */}
            <div className="p-4 rounded-lg border-2 border-dashed bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Quick Send</p>
                  <p className="text-xs text-muted-foreground">Send a parcel without signing up</p>
                </div>
              </div>
              <Button 
                onClick={handleGuestLogin} 
                variant="outline" 
                className="h-12 w-full rounded-2xl"
                disabled={guestLoading}
              >
                {guestLoading ? 'Starting...' : 'Continue as Guest (24hr session)'}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-2xl border-border bg-background text-foreground hover:bg-muted"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading || guestLoading}
            >
              <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#1265E8] shadow-sm">
                G
              </span>
              {googleLoading ? 'Opening Google...' : 'Continue with Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <Tabs defaultValue={defaultTab}>
              <TabsList className="mb-6 grid h-12 w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="login" className="h-11 rounded-xl">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="h-11 rounded-xl">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl pl-11" placeholder="you@example.com" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl pl-11" type="password" placeholder="Enter password" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="btn-gradient h-12 w-full rounded-2xl" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <FormField control={signupForm.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl pl-11" placeholder="John Doe" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl pl-11" placeholder="you@example.com" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone number</FormLabel>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                              <Input
                                className="h-12 rounded-2xl pl-11"
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="10-digit mobile number"
                                {...field}
                                onChange={(event) => {
                                  field.onChange(event.target.value.replace(/\D/g, '').slice(0, 10));
                                  setOtpSent(false);
                                  signupForm.setValue('otp', '');
                                  resetPhoneVerification();
                                }}
                              />
                            </div>
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-2xl px-4"
                            onClick={handleSendSignupOtp}
                            disabled={otpLoading || loading || googleLoading || isPhoneVerified}
                          >
                            {otpLoading ? 'Sending' : otpSent ? 'Resend' : 'Send OTP'}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="otp" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMS OTP</FormLabel>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <FormControl>
                            <div className="relative">
                              <ShieldCheck className={`absolute left-3 top-3.5 h-5 w-5 ${isPhoneVerified ? 'text-primary' : 'text-muted-foreground'}`} />
                              <Input
                                className="h-12 rounded-2xl pl-11 tracking-[0.18em]"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000000"
                                disabled={!otpSent || isPhoneVerified}
                                {...field}
                                onChange={(event) => {
                                  field.onChange(event.target.value.replace(/\D/g, '').slice(0, 6));
                                  resetPhoneVerification();
                                }}
                              />
                            </div>
                          </FormControl>
                          <Button
                            type="button"
                            variant={isPhoneVerified ? 'secondary' : 'outline'}
                            className="h-12 rounded-2xl px-4"
                            onClick={handleVerifySignupOtp}
                            disabled={!otpSent || verifyLoading || loading || isPhoneVerified}
                          >
                            {isPhoneVerified ? 'Verified' : verifyLoading ? 'Checking' : 'Verify'}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl pl-11" type="password" placeholder="Enter password" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl pl-11" type="password" placeholder="Confirm password" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="btn-gradient h-12 w-full rounded-2xl" disabled={loading || !isPhoneVerified}>
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
