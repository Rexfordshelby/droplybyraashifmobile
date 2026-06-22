import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowRightLeft,
  Building2,
  Camera,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flame,
  Gift,
  IndianRupee,
  Loader2,
  Mail,
  MessageCircle,
  MapPin,
  Package,
  Phone,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useOrders } from '@/hooks/useOrders';
import { useServiceZones } from '@/hooks/useServiceZones';
import { type FreeDeliveryEligibility, usePromos } from '@/hooks/usePromos';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { LiabilityDisclaimer } from './LiabilityDisclaimer';
import { MumbaiAreaPicker } from './MumbaiAreaPicker';
import { MUMBAI_AREAS, MumbaiArea, haversineKm, findMumbaiArea } from '@/data/mumbaiAreas';
import { consumeOrderDraft } from '@/lib/orderDrafts';
import { readOrderMemory, rememberOrderDetails, type OrderMemory } from '@/lib/orderMemory';
import {
  deliveryPriorityOptions,
  getEtaPrediction,
  getPriorityFee,
  getProtectionQuote,
  protectionPlans,
  supportChannelOptions,
  type DeliveryPriority,
  type ProtectionTier,
  type SupportChannel,
} from '@/lib/trustFeatures';
import { DROPLIX_SUPPORT_EMAIL, DROPLIX_SUPPORT_MAILTO } from '@/lib/contact';

