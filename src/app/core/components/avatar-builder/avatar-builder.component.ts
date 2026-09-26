import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { AvatarRenderService } from '../../services/avatar-render.service';
import { AVATAR_OPTIONS, AvatarConfig, AvatarOption, AvatarOptionKey } from '../../models/avatar-config.model';
import { AVATAR_PRESETS } from '../../data/avatar-presets';

type Tab = 'skin' | 'hair' | 'face' | 'beard' | 'glasses' | 'clothes' | 'background';

interface TabDef {
  id: Tab;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'skin', label: 'Skin', icon: '🎨' },
  { id: 'hair', label: 'Hair', icon: '💇' },
  { id: 'face', label: 'Face', icon: '🙂' },
  { id: 'beard', label: 'Facial hair', icon: '🧔' },
  { id: 'glasses', label: 'Glasses', icon: '🕶️' },
  { id: 'clothes', label: 'Clothes', icon: '👕' },
  { id: 'background', label: 'Background', icon: '🖼️' }
];

/**
 * Bitmoji-style avatar builder for a crush. Emits the chosen options plus the
 * rendered SVG data URI so callers can store both.
 */
@Component({
  selector: 'app-avatar-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './avatar-builder.component.css',
  template: `
    <div class="ab-overlay" role="dialog" aria-modal="true" aria-labelledby="ab-title" (click)="cancelled.emit()">
      <div class="ab-modal"
           [style.background-color]="theme.colors().bg"
           [style.border]="'1px solid ' + theme.colors().border"
           [style.color]="theme.colors().text"
           (click)="$event.stopPropagation()">
        <div class="ab-header">
          <h3 id="ab-title" class="ab-title">Build an avatar</h3>
          <button type="button" class="ab-close" aria-label="Close avatar builder"
                  [style.color]="theme.colors().textSecondary" (click)="cancelled.emit()">✕</button>
        </div>

        <div class="ab-body">
          <div class="ab-preview-col">
            <div class="ab-preview" [style.background-color]="theme.colors().bgSecondary">
              @if (preview()) {
                <img [src]="preview()" alt="Avatar preview" class="ab-preview-img">
              } @else {
                <div class="ab-preview-loading" [style.color]="theme.colors().textSecondary">Drawing…</div>
              }
            </div>
            <button type="button" class="ab-random"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    (click)="randomize()">🎲 Surprise me</button>
          </div>

          <div class="ab-editor">
            <div class="ab-tabs" role="tablist">
              @for (tab of tabs; track tab.id) {
                <button type="button" role="tab" class="ab-tab"
                        [attr.aria-selected]="activeTab() === tab.id"
                        [style.border-color]="activeTab() === tab.id ? theme.colors().primary : theme.colors().border"
                        [style.color]="activeTab() === tab.id ? theme.colors().primary : theme.colors().textSecondary"
                        (click)="activeTab.set(tab.id)">
                  <span aria-hidden="true">{{ tab.icon }}</span> {{ tab.label }}
                </button>
              }
            </div>

            <div class="ab-panel" role="tabpanel">
              @switch (activeTab()) {
                @case ('skin') {
                  <ng-container *ngTemplateOutlet="swatches; context: { key: 'skinColor', title: 'Skin tone' }"></ng-container>
                }
                @case ('hair') {
                  <ng-container *ngTemplateOutlet="grid; context: { key: 'top', title: 'Style' }"></ng-container>
                  <ng-container *ngTemplateOutlet="swatches; context: { key: 'hairColor', title: 'Hair colour' }"></ng-container>
                }
                @case ('face') {
                  <ng-container *ngTemplateOutlet="grid; context: { key: 'eyes', title: 'Eyes' }"></ng-container>
                  <ng-container *ngTemplateOutlet="grid; context: { key: 'eyebrows', title: 'Eyebrows' }"></ng-container>
                  <ng-container *ngTemplateOutlet="grid; context: { key: 'mouth', title: 'Mouth' }"></ng-container>
                }
                @case ('beard') {
                  <ng-container *ngTemplateOutlet="grid; context: { key: 'facialHair', title: 'Facial hair' }"></ng-container>
                  @if (config().facialHair) {
                    <ng-container *ngTemplateOutlet="swatches; context: { key: 'facialHairColor', title: 'Colour', source: 'hairColor' }"></ng-container>
                  }
                }
                @case ('glasses') {
                  <ng-container *ngTemplateOutlet="grid; context: { key: 'accessories', title: 'Glasses' }"></ng-container>
                  @if (config().accessories) {
                    <ng-container *ngTemplateOutlet="swatches; context: { key: 'accessoriesColor', title: 'Frame colour', source: 'clothesColor' }"></ng-container>
                  }
                }
                @case ('clothes') {
                  <ng-container *ngTemplateOutlet="grid; context: { key: 'clothing', title: 'Outfit' }"></ng-container>
                  <ng-container *ngTemplateOutlet="swatches; context: { key: 'clothesColor', title: 'Colour' }"></ng-container>
                  @if (config().clothing === 'graphicShirt') {
                    <ng-container *ngTemplateOutlet="grid; context: { key: 'clothingGraphic', title: 'Graphic' }"></ng-container>
                  }
                }
                @case ('background') {
                  <ng-container *ngTemplateOutlet="swatches; context: { key: 'backgroundColor', title: 'Background' }"></ng-container>
                }
              }
            </div>
          </div>
        </div>

        <div class="ab-footer">
          <span class="ab-credit" [style.color]="theme.colors().textSecondary">Avatars: Avataaars by Pablo Stanley, via DiceBear.</span>
          <div class="ab-actions">
            <button type="button" class="ab-btn ab-btn-ghost"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    (click)="cancelled.emit()">Cancel</button>
            <button type="button" class="ab-btn ab-btn-primary"
                    [style.background-color]="theme.colors().primary"
                    [disabled]="!preview()"
                    (click)="save()">Use this avatar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Option grid with a per-option thumbnail (rendered lazily for the active tab). -->
    <ng-template #grid let-key="key" let-title="title">
      <p class="ab-section-title" [style.color]="theme.colors().textSecondary">{{ title }}</p>
      <div class="ab-grid">
        @for (option of optionsFor(key); track option.value) {
          <button type="button" class="ab-option"
                  [class.ab-option-active]="isSelected(key, option.value)"
                  [style.border-color]="isSelected(key, option.value) ? theme.colors().primary : theme.colors().border"
                  [style.background-color]="theme.colors().bgSecondary"
                  [attr.aria-pressed]="isSelected(key, option.value)"
                  [title]="option.label"
                  (click)="set(key, option.value)">
            @if (thumb(key, option.value); as src) {
              <img [src]="src" [alt]="option.label" class="ab-option-img">
            } @else {
              <span class="ab-option-placeholder"></span>
            }
            <span class="ab-option-label" [style.color]="theme.colors().text">{{ option.label }}</span>
          </button>
        }
      </div>
    </ng-template>

    <!-- Colour swatches. "source" lets a field borrow another field's palette. -->
    <ng-template #swatches let-key="key" let-title="title" let-source="source">
      <p class="ab-section-title" [style.color]="theme.colors().textSecondary">{{ title }}</p>
      <div class="ab-swatches">
        @for (option of optionsFor(source || key); track option.value) {
          <button type="button" class="ab-swatch"
                  [style.background-color]="'#' + option.value"
                  [style.box-shadow]="isSelected(key, option.value) ? '0 0 0 3px ' + theme.colors().bg + ', 0 0 0 5px ' + theme.colors().primary : 'none'"
                  [attr.aria-pressed]="isSelected(key, option.value)"
                  [attr.aria-label]="option.label"
                  [title]="option.label"
                  (click)="set(key, option.value)"></button>
        }
      </div>
    </ng-template>
  `,
  imports: [NgTemplateOutlet]
})
export class AvatarBuilderComponent {
  protected theme = inject(ThemeService);
  private renderer = inject(AvatarRenderService);

