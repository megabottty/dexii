import { describe, expect, it } from 'vitest';
import { contrastRatio, readableOn, readableOnAll, withReadableText } from './theme.service';

describe('theme contrast helpers', () => {
  it('measures contrast the WCAG way', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 3);
  });

  it('leaves colours alone when they already read well', () => {
    expect(readableOn('#1d4ed8', '#ffffff')).toBe('#1d4ed8');
  });

  it('darkens pale text on light backgrounds until it reaches 4.5:1', () => {
    const fixed = readableOn('#f9a8d4', '#ffffff');
    expect(fixed).not.toBe('#f9a8d4');
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('lightens dark text on dark backgrounds', () => {
    const fixed = readableOn('#7c2d12', '#0f172a');
    expect(contrastRatio(fixed, '#0f172a')).toBeGreaterThanOrEqual(4.5);
  });

  it('makes a colour read on every surface it is given', () => {
    const fixed = readableOnAll('#866386', ['#fffafa', '#ede7ec', '#f5f3f4']);
    for (const bg of ['#fffafa', '#ede7ec', '#f5f3f4']) expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('picks a focus ring that stands out on the background', () => {
    const light = withReadableText({ bg: '#ffffff', bgSecondary: '#fff', text: '#000', textSecondary: '#333', primary: '#fda4af', primaryHover: '#f43f5e', border: '#ddd', cardBg: '#fff', accent: '#fcd34d' });
    const dark = withReadableText({ ...light, bg: '#111111' });
    expect(light.focusRing).toBe('#b45309');
    expect(dark.focusRing).toBe('#fbbf24');
    expect(contrastRatio(light.onBgPrimary, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.onBgAccent, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
