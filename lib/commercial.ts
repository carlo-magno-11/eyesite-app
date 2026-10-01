export type MatchableProperty = {
  id: string;
  type?: string | null;
  tipo?: string | null;
  municipio?: string | null;
  location?: string | null;
  superficie?: number | null;
  surfaceM2?: number | null;
  precio?: number | null;
  precio_actual?: number | null;
  currentPrice?: number | null;
};

export type PropertyMatchCriteria = {
  minPrice?: number | null;
  maxPrice?: number | null;
  minSurface?: number | null;
  maxSurface?: number | null;
  municipio?: string | null;
  tipo?: string | null;
};

export type LeadScoreInput = {
  profileComplete?: boolean;
  hasBudget?: boolean;
  hasZone?: boolean;
  favoriteCount?: number;
  contactCount?: number;
  visitCount?: number;
  offerCount?: number;
  recentActivityDays?: number | null;
};

export function calculateLeadScore(input: LeadScoreInput): number {
  let score = 0;

  if (input.profileComplete) score += 10;
  if (input.hasBudget) score += 15;
  if (input.hasZone) score += 10;
  score += Math.min(15, Math.max(0, input.favoriteCount ?? 0) * 3);
  score += Math.min(20, Math.max(0, input.contactCount ?? 0) * 5);
  score += Math.min(15, Math.max(0, input.visitCount ?? 0) * 5);
  score += Math.min(15, Math.max(0, input.offerCount ?? 0) * 15);

  const recentDays = input.recentActivityDays;
  if (recentDays != null && recentDays >= 0 && recentDays <= 7) {
    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function leadTemperature(score: number): 'caliente' | 'interesado' | 'seguimiento' | 'frio' {
  if (score >= 80) return 'caliente';
  if (score >= 60) return 'interesado';
  if (score >= 30) return 'seguimiento';
  return 'frio';
}

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function propertyPrice(property: MatchableProperty): number {
  return Number(property.currentPrice ?? property.precio_actual ?? property.precio ?? 0) || 0;
}

function propertySurface(property: MatchableProperty): number {
  return Number(property.surfaceM2 ?? property.superficie ?? 0) || 0;
}

function rangeScore(value: number, min?: number | null, max?: number | null): number {
  if (!value) return 0;
  if (min != null && value < min) {
    const distance = (min - value) / Math.max(min, 1);
    return distance <= 0.15 ? 0.7 : 0;
  }
  if (max != null && value > max) {
    const distance = (value - max) / Math.max(max, 1);
    return distance <= 0.15 ? 0.7 : 0;
  }
  return 1;
}

export function calculatePropertyMatch(
  property: MatchableProperty,
  criteria: PropertyMatchCriteria,
): number {
  let weighted = 0;
  let totalWeight = 0;

  const price = propertyPrice(property);
  if (criteria.minPrice != null || criteria.maxPrice != null) {
    weighted += rangeScore(price, criteria.minPrice, criteria.maxPrice) * 35;
    totalWeight += 35;
  }

  const surface = propertySurface(property);
  if (criteria.minSurface != null || criteria.maxSurface != null) {
    weighted += rangeScore(surface, criteria.minSurface, criteria.maxSurface) * 25;
    totalWeight += 25;
  }

  if (criteria.municipio?.trim()) {
    const wanted = normalized(criteria.municipio);
    const actual = normalized(property.municipio ?? property.location);
    const matches = actual === wanted || actual.includes(wanted) || wanted.includes(actual);
    weighted += (matches ? 1 : 0) * 25;
    totalWeight += 25;
  }

  if (criteria.tipo?.trim()) {
    const wanted = normalized(criteria.tipo);
    const actual = normalized(property.tipo ?? property.type);
    const matches = actual === wanted || actual.includes(wanted) || wanted.includes(actual);
    weighted += (matches ? 1 : 0) * 15;
    totalWeight += 15;
  }

  if (!totalWeight) return 0;
  return Math.round((weighted / totalWeight) * 100);
}

export function rankPropertyMatches<T extends MatchableProperty>(
  properties: T[],
  criteria: PropertyMatchCriteria,
  minimumScore = 50,
): Array<T & { matchScore: number }> {
  return properties
    .map((property) => ({
      ...property,
      matchScore: calculatePropertyMatch(property, criteria),
    }))
    .filter((property) => property.matchScore >= minimumScore)
    .sort((a, b) => b.matchScore - a.matchScore);
}