  /** Existing config to edit; when absent a preset is used as the starting point. */
  readonly initialConfig = input<AvatarConfig | null | undefined>(undefined);
  readonly saved = output<{ config: AvatarConfig; dataUri: string }>();
  readonly cancelled = output<void>();

  protected readonly tabs = TABS;
  protected readonly activeTab = signal<Tab>('skin');
  protected readonly config = signal<AvatarConfig>({ ...AVATAR_PRESETS[0].config });
  protected readonly preview = signal<string | null>(null);
  private readonly thumbs = signal<Map<string, string>>(new Map());
  private previewSeq = 0;
  private initialised = false;

  constructor() {
    effect(() => {
      const initial = this.initialConfig();
      if (this.initialised) return;
      this.initialised = true;
      this.config.set(initial ? { ...initial } : this.renderer.presetFor(String(Date.now())));
    });

    // Live preview, guarded against out-of-order async renders.
    effect(() => {
      const cfg = this.config();
      const seq = ++this.previewSeq;
      void this.renderer.render(cfg, 320).then((uri) => {
        if (seq === this.previewSeq) this.preview.set(uri);
      }).catch(() => undefined);
    });

    // Thumbnails for the active tab's option grids.
    effect(() => {
      const tab = this.activeTab();
      const cfg = this.config();
      const keys = this.gridKeysFor(tab);
      for (const key of keys) {
        for (const option of this.optionsFor(key)) {
          const variant = this.withOption(cfg, key, option.value);
          const id = this.thumbId(key, option.value, variant);
          if (this.thumbs().has(id)) continue;
          void this.renderer.render(variant, 96).then((uri) => {
            this.thumbs.update((map) => { const next = new Map(map); next.set(id, uri); return next; });
          }).catch(() => undefined);
        }
      }
    });
  }

