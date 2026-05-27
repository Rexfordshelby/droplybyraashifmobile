export type MumbaiRegion =
  | 'South Mumbai'
  | 'Western Suburbs'
  | 'Central Suburbs'
  | 'Eastern Suburbs'
  | 'Navi Mumbai & Thane';

export interface MumbaiArea {
  name: string;
  region: MumbaiRegion;
  lat: number;
  lng: number;
}

// Approximate centroid coordinates for distance calculation.
export const MUMBAI_AREAS: MumbaiArea[] = [
  // South Mumbai
  { name: 'Colaba', region: 'South Mumbai', lat: 18.9067, lng: 72.8147 },
  { name: 'Fort', region: 'South Mumbai', lat: 18.9333, lng: 72.8350 },
  { name: 'Churchgate', region: 'South Mumbai', lat: 18.9322, lng: 72.8264 },
  { name: 'Marine Lines', region: 'South Mumbai', lat: 18.9434, lng: 72.8234 },
  { name: 'Nariman Point', region: 'South Mumbai', lat: 18.9256, lng: 72.8243 },
  { name: 'Lower Parel', region: 'South Mumbai', lat: 18.9967, lng: 72.8302 },
  { name: 'Worli', region: 'South Mumbai', lat: 19.0176, lng: 72.8175 },
  { name: 'Mahalaxmi', region: 'South Mumbai', lat: 18.9826, lng: 72.8200 },
  { name: 'Byculla', region: 'South Mumbai', lat: 18.9780, lng: 72.8336 },
  { name: 'Tardeo', region: 'South Mumbai', lat: 18.9682, lng: 72.8108 },
  { name: 'Grant Road', region: 'South Mumbai', lat: 18.9633, lng: 72.8167 },

  // Western Suburbs
  { name: 'Bandra West', region: 'Western Suburbs', lat: 19.0596, lng: 72.8295 },
  { name: 'Bandra East', region: 'Western Suburbs', lat: 19.0606, lng: 72.8410 },
  { name: 'Khar', region: 'Western Suburbs', lat: 19.0728, lng: 72.8390 },
  { name: 'Santacruz West', region: 'Western Suburbs', lat: 19.0810, lng: 72.8389 },
  { name: 'Santacruz East', region: 'Western Suburbs', lat: 19.0860, lng: 72.8533 },
  { name: 'Vile Parle', region: 'Western Suburbs', lat: 19.1000, lng: 72.8400 },
  { name: 'Andheri West', region: 'Western Suburbs', lat: 19.1364, lng: 72.8296 },
  { name: 'Andheri East', region: 'Western Suburbs', lat: 19.1136, lng: 72.8697 },
  { name: 'Jogeshwari', region: 'Western Suburbs', lat: 19.1346, lng: 72.8470 },
  { name: 'Goregaon', region: 'Western Suburbs', lat: 19.1646, lng: 72.8493 },
  { name: 'Malad', region: 'Western Suburbs', lat: 19.1864, lng: 72.8485 },
  { name: 'Kandivali', region: 'Western Suburbs', lat: 19.2095, lng: 72.8526 },
  { name: 'Borivali', region: 'Western Suburbs', lat: 19.2288, lng: 72.8570 },
  { name: 'Dahisar', region: 'Western Suburbs', lat: 19.2545, lng: 72.8590 },

  // Central Suburbs
  { name: 'Dadar', region: 'Central Suburbs', lat: 19.0186, lng: 72.8430 },
  { name: 'Matunga', region: 'Central Suburbs', lat: 19.0270, lng: 72.8550 },
  { name: 'Sion', region: 'Central Suburbs', lat: 19.0410, lng: 72.8616 },
  { name: 'Kurla', region: 'Central Suburbs', lat: 19.0728, lng: 72.8826 },
  { name: 'Ghatkopar', region: 'Central Suburbs', lat: 19.0860, lng: 72.9081 },
  { name: 'Vikhroli', region: 'Central Suburbs', lat: 19.1075, lng: 72.9258 },
  { name: 'Bhandup', region: 'Central Suburbs', lat: 19.1442, lng: 72.9356 },
  { name: 'Mulund', region: 'Central Suburbs', lat: 19.1726, lng: 72.9425 },

  // Eastern Suburbs
  { name: 'Chembur', region: 'Eastern Suburbs', lat: 19.0633, lng: 72.9000 },
  { name: 'Govandi', region: 'Eastern Suburbs', lat: 19.0500, lng: 72.9136 },
  { name: 'Mankhurd', region: 'Eastern Suburbs', lat: 19.0455, lng: 72.9320 },
  { name: 'Wadala', region: 'Eastern Suburbs', lat: 19.0150, lng: 72.8625 },
  { name: 'Sewri', region: 'Eastern Suburbs', lat: 18.9947, lng: 72.8556 },

  // Navi Mumbai & Thane
  { name: 'Powai', region: 'Navi Mumbai & Thane', lat: 19.1176, lng: 72.9060 },
  { name: 'BKC (Bandra Kurla Complex)', region: 'Navi Mumbai & Thane', lat: 19.0688, lng: 72.8656 },
  { name: 'Vashi', region: 'Navi Mumbai & Thane', lat: 19.0760, lng: 72.9985 },
  { name: 'Nerul', region: 'Navi Mumbai & Thane', lat: 19.0330, lng: 73.0297 },
  { name: 'Belapur', region: 'Navi Mumbai & Thane', lat: 19.0235, lng: 73.0400 },
  { name: 'Kharghar', region: 'Navi Mumbai & Thane', lat: 19.0473, lng: 73.0698 },
  { name: 'Airoli', region: 'Navi Mumbai & Thane', lat: 19.1568, lng: 72.9985 },
  { name: 'Thane West', region: 'Navi Mumbai & Thane', lat: 19.2183, lng: 72.9781 },
  { name: 'Thane East', region: 'Navi Mumbai & Thane', lat: 19.1860, lng: 72.9759 },
  { name: 'Mira Road', region: 'Navi Mumbai & Thane', lat: 19.2814, lng: 72.8546 },
  { name: 'Bhayander', region: 'Navi Mumbai & Thane', lat: 19.3010, lng: 72.8512 },
];

export const MUMBAI_REGIONS: MumbaiRegion[] = [
  'South Mumbai',
  'Western Suburbs',
  'Central Suburbs',
  'Eastern Suburbs',
  'Navi Mumbai & Thane',
];

export function findMumbaiArea(name: string): MumbaiArea | undefined {
  return MUMBAI_AREAS.find((a) => a.name === name);
}

// Haversine distance in km
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
