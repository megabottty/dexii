import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { AvatarRenderService } from './avatar-render.service';
import { AVATAR_PRESETS } from '../data/avatar-presets';
import { AVATAR_OPTIONS } from '../models/avatar-config.model';

describe('AvatarRenderService', () => {
  let service: AvatarRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarRenderService);
  });

  it('renders a preset to an SVG data URI', async () => {
    const uri = await service.render(AVATAR_PRESETS[0].config, 64);
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    expect(uri.length).toBeGreaterThan(500);
  });

  it('renders every preset without throwing', async () => {
    for (const preset of AVATAR_PRESETS) {
      const uri = await service.render(preset.config, 32);
      expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    }
  });

  it('presets cover every skin tone and include head coverings', () => {
    const tones = new Set(AVATAR_PRESETS.map((p) => p.config.skinColor));
    for (const tone of AVATAR_OPTIONS.skinColor) expect(tones.has(tone.value)).toBe(true);
    const tops = new Set(AVATAR_PRESETS.map((p) => p.config.top));
    expect(tops.has('hijab')).toBe(true);
    expect(tops.has('turban')).toBe(true);
  });

  it('presetFor is deterministic for a nickname', () => {
    expect(service.presetFor('Sam')).toEqual(service.presetFor('Sam'));
    expect(service.presetFor('')).toBeTruthy();
  });

  it('randomConfig only uses known option values', () => {
    for (let i = 0; i < 20; i++) {
      const cfg = service.randomConfig();
      expect(AVATAR_OPTIONS.top.some((o) => o.value === cfg.top)).toBe(true);
      expect(AVATAR_OPTIONS.skinColor.some((o) => o.value === cfg.skinColor)).toBe(true);
      if (cfg.facialHair) expect(AVATAR_OPTIONS.facialHair.some((o) => o.value === cfg.facialHair)).toBe(true);
      if (cfg.accessories) expect(AVATAR_OPTIONS.accessories.some((o) => o.value === cfg.accessories)).toBe(true);
      expect(cfg.clothing === 'graphicShirt' ? Boolean(cfg.clothingGraphic) : cfg.clothingGraphic === undefined).toBe(true);
    }
  });
});
