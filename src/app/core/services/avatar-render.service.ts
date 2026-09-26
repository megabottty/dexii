import { Injectable } from '@angular/core';
import { AVATAR_OPTIONS, AvatarConfig } from '../models/avatar-config.model';
import { AVATAR_PRESETS } from '../data/avatar-presets';

type DiceBearModules = {
  createAvatar: typeof import('@dicebear/core').createAvatar;
  avataaars: typeof import('@dicebear/avataaars');
};

/**
 * Renders AvatarConfig objects to SVG data URIs with DiceBear (avataaars
 * style). The library is loaded on first use so it never lands in the startup
 * bundle; renders are memoised by config.
 */
@Injectable({ providedIn: 'root' })
export class AvatarRenderService {
  private modules: Promise<DiceBearModules> | null = null;
  private cache = new Map<string, string>();

  private load(): Promise<DiceBearModules> {
    if (!this.modules) {
      this.modules = Promise.all([import('@dicebear/core'), import('@dicebear/avataaars')])
        .then(([core, avataaars]) => ({ createAvatar: core.createAvatar, avataaars }));
    }
    return this.modules;
  }

  /** Warms the library up (e.g. when a picker mounts) so the first render is instant. */
  preload(): void {
    void this.load().catch(() => undefined);
  }

  async render(config: AvatarConfig, size = 256): Promise<string> {
    const key = `${size}:${JSON.stringify(config)}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const { createAvatar, avataaars } = await this.load();
    const uri = createAvatar(avataaars, this.toDiceBearOptions(config, size)).toDataUri();
    this.cache.set(key, uri);
    return uri;
  }

  /** A uniformly random but coherent config (hair colour matches facial hair, etc.). */
  randomConfig(): AvatarConfig {
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
    const hairColor = pick(AVATAR_OPTIONS.hairColor).value;
    const facialHair = Math.random() < 0.25 ? pick(AVATAR_OPTIONS.facialHair.filter((o) => o.value)).value : undefined;
    const accessories = Math.random() < 0.3 ? pick(AVATAR_OPTIONS.accessories.filter((o) => o.value)).value : undefined;
    const clothing = pick(AVATAR_OPTIONS.clothing).value;
    return {
      v: 1,
      skinColor: pick(AVATAR_OPTIONS.skinColor).value,
      top: pick(AVATAR_OPTIONS.top).value,
      hairColor,
      eyes: pick(AVATAR_OPTIONS.eyes.slice(0, 7)).value,
      eyebrows: pick(AVATAR_OPTIONS.eyebrows.slice(0, 7)).value,
      mouth: pick(AVATAR_OPTIONS.mouth.slice(0, 4)).value,
      facialHair,
      facialHairColor: facialHair ? hairColor : undefined,
      accessories,
      accessoriesColor: accessories ? '262e33' : undefined,
      clothing,
      clothesColor: pick(AVATAR_OPTIONS.clothesColor).value,
      clothingGraphic: clothing === 'graphicShirt' ? pick(AVATAR_OPTIONS.clothingGraphic.filter((o) => o.value)).value : undefined,
      backgroundColor: pick(AVATAR_OPTIONS.backgroundColor).value
    };
  }

  /** Deterministic preset for a name, used when a crush is saved without an avatar. */
  presetFor(seed: string): AvatarConfig {
    let hash = 0;
    for (const ch of seed || 'dexii') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return { ...AVATAR_PRESETS[hash % AVATAR_PRESETS.length].config };
  }

  private toDiceBearOptions(config: AvatarConfig, size: number): Record<string, unknown> {
    const one = (value?: string) => (value ? [value] : undefined);
    return {
      seed: 'dexii',
      size,
      style: ['circle'],
      skinColor: one(config.skinColor),
      top: one(config.top),
      topProbability: 100,
      hairColor: one(config.hairColor),
      eyes: one(config.eyes),
      eyebrows: one(config.eyebrows),
      mouth: one(config.mouth),
      facialHair: one(config.facialHair),
      facialHairProbability: config.facialHair ? 100 : 0,
      facialHairColor: one(config.facialHairColor || config.hairColor),
      accessories: one(config.accessories),
      accessoriesProbability: config.accessories ? 100 : 0,
      accessoriesColor: one(config.accessoriesColor || '262e33'),
      clothing: one(config.clothing),
      clothesColor: one(config.clothesColor),
      clothingGraphic: one(config.clothingGraphic),
      backgroundColor: one(config.backgroundColor)
    };
  }
}
