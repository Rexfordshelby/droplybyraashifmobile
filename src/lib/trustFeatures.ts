export type ProtectionTier = 'basic' | 'protected' | 'premium';
export type DeliveryPriority = 'standard' | 'scheduled' | 'emergency';
export type SupportChannel = 'whatsapp' | 'call';

export interface ProtectionQuote {
  tier: ProtectionTier;
  label: string;
  fee: number;
  coverage: number;
  summary: string;
  detail: string;
}

export interface RiderTrustProfile {
  trustScore: number;
  rating: number;
  completedDeliveries: number;
  onTimeRate: number;
  cancellationRate: number;
  damageIncidents: number;
  repeatCustomerRate: number;
  trustTier: 'standard' | 'silver' | 'gold';
  reviewTags: string[];
}

export const protectionPlans: Array<Omit<ProtectionQuote, 'fee' | 'coverage'>> = [
  {
    tier: 'basic',
    label: 'Basic',
    summary: 'Included',
    detail: 'One-time QR, OTP handoff, and public tracking.',
  },
  {
    tier: 'protected',
    label: 'Protected',
    summary: 'Value matched',
    detail: 'Protection up to declared value with priority support review.',
  },
  {
    tier: 'premium',
    label: 'Premium Protected',
    summary: 'High trust',
    detail: 'Best for fragile, medicine, documents, and high-value parcels.',
  },
];

export const deliveryPriorityOptions = [
  {
    value: 'standard' as const,
    label: 'Standard',
    fee: 0,
    etaLabel: 'Today',
    detail: 'Best rider match with locked fare.',
  },
  {
    value: 'scheduled' as const,
    label: 'Scheduled',
    fee: 10,
    etaLabel: 'Book a slot',
    detail: 'Reserve pickup for a chosen time.',
  },
  {
    value: 'emergency' as const,
    label: 'Emergency',
    fee: 80,
    etaLabel: 'Priority',
    detail: 'For urgent medicine, passport, documents, and critical parcels.',
  },
];

export const supportChannelOptions = [
  { value: 'whatsapp' as const, label: 'WhatsApp support' },
  { value: 'call' as const, label: 'Call support' },
];

export function getProtectionQuote(tier: ProtectionTier, itemValue: number): ProtectionQuote {
  const safeValue = Math.max(0, Math.min(Math.round(itemValue || 0), 20000));
  const plan = protectionPlans.find((item) => item.tier === tier) ?? protectionPlans[0];

  if (tier === 'protected') {
    const coverage = Math.min(safeValue, 5000);
    return {
      ...plan,
      fee: coverage > 0 ? Math.max(15, Math.ceil(coverage * 0.012)) : 15,
      coverage,
    };
  }

  if (tier === 'premium') {
    const coverage = safeValue;
    return {
      ...plan,
      fee: coverage > 0 ? Math.max(39, Math.ceil(coverage * 0.018)) : 39,
      coverage,
    };
  }

  return {
    ...plan,
    fee: 0,
    coverage: 0,
  };
}

export function getPriorityFee(priority: DeliveryPriority) {
  return deliveryPriorityOptions.find((option) => option.value === priority)?.fee ?? 0;
}

export function getEtaPrediction(distanceKm?: number | null, priority: DeliveryPriority = 'standard') {
  const distance = Math.max(Number(distanceKm || 1), 1);
  const baseMinutes = priority === 'emergency' ? 18 : priority === 'scheduled' ? 45 : 28;
  const perKm = priority === 'emergency' ? 5 : 7;
  const minutes = Math.round(baseMinutes + distance * perKm);
  const confidence = priority === 'scheduled' ? 91 : priority === 'emergency' ? 87 : Math.max(72, 90 - Math.round(distance));

  return { minutes, confidence };
}

export function getTrustTier(profile: Pick<RiderTrustProfile, 'completedDeliveries' | 'rating' | 'cancellationRate'>) {
  if (profile.completedDeliveries >= 500 && profile.rating >= 4.8 && profile.cancellationRate <= 1) return 'gold';
  if (profile.completedDeliveries >= 100 && profile.rating >= 4.6 && profile.cancellationRate <= 3) return 'silver';
  return 'standard';
}

export function getFallbackTrustProfile(overrides: Partial<RiderTrustProfile> = {}): RiderTrustProfile {
  const completedDeliveries = overrides.completedDeliveries ?? 0;
  const rating = overrides.rating ?? (completedDeliveries > 0 ? 4.8 : 0);
  const onTimeRate = overrides.onTimeRate ?? (completedDeliveries > 0 ? 96 : 0);
  const cancellationRate = overrides.cancellationRate ?? 0;
  const damageIncidents = overrides.damageIncidents ?? 0;
  const repeatCustomerRate = overrides.repeatCustomerRate ?? (completedDeliveries > 0 ? 42 : 0);
  const trustScore = overrides.trustScore ?? Math.round((onTimeRate + (100 - cancellationRate) + repeatCustomerRate) / 3);
  const trustTier = overrides.trustTier ?? getTrustTier({ completedDeliveries, rating, cancellationRate });

  return {
    trustScore,
    rating,
    completedDeliveries,
    onTimeRate,
    cancellationRate,
    damageIncidents,
    repeatCustomerRate,
    trustTier,
    reviewTags: overrides.reviewTags ?? ['Professional', 'Good communication', 'Careful handoff'],
  };
}

export function getProtectionLabel(tier?: ProtectionTier | null) {
  return protectionPlans.find((plan) => plan.tier === tier)?.label ?? 'Basic';
}

