import { describe, it, expect } from 'vitest';
import { PROPERTIES, formatPrice, formatSurface, getReturnColor, PROPERTY_TYPES } from '../lib/properties-data';

describe('Properties Data', () => {
  it('should have at least 10 properties', () => {
    expect(PROPERTIES.length).toBeGreaterThanOrEqual(10);
  });

  it('each property should have required fields', () => {
    for (const property of PROPERTIES) {
      expect(property.id).toBeTruthy();
      expect(property.title).toBeTruthy();
      expect(property.location).toBeTruthy();
      expect(property.type).toBeTruthy();
      expect(property.currentPrice).toBeGreaterThan(0);
      expect(property.surfaceM2).toBeGreaterThan(0);
      expect(property.images.length).toBeGreaterThan(0);
    }
  });

  it('should have featured properties', () => {
    const featured = PROPERTIES.filter((p) => p.featured);
    expect(featured.length).toBeGreaterThan(0);
  });
});

describe('formatPrice', () => {
  it('should format small prices correctly', () => {
    expect(formatPrice(150, 'm²')).toBe('$150/m²');
    expect(formatPrice(490, 'm²')).toBe('$490/m²');
  });

  it('should format large prices with comma separators', () => {
    expect(formatPrice(25000, 'm²')).toBe('$25,000/m²');
  });

  it('should format million prices with M suffix', () => {
    expect(formatPrice(1500000, 'm²')).toBe('$1.5M/m²');
  });
});

describe('formatSurface', () => {
  it('should format small surfaces in m²', () => {
    expect(formatSurface(450)).toBe('450 m²');
  });

  it('should format large surfaces in hectares', () => {
    expect(formatSurface(315000)).toBe('31.50 ha');
    expect(formatSurface(72000)).toBe('7.20 ha');
  });
});

describe('getReturnColor', () => {
  it('should return green for high returns', () => {
    expect(getReturnColor(100)).toBe('#4ADE80');
    expect(getReturnColor(200)).toBe('#4ADE80');
  });

  it('should return gold for medium returns', () => {
    expect(getReturnColor(67)).toBe('#C9A84C');
    expect(getReturnColor(50)).toBe('#C9A84C');
  });

  it('should return yellow for low-medium returns', () => {
    expect(getReturnColor(38)).toBe('#FBBF24');
    expect(getReturnColor(30)).toBe('#FBBF24');
  });

  it('should return gray for very low returns', () => {
    expect(getReturnColor(14)).toBe('#9A9A9A');
  });
});

describe('PROPERTY_TYPES', () => {
  it('should include all expected types', () => {
    const keys = PROPERTY_TYPES.map((t) => t.key);
    expect(keys).toContain('all');
    expect(keys).toContain('terreno');
    expect(keys).toContain('casa');
    expect(keys).toContain('hacienda');
    expect(keys).toContain('rancho');
    expect(keys).toContain('industrial');
  });
});
