import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowRightLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gift,
  IndianRupee,
  Loader2,
  MapPin,
  Package,
  Phone,
  Route,
  Send,
  Sparkles,
  Truck,
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
import { usePromos } from '@/hooks/usePromos';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { LiabilityDisclaimer } from './LiabilityDisclaimer';
import { MumbaiAreaPicker } from './MumbaiAreaPicker';
import { MUMBAI_AREAS, MumbaiArea, haversineKm, findMumbaiArea } from '@/data/mumbaiAreas';
import { consumeOrderDraft } from '@/lib/orderDrafts';
import { readOrderMemory, rememberOrderDetails, type OrderMemory } from '@/lib/orderMemory';

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
  const { freeRemaining, refetch: refetchPromo } = usePromos();
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

  // Use free delivery if available
  const useFreeDelivery = freeRemaining > 0;

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

  // Keep price_offered in sync with suggested price when promo is used
  useEffect(() => {
    if (useFreeDelivery) {
      form.setValue('price_offered', minimumPrice);
    }
  }, [useFreeDelivery, minimumPrice, form]);

  const priceOffered = form.watch('price_offered');
  const itemDescription = form.watch('item_description');
  const itemCategory = form.watch('item_category');
  const itemValue = form.watch('item_value');
  const isFragile = form.watch('is_fragile');
  const itemSafety = useMemo(() => getItemSafety(itemDescription || ''), [itemDescription]);
  const priceTooLow = !useFreeDelivery && priceOffered < minimumPrice;
  const itemBlocked = itemSafety.level === 'blocked' || itemValue > 20000;
  const currentStepMeta = steps[currentStep - 1];
  const CurrentStepIcon = currentStepMeta.icon;
  const canSubmitOrder = liabilityAccepted && !priceTooLow && !itemBlocked;
  const submitHelpText = itemBlocked
    ? 'This item cannot be sent through Droplix. Check the item description and declared value before booking.'
    : priceTooLow
    ? `Offer at least ₹${minimumPrice} so riders see a fair payout.`
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
                🎁 You have {freeRemaining} FREE {freeRemaining === 1 ? 'delivery' : 'deliveries'} left!
              </p>
              <p className="text-sm text-muted-foreground">
                This order is on us. You pay ₹0.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Header */}
      <Card className="card-elevated overflow-hidden">
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
      <Card className="card-elevated overflow-hidden">
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
                    </div>

                    {useFreeDelivery ? (
                      <div className="relative overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-5 text-center shadow-sm animate-slide-up stagger-1">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-primary to-emerald-400 animate-soft-pulse" />
                        <Sparkles className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
                        <p className="text-sm text-muted-foreground line-through">Normal price ₹{minimumPrice}</p>
                        <p className="my-2 text-5xl font-bold text-emerald-600">₹0</p>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Promo applied. This delivery is free.</p>
                        <p className="mt-2 text-xs text-muted-foreground">Droplix pays ₹{minimumPrice} to the rider on your behalf.</p>
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
                        Handoff
                      </div>
                      <p className="text-sm font-semibold">OTP verified</p>
                    </div>
                    <div className="rounded-lg border bg-background/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        Matching
                      </div>
                      <p className="text-sm font-semibold">Verified riders</p>
                    </div>
                    <div className="rounded-lg border bg-background/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5 text-primary" />
                        You pay
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        {useFreeDelivery ? '₹0 free delivery' : `₹${priceOffered}`}
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
              <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
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
                      disabled={isSubmitting || priceTooLow || itemBlocked}
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
