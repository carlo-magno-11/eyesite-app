import { describe, expect, it } from 'vitest';
import {
  calculateLeadScore,
  leadTemperature,
  calculatePropertyMatch,
  rankPropertyMatches,
} from '@/lib/commercial';

describe('commercial scoring', () => {
  it('calculates an explainable lead score and clamps to 100', () => {
    const score = calculateLeadScore({
      profileComplete: true,
      hasBudget: true,
      hasZone: true,
      favoriteCount: 5,
      contactCount: 4,
      visitCount: 2,
      offerCount: 1,
      recentActivityDays: 2,
    });

    expect(score).toBe(100);
    expect(leadTemperature(score)).toBe('caliente');
  });

  it('classifies cold leads without activity', () => {
    const score = calculateLeadScore({});
    expect(score).toBe(0);
    expect(leadTemperature(score)).toBe('frio');
  });

  it('matches price, surface, municipality and type', () => {
    const property = {
      id: 'p1',
      precio_actual: 1000000,
      superficie: 400,
      municipio: 'Conkal',
      tipo: 'Terreno',
    };

    const score = calculatePropertyMatch(property, {
      minPrice: 800000,
      maxPrice: 1200000,
      minSurface: 300,
      maxSurface: 500,
      municipio: 'Conkal',
      tipo: 'Terreno',
    });

    expect(score).toBe(100);
  });

  it('ranks matching properties from highest to lowest', () => {
    const properties = [
      { id: 'a', precio_actual: 1000000, superficie: 400, municipio: 'Conkal', tipo: 'Terreno' },
      { id: 'b', precio_actual: 2500000, superficie: 400, municipio: 'Mérida', tipo: 'Casa' },
      { id: 'c', precio_actual: 1100000, superficie: 450, municipio: 'Conkal', tipo: 'Terreno' },
    ];

    const matches = rankPropertyMatches(properties, {
      minPrice: 800000,
      maxPrice: 1200000,
      minSurface: 300,
      maxSurface: 500,
      municipio: 'Conkal',
      tipo: 'Terreno',
    });

    expect(matches.map((p) => p.id)).toEqual(['a', 'c']);
    expect(matches[0].matchScore).toBe(100);
  });
});