const formSchema = z.object({
  pickup_address: z.string().min(10, 'Enter complete pickup address'),
  pickup_landmark: z.string().optional(),
  drop_address: z.string().min(10, 'Enter complete drop address'),
  drop_landmark: z.string().optional(),
  item_description: z.string().min(3, 'Describe your item'),
  item_category: z.string().min(1, 'Choose an item category'),
  item_value: z.number().min(0, 'Invalid item value').max(20000, 'Items above ₹20,000 are not supported'),
  is_fragile: z.boolean().default(false),
  sender_phone: z.string().min(10, 'Enter valid 10-digit phone number'),
  receiver_phone: z.string().optional(),
  price_offered: z.number().min(0, 'Invalid price'),
  estimated_distance: z.number().min(1, 'Enter distance'),
  protection_tier: z.enum(['basic', 'protected', 'premium']).default('basic'),
  delivery_priority: z.enum(['standard', 'scheduled', 'emergency']).default('standard'),
  scheduled_for: z.string().optional(),
  business_order: z.boolean().default(false),
  business_account_id: z.string().optional(),
  business_batch_id: z.string().optional(),
  business_name: z.string().optional(),
  order_channel: z.enum(['p2p', 'b2p', 'b2b']).default('p2p'),
  multi_stop_count: z.number().min(1).max(8).default(1),
  trusted_rider_required: z.boolean().default(false),
  support_channel: z.enum(['whatsapp', 'call']).default('whatsapp'),
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
  { id: 1, title: 'Pickup', icon: MapPin, description: 'Where to collect?' },
  { id: 2, title: 'Drop', icon: Truck, description: 'Where to deliver?' },
  { id: 3, title: 'Item', icon: Package, description: 'What is it?' },
  { id: 4, title: 'Confirm', icon: Check, description: 'Price and send' },
];

const itemCategories = [
  { value: 'documents', label: 'Documents' },
  { value: 'food', label: 'Food parcel' },
  { value: 'clothes', label: 'Clothes' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'other', label: 'Other small parcel' },
];

function getCategoryLabel(value: string) {
  return itemCategories.find((category) => category.value === value)?.label ?? 'Other small parcel';
}

const prohibitedItemKeywords = [
  'alcohol',
  'cash',
  'diamond',
  'drug',
  'explosive',
  'gold',
  'jewellery',
  'jewelry',
  'knife',
  'weapon',
];

const cautionItemKeywords = [
  'camera',
  'glass',
  'laptop',
  'medicine',
  'mobile',
  'passport',
  'phone',
  'tablet',
  'watch',
];

function getItemSafety(description: string) {
  const normalized = description.toLowerCase();
  const prohibited = prohibitedItemKeywords.find((keyword) => normalized.includes(keyword));
  const caution = cautionItemKeywords.find((keyword) => normalized.includes(keyword));

  if (prohibited) {
    return {
      level: 'blocked' as const,
      title: 'This item is not supported',
      description: `${prohibited} is in the blocked/high-risk list. Please remove it or contact support before booking.`,
    };
  }

  if (caution) {
    return {
      level: 'caution' as const,
      title: 'Extra care needed',
      description: `For ${caution}, use strong packaging and keep value under ₹20,000.`,
    };
  }

  if (description.trim().length >= 3) {
    return {
      level: 'ok' as const,
      title: 'Item looks bookable',
      description: 'The rider will see this description before accepting.',
    };
  }

  return {
    level: 'empty' as const,
    title: 'Add item details',
    description: 'Clear item details help riders accept faster.',
  };
}

export function CreateOrderForm() {
  const { createOrder } = useOrders();
  const { zones, calculatePrice } = useServiceZones();
  const { freeRemaining, checkFreeDeliveryEligibility, refetch: refetchPromo } = usePromos();
  const { accounts: businessAccounts } = useBusiness();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [showTermsHint, setShowTermsHint] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [pickupArea, setPickupArea] = useState<MumbaiArea | null>(null);
  const [dropArea, setDropArea] = useState<MumbaiArea | null>(null);
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [itemPhotoPreview, setItemPhotoPreview] = useState<string | null>(null);
  const [orderMemory, setOrderMemory] = useState<OrderMemory>(() => readOrderMemory());
  const [freeEligibility, setFreeEligibility] = useState<FreeDeliveryEligibility>({
    eligible: false,
    remaining: 0,
    accountRemaining: freeRemaining,
    phoneRemaining: 0,
    normalizedPhone: null,
    phoneRequired: true,
    reason: null,
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Photo too large',
        description: 'Choose a photo under 5 MB.',
        variant: 'destructive',
      });
      return;
    }
    setItemPhoto(file);
    setItemPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (itemPhotoPreview) URL.revokeObjectURL(itemPhotoPreview);
    setItemPhoto(null);
    setItemPhotoPreview(null);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickup_address: '',
      pickup_landmark: '',
      drop_address: '',
      drop_landmark: '',
      item_description: '',
      item_category: 'documents',
      item_value: 0,
      is_fragile: false,
      sender_phone: '',
      receiver_phone: '',
      price_offered: 50,
      estimated_distance: 5,
      protection_tier: 'basic',
      delivery_priority: 'standard',
      scheduled_for: '',
      business_order: false,
      business_account_id: '',
      business_batch_id: '',
      business_name: '',
      order_channel: 'p2p',
      multi_stop_count: 1,
      trusted_rider_required: false,
      support_channel: 'whatsapp',
    },
  });

  // Hydrate from "Send Again" draft on mount
  useEffect(() => {
    const draft = consumeOrderDraft();
    if (!draft) return;
    form.reset({
      pickup_address: draft.pickup_address,
      pickup_landmark: draft.pickup_landmark ?? '',
      drop_address: draft.drop_address,
      drop_landmark: draft.drop_landmark ?? '',
      item_description: draft.item_description,
      item_category: 'documents',
      item_value: 0,
      is_fragile: false,
      sender_phone: draft.sender_phone,
      receiver_phone: draft.receiver_phone ?? '',
      price_offered: 50,
      estimated_distance: draft.estimated_distance,
      protection_tier: 'basic',
      delivery_priority: 'standard',
      scheduled_for: '',
      business_order: false,
      business_account_id: '',
      business_batch_id: '',
      business_name: '',
      order_channel: 'p2p',
      multi_stop_count: 1,
      trusted_rider_required: false,
      support_channel: 'whatsapp',
    });
    // Try to match Mumbai areas from address strings ("Andheri West, Mumbai")
    const tryMatch = (addr: string) => {
      const first = addr.split(',')[0]?.trim();
      return first ? findMumbaiArea(first) ?? MUMBAI_AREAS.find(a => addr.includes(a.name)) : undefined;
    };
    const p = tryMatch(draft.pickup_address);
    const d = tryMatch(draft.drop_address);
    if (p) setPickupArea(p);
    if (d) setDropArea(d);
    setMaxReachedStep(4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOrderMemory(readOrderMemory());
  }, []);

  // Auto-calculate distance when both areas picked
  useEffect(() => {
    if (pickupArea && dropArea) {
      const distance = Math.max(1, Math.ceil(haversineKm(pickupArea, dropArea)));
      form.setValue('estimated_distance', distance);
    }
  }, [pickupArea, dropArea, form]);

  // Pick the most appropriate Mumbai zone (Mumbai Suburbs by default)
  const mumbaiZone = zones.find(z => z.name === 'Mumbai Suburbs') || zones.find(z => z.city === 'Mumbai') || null;
  const estimatedDistance = form.watch('estimated_distance');
  const suggestedPrice = calculatePrice(mumbaiZone, estimatedDistance);
  const minimumPrice = Math.round(suggestedPrice);
  const priceOffered = form.watch('price_offered');
  const itemDescription = form.watch('item_description');
  const itemCategory = form.watch('item_category');
  const itemValue = form.watch('item_value');
  const isFragile = form.watch('is_fragile');
  const senderPhone = form.watch('sender_phone');
  const protectionTier = form.watch('protection_tier') as ProtectionTier;
  const deliveryPriority = form.watch('delivery_priority') as DeliveryPriority;
  const scheduledFor = form.watch('scheduled_for');
  const businessOrder = form.watch('business_order');
  const businessAccountId = form.watch('business_account_id');
  const orderChannel = form.watch('order_channel');
  const multiStopCount = form.watch('multi_stop_count');
  const trustedRiderRequired = form.watch('trusted_rider_required');
  const supportChannel = form.watch('support_channel') as SupportChannel;
  const approvedBusinessAccounts = useMemo(
    () => businessAccounts.filter((account) => account.status === 'approved'),
    [businessAccounts],
  );
  const selectedBusinessAccount = approvedBusinessAccounts.find((account) => account.id === businessAccountId) ?? null;
  const businessNeedsApprovedAccount = businessOrder && approvedBusinessAccounts.length === 0;
  const businessMissingSelection = businessOrder && approvedBusinessAccounts.length > 0 && !businessAccountId;
  const useFreeDelivery = !businessOrder && freeEligibility.eligible && freeEligibility.remaining > 0;

  useEffect(() => {
    const digits = senderPhone.replace(/\D/g, '');
    if (freeRemaining <= 0 || digits.length < 10) {
      setFreeEligibility({
        eligible: false,
        remaining: 0,
        accountRemaining: freeRemaining,
        phoneRemaining: 0,
        normalizedPhone: digits.length >= 10 ? digits.slice(-10) : null,
        phoneRequired: digits.length < 10,
        reason: digits.length < 10 ? 'Enter your 10-digit phone to check free delivery.' : null,
      });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      checkFreeDeliveryEligibility(senderPhone).then((result) => {
        if (!cancelled) setFreeEligibility(result);
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [checkFreeDeliveryEligibility, freeRemaining, senderPhone]);

  useEffect(() => {
    if (businessOrder && approvedBusinessAccounts.length === 1 && !businessAccountId) {
      const account = approvedBusinessAccounts[0];
      form.setValue('business_account_id', account.id);
      form.setValue('business_name', account.name);
      form.setValue('order_channel', account.default_order_channel || 'b2p');
    }

    if (!businessOrder) {
      form.setValue('business_account_id', '');
      form.setValue('business_batch_id', '');
      form.setValue('order_channel', 'p2p');
    }
  }, [approvedBusinessAccounts, businessAccountId, businessOrder, form]);

  // Keep price_offered in sync with suggested price when promo is used.
  useEffect(() => {
    if (useFreeDelivery) {
      form.setValue('price_offered', minimumPrice);
    }
  }, [useFreeDelivery, minimumPrice, form]);

  const itemSafety = useMemo(() => getItemSafety(itemDescription || ''), [itemDescription]);
  const protectionQuote = useMemo(() => getProtectionQuote(protectionTier, itemValue), [itemValue, protectionTier]);
  const priorityFee = getPriorityFee(deliveryPriority);
  const etaPrediction = useMemo(
    () => getEtaPrediction(estimatedDistance, deliveryPriority),
    [deliveryPriority, estimatedDistance],
  );
  const riderPayout = useFreeDelivery ? minimumPrice : Math.max(priceOffered, minimumPrice);
  const addOnFee = protectionQuote.fee + priorityFee;
  const lockedFare = useFreeDelivery ? addOnFee : riderPayout + addOnFee;
  const hasPaidAddOns = useFreeDelivery && addOnFee > 0;
  const priceTooLow = !useFreeDelivery && priceOffered < minimumPrice;
  const itemBlocked = itemSafety.level === 'blocked' || itemValue > 20000;
  const scheduleMissing = deliveryPriority === 'scheduled' && !scheduledFor;
  const currentStepMeta = steps[currentStep - 1];
  const CurrentStepIcon = currentStepMeta.icon;
  const businessBlocked = businessNeedsApprovedAccount || businessMissingSelection;
  const canSubmitOrder = liabilityAccepted && !priceTooLow && !itemBlocked && !scheduleMissing && !businessBlocked;
  const submitHelpText = itemBlocked
    ? 'This item cannot be sent through Droplix. Check the item description and declared value before booking.'
    : priceTooLow
      ? `Offer at least Rs ${minimumPrice} so riders see a fair payout.`
      : scheduleMissing
        ? 'Choose a pickup slot for scheduled delivery.'
        : businessNeedsApprovedAccount
          ? 'Create and get an approved store profile before using business delivery.'
          : businessMissingSelection
            ? 'Choose the approved store account for this business delivery.'
            : !liabilityAccepted
              ? 'Accept the safety terms before sending this order live.'
              : null;

  const applyRememberedAddress = (field: 'pickup_address' | 'drop_address', address: string) => {
    form.setValue(field, address, { shouldDirty: true, shouldValidate: true });
    const area = findMumbaiArea(address.split(',')[0]?.trim()) ?? MUMBAI_AREAS.find((item) => address.includes(item.name));
    if (field === 'pickup_address' && area) setPickupArea(area);
    if (field === 'drop_address' && area) setDropArea(area);
  };

  const applyRememberedPhone = (field: 'sender_phone' | 'receiver_phone', phone: string) => {
    form.setValue(field, phone.replace(/\D/g, '').slice(0, 10), { shouldDirty: true, shouldValidate: true });
  };

  const handlePickupAreaChange = (area: MumbaiArea | null) => {
    setPickupArea(area);
    if (area) {
      const current = form.getValues('pickup_address');
      // If user hasn't typed yet or only had a previous area, prefill
      if (!current || current.endsWith(', Mumbai') || current.includes('Mumbai')) {
        form.setValue('pickup_address', `${area.name}, Mumbai`);
      }
    }
  };

  const handleDropAreaChange = (area: MumbaiArea | null) => {
    setDropArea(area);
    if (area) {
      const current = form.getValues('drop_address');
      if (!current || current.endsWith(', Mumbai') || current.includes('Mumbai')) {
        form.setValue('drop_address', `${area.name}, Mumbai`);
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    if (!liabilityAccepted) {
      setShowTermsHint(true);
      const message = 'Accept the safety terms before sending this order live.';
      setSubmitError(message);
      toast({
        title: 'Safety terms required',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (priceTooLow) {
      const message = `Offer at least ₹${minimumPrice} before confirming the order.`;
      setSubmitError(message);
      toast({
        title: 'Increase the delivery price',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (itemBlocked) {
      const message = 'This item is blocked or too risky for Droplix. Please change the item description.';
      setSubmitError(message);
      toast({
        title: 'Item not supported',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (scheduleMissing) {
      const message = 'Choose a pickup slot before confirming scheduled delivery.';
      setSubmitError(message);
      toast({
        title: 'Pickup slot required',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (businessBlocked) {
      const message = businessNeedsApprovedAccount
        ? 'Create and get an approved store profile before using business delivery.'
        : 'Choose an approved store account for this business delivery.';
      setSubmitError(message);
      toast({
        title: 'Business approval required',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const enrichedItemDescription = [
        values.item_description.trim(),
        `Category: ${getCategoryLabel(values.item_category)}`,
        values.item_value > 0 ? `Declared value: ₹${values.item_value}` : 'Declared value: not provided',
        values.is_fragile ? 'Fragile: yes' : null,
      ].filter(Boolean).join(' · ');

      const order = await createOrder({
        pickup_address: values.pickup_address,
        pickup_landmark: values.pickup_landmark,
        drop_address: values.drop_address,
        drop_landmark: values.drop_landmark,
        item_description: enrichedItemDescription,
        sender_phone: values.sender_phone,
        receiver_phone: values.receiver_phone,
        price_offered: useFreeDelivery ? minimumPrice : Math.max(values.price_offered, minimumPrice),
        suggested_price: suggestedPrice,
        distance_km: values.estimated_distance,
        is_promo_free: useFreeDelivery,
        item_photo: itemPhoto,
        protection_tier: values.protection_tier,
        protection_fee: protectionQuote.fee,
        protection_coverage: protectionQuote.coverage,
        fare_locked: true,
        fare_locked_amount: lockedFare,
        delivery_priority: values.delivery_priority,
        priority_fee: priorityFee,
        scheduled_for: values.delivery_priority === 'scheduled' ? values.scheduled_for || null : null,
        business_order: values.business_order,
        business_account_id: values.business_order ? values.business_account_id || null : null,
        business_batch_id: values.business_order ? values.business_batch_id || null : null,
        business_name: values.business_order
          ? selectedBusinessAccount?.name || values.business_name || null
          : null,
        order_channel: values.business_order ? values.order_channel : 'p2p',
        multi_stop_count: values.business_order ? values.multi_stop_count : 1,
        trusted_rider_required: values.trusted_rider_required || values.protection_tier === 'premium',
        support_channel: values.support_channel,
        estimated_eta_minutes: etaPrediction.minutes,
        eta_confidence: etaPrediction.confidence,
        guarantee_credit_amount: values.delivery_priority === 'emergency' ? 50 : 20,
        sender_paid_amount: lockedFare,
        platform_paid_amount: useFreeDelivery ? riderPayout : 0,
      });

      if (order) {
        rememberOrderDetails({
          pickup_address: values.pickup_address,
          drop_address: values.drop_address,
          sender_phone: values.sender_phone,
          receiver_phone: values.receiver_phone,
        });
        setOrderMemory(readOrderMemory());
        await refetchPromo();
        navigate('/dashboard');
        return;
      }

      setSubmitError('The order was not created. If this is a fresh Supabase project, run supabase/droplix_full_schema.sql and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = async () => {
    setSubmitError(null);
    let canProceed = true;
    if (currentStep === 1) canProceed = await form.trigger(['pickup_address']);
    else if (currentStep === 2) canProceed = await form.trigger(['drop_address']);
    else if (currentStep === 3) canProceed = await form.trigger(['item_description', 'item_category', 'item_value', 'sender_phone']);

    if (canProceed && currentStep < 4) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxReachedStep((m) => Math.max(m, next));
    }
  };

  const goBack = () => currentStep > 1 && setCurrentStep(prev => prev - 1);
  const progressPercent = (currentStep / 4) * 100;

  return (
    <div className="w-full max-w-none space-y-5">
      {/* Free delivery banner */}
      {useFreeDelivery && (
        <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                You have {freeEligibility.remaining} free {freeEligibility.remaining === 1 ? 'delivery' : 'deliveries'} left
              </p>
              <p className="text-sm text-muted-foreground">
                This account and sender phone are eligible. This delivery is on us.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {!useFreeDelivery && freeRemaining > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="py-3 text-sm text-amber-900 dark:text-amber-100">
            {freeEligibility.reason || 'Each account and sender phone can use only 2 free deliveries.'}
          </CardContent>
        </Card>
      )}

      {/* Progress Header */}
      <Card className="app-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-success to-accent" />
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Step {currentStep} of 4</span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CurrentStepIcon className="h-4 w-4" />
                {currentStepMeta.title}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const reachable = step.id <= maxReachedStep;
              const isCurrent = step.id === currentStep;
              const completed = step.id < currentStep;
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => reachable && !isCurrent && setCurrentStep(step.id)}
                  disabled={!reachable}
                  className={`flex min-w-0 flex-col items-center rounded-md px-1 py-2 transition-all ${reachable ? 'text-primary' : 'text-muted-foreground'} ${isCurrent ? 'bg-primary/10' : ''} ${reachable && !isCurrent ? 'cursor-pointer hover:bg-primary/5' : 'cursor-default'}`}
                >
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center text-sm font-bold mb-1 transition-all ${
                    completed
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : reachable
                          ? 'bg-primary/10 text-primary border border-primary/40'
                          : 'bg-muted text-muted-foreground'
                  }`}>
                    {completed ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className="hidden text-xs sm:block">{step.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Form Card */}
      <Card className="app-card overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="font-heading text-xl flex items-center gap-2">
            <CurrentStepIcon className="h-5 w-5 text-primary" />
            {currentStepMeta.title}
          </CardTitle>
          <CardDescription>{currentStepMeta.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Step 1: Pickup */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="glass-panel border-success/30 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-success font-medium">
                      <MapPin className="h-5 w-5" />
                      Where should we pick it up?
                    </div>

                    <MumbaiAreaPicker
                      label="Pickup Area in Mumbai"
                      value={pickupArea?.name ?? null}
                      onChange={handlePickupAreaChange}
                      placeholder="Tap to choose your area"
                    />

                    {orderMemory.pickupAddresses.length > 0 && (
                      <div className="rounded-lg border bg-background/70 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Recent pickup addresses</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {orderMemory.pickupAddresses.map((address) => (
                            <button
                              key={address}
                              type="button"
                              onClick={() => applyRememberedAddress('pickup_address', address)}
                              className="max-w-[220px] shrink-0 truncate rounded-md border bg-card px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-primary/10"
                            >
                              {address}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="pickup_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Pickup Address *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g. Shop No. 12, XYZ Market, MG Road"
                              className="resize-none min-h-[80px] bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Add building, shop number, street details</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pickup_landmark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landmark (helps rider find you)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Near SBI Bank, Opposite Big Bazaar" className="bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Drop */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="glass-panel border-primary/30 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <MapPin className="h-5 w-5" />
                      Where should we deliver it?
                    </div>

                    <MumbaiAreaPicker
                      label="Drop Area in Mumbai"
                      value={dropArea?.name ?? null}
                      onChange={handleDropAreaChange}
                      placeholder="Tap to choose drop area"
                    />

                    {orderMemory.dropAddresses.length > 0 && (
                      <div className="rounded-lg border bg-background/70 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Recent drop addresses</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {orderMemory.dropAddresses.map((address) => (
                            <button
                              key={address}
                              type="button"
                              onClick={() => applyRememberedAddress('drop_address', address)}
                              className="max-w-[220px] shrink-0 truncate rounded-md border bg-card px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-primary/10"
                            >
                              {address}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="drop_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Drop Address *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g. Flat 301, Green Apartments, LBS Marg"
                              className="resize-none min-h-[80px] bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Add flat/house number, building, street</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drop_landmark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landmark (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Near Cafe Coffee Day, Behind Mall" className="bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {pickupArea && dropArea && (
                    <div className="bg-primary/10 rounded-lg p-3 text-center text-sm">
                      📏 Approx distance: <strong>{estimatedDistance} km</strong>
                    </div>
                  )}

                  <div className="rounded-lg border bg-background/80 p-4">
                    <div className="mb-3 flex items-center gap-2 font-medium">
                      <CalendarClock className="h-5 w-5 text-primary" />
                      Delivery timing
                    </div>
                    <FormField
                      control={form.control}
                      name="delivery_priority"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {deliveryPriorityOptions.map((option) => {
                              const selected = field.value === option.value;
                              const Icon = option.value === 'emergency' ? Flame : option.value === 'scheduled' ? CalendarClock : Truck;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => field.onChange(option.value)}
                                  className={`rounded-lg border p-3 text-left transition-all ${
                                    selected ? 'border-primary bg-primary/10 shadow-sm' : 'bg-card hover:bg-muted/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2 text-sm font-semibold">
                                      <Icon className="h-4 w-4 text-primary" />
                                      {option.label}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {option.fee ? `+Rs ${option.fee}` : 'Included'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">{option.detail}</p>
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {deliveryPriority === 'scheduled' && (
                      <FormField
                        control={form.control}
                        name="scheduled_for"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Pickup slot</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" className="bg-background" {...field} />
                            </FormControl>
                            <FormDescription>Pick a realistic slot so riders can plan ahead.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="mt-3 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                      AI estimate: {etaPrediction.confidence}% chance of delivery within {etaPrediction.minutes} minutes after pickup.
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Item & Contact */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="glass-panel border-info/30 p-4">
                    <div className="flex items-center gap-2 text-info font-medium mb-3">
                      <Package className="h-5 w-5" />
                      What are you sending?
                    </div>

                    <FormField
                      control={form.control}
                      name="item_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Description *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Documents, Small box, Food parcel, Clothes" className="bg-background" {...field} />
                          </FormControl>
                          <FormDescription>Be specific so rider knows what to expect</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="item_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Category *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Choose category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {itemCategories.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="item_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Declared Value (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={20000}
                                className="bg-background"
                                {...field}
                                onChange={(event) => field.onChange(parseFloat(event.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Items above ₹20,000 are not supported.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="is_fragile"
                      render={({ field }) => (
                        <FormItem className="mt-4 flex items-start gap-3 rounded-lg border bg-background/70 p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Fragile or needs careful handling</FormLabel>
                            <FormDescription>Riders will see this note before accepting.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className={`mt-4 rounded-lg border p-3 ${
                      itemSafety.level === 'blocked'
                        ? 'border-destructive/40 bg-destructive/5'
                        : itemValue > 20000
                          ? 'border-destructive/40 bg-destructive/5'
                        : itemSafety.level === 'caution'
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : itemSafety.level === 'ok'
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'bg-muted/30'
                    }`}>
                      <div className="flex items-start gap-2">
                        {itemSafety.level === 'ok' && itemValue <= 20000 ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${
                            itemSafety.level === 'blocked' || itemValue > 20000 ? 'text-destructive' : 'text-amber-700'
                          }`} />
                        )}
                        <div>
                          <p className="text-sm font-semibold">
                            {itemValue > 20000 ? 'Declared value is too high' : itemSafety.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {itemValue > 20000
                              ? 'Droplix only supports items declared under ₹20,000.'
                              : itemSafety.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="protection_tier"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <div className="mb-3 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <div>
                              <FormLabel>Smart Parcel Protection</FormLabel>
                              <FormDescription>Choose based on the decision you want Droplix to help with: how much risk is acceptable?</FormDescription>
                            </div>
                          </div>
                          <div className="grid gap-2 md:grid-cols-3">
                            {protectionPlans.map((plan) => {
                              const quote = getProtectionQuote(plan.tier, itemValue);
                              const selected = field.value === plan.tier;
                              return (
                                <button
                                  key={plan.tier}
                                  type="button"
                                  onClick={() => field.onChange(plan.tier)}
                                  className={`rounded-lg border p-3 text-left transition-all ${
                                    selected ? 'border-primary bg-primary/10 shadow-sm' : 'bg-card hover:bg-muted/50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold">{plan.label}</p>
                                      <p className="text-xs text-muted-foreground">{plan.summary}</p>
                                    </div>
                                    <span className="rounded-md border bg-background px-2 py-1 text-xs font-bold">
                                      {quote.fee ? `Rs ${quote.fee}` : 'Free'}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs text-muted-foreground">{plan.detail}</p>
                                  <p className="mt-2 text-xs font-medium text-primary">
                                    {quote.coverage ? `Protected up to Rs ${quote.coverage}` : 'No claim cover selected'}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Optional item photo */}
                    <div className="mt-4">
                      <label className="text-sm font-medium block mb-2">Item Photo <span className="text-muted-foreground font-normal">(optional)</span></label>
                      {itemPhotoPreview ? (
                        <div className="relative w-full max-w-xs">
                          <img src={itemPhotoPreview} alt="Item preview" className="w-full h-40 object-cover rounded-lg border" />
                          <button
                            type="button"
                            onClick={clearPhoto}
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 border flex items-center justify-center hover:bg-background"
                            aria-label="Remove photo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <Camera className="h-7 w-7 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Tap to take or choose a photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handlePhotoChange}
                          />
                        </label>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Helps the rider recognize your parcel.</p>
                    </div>
                  </div>

                  <div className="glass-panel border-accent/30 p-4">
                    <div className="flex items-center gap-2 text-accent font-medium mb-3">
                      <Phone className="h-5 w-5" />
                      Contact Numbers
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sender_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Phone *</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="e.g. 98765 43210"
                                className="bg-background"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="receiver_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Receiver Phone <span className="text-muted-foreground font-normal">(recommended)</span></FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="e.g. 98765 43210"
                                className="bg-background"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              />
                            </FormControl>
                            <FormDescription>So the rider can call them at drop-off.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {(orderMemory.senderPhones.length > 0 || orderMemory.receiverPhones.length > 0) && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {orderMemory.senderPhones.length > 0 && (
                          <div className="rounded-lg border bg-background/70 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Your recent numbers</p>
                            <div className="flex flex-wrap gap-2">
                              {orderMemory.senderPhones.map((phone) => (
                                <button
                                  key={phone}
                                  type="button"
                                  onClick={() => applyRememberedPhone('sender_phone', phone)}
                                  className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/10"
                                >
                                  {phone}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {orderMemory.receiverPhones.length > 0 && (
                          <div className="rounded-lg border bg-background/70 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Recent receiver numbers</p>
                            <div className="flex flex-wrap gap-2">
                              {orderMemory.receiverPhones.map((phone) => (
                                <button
                                  key={phone}
                                  type="button"
                                  onClick={() => applyRememberedPhone('receiver_phone', phone)}
                                  className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/10"
                                >
                                  {phone}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Pricing & Confirm */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="trusted_rider_required"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 rounded-lg border bg-background/80 p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                const enabled = checked === true;
                                field.onChange(enabled);
                                if (!enabled) {
                                  form.setValue('business_account_id', '');
                                  form.setValue('business_batch_id', '');
                                  form.setValue('business_name', '');
                                  form.setValue('order_channel', 'p2p');
                                  return;
                                }
                                const account = approvedBusinessAccounts[0];
                                if (account) {
                                  form.setValue('business_account_id', account.id);
                                  form.setValue('business_name', account.name);
                                  form.setValue('order_channel', account.default_order_channel || 'b2p');
                                } else {
                                  form.setValue('order_channel', 'b2p');
                                }
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              Trusted rider only
                            </FormLabel>
                            <FormDescription>Prioritize higher Trust Score riders. Premium protection enables this automatically.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_order"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 rounded-lg border bg-background/80 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-primary" />
                              Business delivery
                            </FormLabel>
                            <FormDescription>Unlock bulk-friendly details, repeat rider preference, and invoice-ready history.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="support_channel"
                      render={({ field }) => (
                        <FormItem className="rounded-lg border bg-background/80 p-4">
                          <FormLabel className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-primary" />
                            Human support
                          </FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="mt-2 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supportChannelOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="mt-2">
                            No vague chatbot promise. Escalations go to real support at{' '}
                            <a href={DROPLIX_SUPPORT_MAILTO} className="font-medium text-primary underline-offset-4 hover:underline">
                              {DROPLIX_SUPPORT_EMAIL}
                            </a>
                            .
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  {businessOrder && (
                    <div className="grid gap-3 rounded-lg border bg-primary/5 p-4 md:grid-cols-2">
                      {approvedBusinessAccounts.length > 0 ? (
                        <FormField
                          control={form.control}
                          name="business_account_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Approved store account</FormLabel>
                              <Select
                                value={field.value || undefined}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const account = approvedBusinessAccounts.find((item) => item.id === value);
                                  if (account) {
                                    form.setValue('business_name', account.name);
                                    form.setValue('order_channel', account.default_order_channel || 'b2p');
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Choose store" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {approvedBusinessAccounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Only approved stores can create B2P/B2B deliveries.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 md:col-span-2">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Store approval required</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Create your store profile and wait for admin approval before booking business deliveries.
                          </p>
                          <Button asChild size="sm" variant="outline" className="mt-3">
                            <Link to="/business/dashboard">Open store portal</Link>
                          </Button>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="order_channel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery channel</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="b2p">B2P - business to customer</SelectItem>
                                <SelectItem value="b2b">B2B - business to business</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>{orderChannel === 'b2b' ? 'Best for shops, offices, vendors, and suppliers.' : 'Best for customer deliveries.'}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="business_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Rexford Store" className="bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="multi_stop_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stops in this run</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={8}
                                className="bg-background"
                                {...field}
                                onChange={(event) => field.onChange(parseInt(event.target.value, 10) || 1)}
                              />
                            </FormControl>
                            <FormDescription>Use 1 for normal delivery. Multi-stop batches can be priced later by admin.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-lg border bg-background/80 p-4 shadow-sm animate-slide-up">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Route className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold">Delivery preview</h4>
                          <p className="text-xs text-muted-foreground">Review the route before it goes live.</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                        <div className="min-h-[96px] rounded-lg border bg-muted/40 p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">Pickup</p>
                          <p className="text-sm font-medium leading-relaxed">{form.watch('pickup_address') || '-'}</p>
                        </div>
                        <div className="hidden items-center text-primary sm:flex">
                          <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        <div className="min-h-[96px] rounded-lg border bg-muted/40 p-3">
                          <p className="mb-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">Drop</p>
                          <p className="text-sm font-medium leading-relaxed">{form.watch('drop_address') || '-'}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border bg-card p-3">
                          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            Item
                          </div>
                          <p className="text-sm font-medium">{form.watch('item_description') || '-'}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {getCategoryLabel(itemCategory)} · {itemValue > 0 ? `₹${itemValue}` : 'No value declared'}
                            {isFragile ? ' · Fragile' : ''}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            Contact
                          </div>
                          <p className="text-sm font-medium">
                            {form.watch('sender_phone') || '-'}
                            {form.watch('receiver_phone') ? ` / ${form.watch('receiver_phone')}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          {protectionQuote.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold capitalize">
                          <CalendarClock className="h-3.5 w-3.5 text-primary" />
                          {deliveryPriority}
                        </span>
                        {(trustedRiderRequired || protectionTier === 'premium') && (
                          <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            Trusted rider
                          </span>
                        )}
                        {businessOrder && (
                          <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            Business · {multiStopCount} stop{multiStopCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>

                    {useFreeDelivery ? (
                      <div className="relative overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-5 text-center shadow-sm animate-slide-up stagger-1">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-primary to-emerald-400 animate-soft-pulse" />
                        <Sparkles className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
                        <p className="text-sm text-muted-foreground line-through">Normal delivery Rs {minimumPrice}</p>
                        <p className="my-2 text-5xl font-bold text-emerald-600">Rs {lockedFare}</p>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          {hasPaidAddOns ? 'Delivery is free. Only selected add-ons are due.' : 'Promo applied. This delivery is free.'}
                        </p>
                        <div className="mt-4 rounded-lg border border-emerald-500/25 bg-background/80 p-3 text-left text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Delivery fee</span>
                            <span className="font-semibold text-emerald-700">Rs 0</span>
                          </div>
                          {hasPaidAddOns && (
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Protection/priority add-ons</span>
                              <span className="font-semibold">Rs {addOnFee}</span>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Droplix pays Rs {minimumPrice} to the rider on your behalf.</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm animate-slide-up stagger-1">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
                            <IndianRupee className="h-5 w-5" />
                            Set rider payout
                          </div>
                          <div className="rounded-lg bg-background/80 px-3 py-2 text-right">
                            <p className="text-xs text-muted-foreground">Suggested</p>
                            <p className="text-2xl font-bold text-primary">₹{minimumPrice}</p>
                          </div>
                        </div>

                        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3">
                          <p className="text-xs text-muted-foreground">
                            Base ₹{mumbaiZone?.base_price ?? 30} + ₹{mumbaiZone?.price_per_km ?? 8}/km x {estimatedDistance} km
                          </p>
                        </div>

                        <div className="grid gap-4">
                          <FormField
                            control={form.control}
                            name="estimated_distance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Approximate distance (km)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="bg-background"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {pickupArea && dropArea ? 'Auto-calculated from your areas' : 'A close estimate is fine'}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="price_offered"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Your price offer (₹) *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={minimumPrice}
                                    className="bg-background text-xl font-bold"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                                {priceOffered < minimumPrice && (
                                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                    Offer at least ₹{minimumPrice}. This keeps rider earnings fair.
                                  </p>
                                )}
                                {priceOffered >= minimumPrice && (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                                    <Check className="h-3.5 w-3.5" />
                                    Strong payout. Riders can accept this faster.
                                  </p>
                                )}
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-background/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        Locked fare
                      </div>
                      <p className="text-sm font-semibold">Rs {lockedFare}</p>
                    </div>
                    <div className="rounded-lg border bg-background/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Protection
                      </div>
                      <p className="text-sm font-semibold">
                        {protectionQuote.coverage ? `Rs ${protectionQuote.coverage}` : 'Basic'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        ETA confidence
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        {etaPrediction.confidence}% in {etaPrediction.minutes} min
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-background/70 p-3">
                    <div className="grid gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Rider payout</p>
                        <p className="font-semibold">Rs {riderPayout}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Protection fee</p>
                        <p className="font-semibold">Rs {protectionQuote.fee}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Priority fee</p>
                        <p className="font-semibold">Rs {priorityFee}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Support</p>
                        <p className="font-semibold capitalize">{supportChannel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">Need help before sending?</p>
                      <p className="text-muted-foreground">
                        Email{' '}
                        <a href={DROPLIX_SUPPORT_MAILTO} className="break-all font-medium text-primary underline-offset-4 hover:underline">
                          {DROPLIX_SUPPORT_EMAIL}
                        </a>
                        {' '}with your order code, parcel value, or rider issue.
                      </p>
                    </div>
                  </div>

                  {!useFreeDelivery && (
                    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-300 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay the rider ₹{priceOffered} in cash at pickup or delivery.</p>
                      </div>
                    </div>
                  )}

                  <LiabilityDisclaimer
                    accepted={liabilityAccepted}
                    highlight={showTermsHint && !liabilityAccepted}
                    onAcceptChange={(accepted) => {
                      setLiabilityAccepted(accepted);
                      if (accepted) {
                        setShowTermsHint(false);
                        setSubmitError(null);
                      }
                    }}
                  />
                </div>
              )}

              {submitError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{submitError}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="app-sticky-panel sticky bottom-3 z-20 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {currentStep > 1 ? (
                    <Button type="button" variant="outline" onClick={goBack} className="w-full sm:w-auto">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  {currentStep < 4 ? (
                    <Button type="button" onClick={goNext} className="btn-gradient min-w-[150px]">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className={`btn-gradient btn-shine min-w-[210px] ${canSubmitOrder ? 'shadow-lg' : ''}`}
                      size="lg"
                      disabled={isSubmitting || priceTooLow || itemBlocked || scheduleMissing || businessBlocked}
                      aria-describedby={submitHelpText ? 'submit-help' : undefined}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating order...
                        </>
                      ) : useFreeDelivery ? (
                        <>
                          <Gift className="h-4 w-4" />
                          Send for free
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Confirm & send
                        </>
                      )}
                    </Button>
                  )}
                  {currentStep === 4 && submitHelpText && (
                    <p id="submit-help" className="max-w-[260px] text-xs text-muted-foreground sm:text-right">
                      {submitHelpText}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
