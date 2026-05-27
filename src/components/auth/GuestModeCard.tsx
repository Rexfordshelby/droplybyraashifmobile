import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Package, Zap, ArrowRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { useToast } from '@/hooks/use-toast';

interface GuestModeCardProps {
  redirectTo?: string;
}

export function GuestModeCard({ redirectTo = '/send' }: GuestModeCardProps) {
  const { signInAsGuest, loading } = useGuestAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGuestSignIn = async () => {
    const { error, guestId } = await signInAsGuest();
    if (!error && guestId) {
      setGeneratedId(guestId);
    }
  };

  const handleCopyId = () => {
    if (generatedId) {
      navigator.clipboard.writeText(generatedId);
      setCopied(true);
      toast({
        title: 'ID Copied!',
        description: 'Save this ID to log back in within 24 hours.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    navigate(redirectTo);
  };

  if (generatedId) {
    return (
      <Card className="border-2 border-primary bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg text-primary">Your Guest ID</CardTitle>
              <CardDescription className="text-xs">Save this to log back in</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-card border-2 border-dashed border-primary/40 rounded-lg p-4 text-center">
            <p className="text-3xl font-mono font-bold tracking-widest text-foreground">
              {generatedId}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleCopyId} 
              variant="outline" 
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-success" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </>
              )}
            </Button>
            <Button 
              onClick={handleContinue}
              className="flex-1 btn-gradient"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            ⏰ Valid for 24 hours. Create an account anytime to keep your orders forever.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Quick Send</CardTitle>
            <CardDescription className="text-xs">No account needed</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>24hr session</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span>Track orders</span>
          </div>
        </div>
        
        <Button 
          onClick={handleGuestSignIn} 
          variant="outline" 
          className="w-full group"
          disabled={loading}
        >
          {loading ? (
            'Starting...'
          ) : (
            <>
              Continue as Guest
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          You'll get a unique ID to log back in within 24 hours
        </p>
      </CardContent>
    </Card>
  );
}