  protected optionsFor(key: string): readonly AvatarOption[] {
    return AVATAR_OPTIONS[key as AvatarOptionKey] ?? [];
  }

  protected isSelected(key: string, value: string): boolean {
    const current = (this.config() as unknown as Record<string, string | undefined>)[key];
    if (key === 'facialHairColor' && !current) return value === this.config().hairColor;
    if (key === 'accessoriesColor' && !current) return value === '262e33';
    return (current ?? '') === value;
  }

  protected set(key: string, value: string): void {
    this.config.update((cfg) => this.withOption(cfg, key, value));
  }

  protected thumb(key: string, value: string): string | undefined {
    const variant = this.withOption(this.config(), key, value);
    return this.thumbs().get(this.thumbId(key, value, variant));
  }

  protected randomize(): void {
    this.config.set(this.renderer.randomConfig());
  }

  protected async save(): Promise<void> {
    const config = this.config();
    const dataUri = await this.renderer.render(config, 256);
    this.saved.emit({ config, dataUri });
  }

  private gridKeysFor(tab: Tab): string[] {
    switch (tab) {
      case 'hair': return ['top'];
      case 'face': return ['eyes', 'eyebrows', 'mouth'];
      case 'beard': return ['facialHair'];
      case 'glasses': return ['accessories'];
      case 'clothes': return this.config().clothing === 'graphicShirt' ? ['clothing', 'clothingGraphic'] : ['clothing'];
      default: return [];
    }
  }

  private withOption(cfg: AvatarConfig, key: string, value: string): AvatarConfig {
    const next = { ...cfg } as AvatarConfig & Record<string, string | undefined>;
    if (value === '') {
      delete next[key];
      if (key === 'facialHair') delete next['facialHairColor'];
      if (key === 'accessories') delete next['accessoriesColor'];
    } else {
      next[key] = value;
      if (key === 'clothing' && value !== 'graphicShirt') delete next['clothingGraphic'];
      if (key === 'clothing' && value === 'graphicShirt' && !next['clothingGraphic']) next['clothingGraphic'] = 'diamond';
    }
    return next as AvatarConfig;
  }

  /** Thumbnails depend on the rest of the config (skin, colours), so key on the full variant. */
  private thumbId(key: string, value: string, variant: AvatarConfig): string {
    return `${key}=${value}|${JSON.stringify(variant)}`;
  }
}
