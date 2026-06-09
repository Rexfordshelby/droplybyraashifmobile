import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Clock3, Loader2, MessageSquareText, Repeat, ShieldCheck, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Order } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';

interface RiderReviewCardProps {
  order: Order;
}

const REVIEW_TAGS = [
  'Professional',
  'Fast',
  'Handled fragile items carefully',
  'Good communication',
  'Polite',
  'Reliable for business',
  'High-value parcel ready',
  'Would request again',
  'Late delivery',
  'Parcel mishandled',
  'Poor communication',
];

const BUSINESS_CONTEXTS = [
  'Daily orders',
  'Fragile parcels',
  'High-value deliveries',
  'Same-day deliveries',
  'Emergency delivery',
];

function QuestionToggle({
  icon,
  label,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-lg border bg-background/80 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant={value ? 'default' : 'outline'}
          className={value ? 'btn-gradient' : ''}
          onClick={() => onChange(true)}
        >
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!value ? 'destructive' : 'outline'}
          onClick={() => onChange(false)}
        >
          No
        </Button>
      </div>
    </div>
  );
}

export function RiderReviewCard({ order }: RiderReviewCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [safe, setSafe] = useState(true);
  const [onTime, setOnTime] = useState(true);
  const [trustAgain, setTrustAgain] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [businessContext, setBusinessContext] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canReview = Boolean(user && order.status === 'delivered' && order.rider_id && order.sender_id === user?.id);
  const trustScore = useMemo(() => [safe, onTime, trustAgain].filter(Boolean).length, [onTime, safe, trustAgain]);

  useEffect(() => {
    if (!canReview) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadReview = async () => {
      const { data } = await supabase
        .from('rider_reviews')
        .select('id, parcel_arrived_safely, was_on_time, trust_again, review_tags, business_context, notes')
        .eq('order_id', order.id)
        .maybeSingle();

        if (!isMounted || !data) return;
        setReviewId(data.id);
        setSafe(data.parcel_arrived_safely);
        setOnTime(data.was_on_time);
        setTrustAgain(data.trust_again);
        setSelectedTags(data.review_tags || []);
        setBusinessContext(data.business_context || '');
        setNotes(data.notes || '');
    };

    loadReview()
      .catch(() => undefined)
      .then(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [canReview, order.id]);

  if (!canReview) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const saveReview = async () => {
    if (!user || !order.rider_id) return;

    setSaving(true);
    const { data, error } = await supabase
      .from('rider_reviews')
      .upsert(
        {
          order_id: order.id,
          rider_id: order.rider_id,
          reviewer_id: user.id,
          parcel_arrived_safely: safe,
          was_on_time: onTime,
          trust_again: trustAgain,
          review_tags: selectedTags,
          business_context: businessContext || null,
          notes: notes.trim() || null,
        },
        { onConflict: 'order_id' },
      )
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      toast({
        title: 'Review not saved',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setReviewId(data.id);
    toast({
      title: reviewId ? 'Review updated' : 'Review submitted',
      description: 'This now improves the rider trust profile.',
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading review system...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Rate the handoff trust</p>
          <p className="text-xs text-muted-foreground">
            These answers shape rider reliability, not just a basic star rating.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 border-primary/25 bg-background">
          {trustScore}/3 trust
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuestionToggle
          icon={<ShieldCheck className="h-4 w-4 text-primary" />}
          label="Parcel safe?"
          value={safe}
          onChange={setSafe}
        />
        <QuestionToggle
          icon={<Clock3 className="h-4 w-4 text-primary" />}
          label="On time?"
          value={onTime}
          onChange={setOnTime}
        />
        <QuestionToggle
          icon={<Repeat className="h-4 w-4 text-primary" />}
          label="Trust again?"
          value={trustAgain}
          onChange={setTrustAgain}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Tags className="h-4 w-4 text-primary" />
          Review tags
        </div>
        <div className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant={selectedTags.includes(tag) ? 'default' : 'outline'}
              size="sm"
              className={selectedTags.includes(tag) ? 'btn-gradient h-8 rounded-full' : 'h-8 rounded-full bg-background'}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Useful for businesses</p>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_CONTEXTS.map((context) => (
            <Button
              key={context}
              type="button"
              variant={businessContext === context ? 'default' : 'outline'}
              size="sm"
              className={businessContext === context ? 'btn-gradient h-8 rounded-full' : 'h-8 rounded-full bg-background'}
              onClick={() => setBusinessContext((current) => (current === context ? '' : context))}
            >
              {context}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText className="h-4 w-4 text-primary" />
          Short note
        </div>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value.slice(0, 240))}
          placeholder="Optional detail for support or future business senders"
          className="min-h-20 resize-none bg-background"
        />
      </div>

      <Button className="w-full btn-gradient" onClick={saveReview} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {reviewId ? 'Update trust review' : 'Submit trust review'}
      </Button>
    </div>
  );
}
