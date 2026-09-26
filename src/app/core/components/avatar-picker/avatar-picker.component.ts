import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ModalService } from '../../services/modal.service';
import { AvatarRenderService } from '../../services/avatar-render.service';
import { FeatureGateService } from '../../services/feature-gate.service';
import { SubscriptionService } from '../../services/subscription.service';
import { SubscriptionTier } from '../../models/user.model';
import { AvatarConfig } from '../../models/avatar-config.model';
import { AVATAR_PRESETS, AvatarPreset } from '../../data/avatar-presets';
import { AvatarBuilderComponent } from '../avatar-builder/avatar-builder.component';

/**
 * Everything to do with picking a crush's picture, shared by the new-crush
 * modal and the crush edit form:
 *   - upload a photo (with the crop tool)
 *   - pick one of the preset cartoon avatars
 *   - build a custom avatar
 *   - paste an image URL
 *
 * Two-way binds `url` (what every screen renders) and `config` (builder
 * options, present only for built/preset avatars so they can be re-edited).
 */
@Component({
  selector: 'app-avatar-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AvatarBuilderComponent],
  styleUrl: './avatar-picker.component.css',
  template: `
    <div class="ap">
      <label [style.color]="theme.colors().textSecondary" class="ap-label">{{ label() }}</label>

      <div class="ap-current">
        <div class="ap-preview" [style.border]="'1px solid ' + theme.colors().border" [style.background-color]="theme.colors().bgSecondary">
          @if (url()) {
            <img [src]="url()" alt="Selected avatar" class="ap-preview-img">
          } @else {
            <span class="ap-preview-empty" aria-hidden="true">?</span>
          }
        </div>
        <div class="ap-current-actions">
          <button type="button" (click)="fileInput.click()"
                  [style.border]="'1px solid ' + theme.colors().primary"
                  [style.color]="theme.colors().primary"
                  class="ap-btn">Upload photo</button>
          <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" class="ap-file">
          @if (cropSourceImage()) {
            <button type="button" (click)="showCropModal.set(true)"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="ap-btn ap-btn-quiet">Re-crop</button>
          }
          @if (gate.canUseAvatarBuilder()) {
            <button type="button" (click)="openBuilder()"
                    [style.background-color]="theme.colors().primary"
                    class="ap-btn ap-btn-primary">{{ config() ? 'Edit avatar' : 'Build an avatar' }}</button>
          }
          @if (url()) {
            <button type="button" (click)="clear()"
                    [style.color]="theme.colors().textSecondary"
                    class="ap-btn ap-btn-link">Remove</button>
          }
        </div>
      </div>
      @if (uploadedName()) {
        <p class="ap-filename" [style.color]="theme.colors().textSecondary">{{ uploadedName() }}</p>
      }

      @if (!gate.canUseAvatarBuilder()) {
        <div [style.border]="'1px dashed ' + theme.colors().border" class="ap-upgrade">
          <p class="ap-upgrade-title">Custom avatars are a Premium feature</p>
          <p [style.color]="theme.colors().textSecondary" class="ap-upgrade-copy">Build a cartoon lookalike for every crush on Premium and Gold.</p>
          <button type="button" (click)="subscription.upgrade(premiumTier)"
                  [style.background-color]="theme.colors().primary"
                  class="ap-btn ap-btn-primary">Upgrade to Premium</button>
        </div>
      }

      <p class="ap-section" [style.color]="theme.colors().textSecondary">Or pick a look</p>
      <div class="ap-presets" role="listbox" aria-label="Preset avatars">
        @for (preset of presets; track preset.id) {
          <button type="button" role="option" class="ap-preset"
                  [attr.aria-selected]="selectedPresetId() === preset.id"
                  [attr.aria-label]="preset.label"
                  [title]="preset.label"
                  [style.border]="selectedPresetId() === preset.id ? '2px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                  [style.background-color]="theme.colors().bgSecondary"
                  (click)="choosePreset(preset)">
            @if (thumbs().get(preset.id); as src) {
              <img [src]="src" [alt]="preset.label" class="ap-preset-img">
            }
          </button>
        }
      </div>

      <button type="button" class="ap-toggle-url" [style.color]="theme.colors().textSecondary" (click)="showUrl.set(!showUrl())">
        {{ showUrl() ? 'Hide' : 'Paste an image URL instead' }}
      </button>
      @if (showUrl()) {
        <input type="url"
               [ngModel]="isDataUrl() ? '' : url()"
               (ngModelChange)="setUrl($event)"
               [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               [style.color]="theme.colors().text"
               class="ap-url"
               placeholder="https://…">
      }

      <p class="ap-credit" [style.color]="theme.colors().textSecondary">Preset and custom avatars: Avataaars by Pablo Stanley, via DiceBear.</p>
    </div>

    @if (builderOpen()) {
      <app-avatar-builder [initialConfig]="config()"
                          (saved)="onBuilt($event)"
                          (cancelled)="builderOpen.set(false)"></app-avatar-builder>
    }

    @if (showCropModal() && cropSourceImage()) {
      <div class="ap-crop-overlay" role="dialog" aria-modal="true" aria-label="Crop photo">
        <div [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border" class="ap-crop-modal">
          <h3 class="ap-crop-title" [style.color]="theme.colors().text">Crop photo</h3>
          <div [style.background-color]="theme.colors().bgSecondary" class="ap-crop-stage">
            <div class="ap-crop-circle">
              <img [src]="cropSourceImage()!" alt="Crop preview" [style.transform]="cropTransform()" class="ap-crop-img">
            </div>
          </div>
          <div class="ap-crop-controls" [style.color]="theme.colors().textSecondary">
            <label class="ap-crop-control">Zoom
              <input type="range" min="1" max="3" step="0.05" [value]="cropZoom()" (input)="cropZoom.set(toNumber($event, 1.5))">
            </label>
            <label class="ap-crop-control">Horizontal
              <input type="range" min="-120" max="120" step="1" [value]="cropOffsetX()" (input)="cropOffsetX.set(toNumber($event, 0))">
            </label>
            <label class="ap-crop-control">Vertical
              <input type="range" min="-120" max="120" step="1" [value]="cropOffsetY()" (input)="cropOffsetY.set(toNumber($event, 0))">
            </label>
          </div>
          <div class="ap-crop-actions">
            <button type="button" (click)="showCropModal.set(false)" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="ap-btn ap-btn-quiet">Cancel</button>
            <button type="button" (click)="applyCrop()" [style.background-color]="theme.colors().primary" class="ap-btn ap-btn-primary">Apply crop</button>
          </div>
        </div>
      </div>
    }
  `
})
export class AvatarPickerComponent {
  protected theme = inject(ThemeService);
  protected gate = inject(FeatureGateService);
  protected subscription = inject(SubscriptionService);
  private modal = inject(ModalService);
  private renderer = inject(AvatarRenderService);

  /** The image every screen renders: http(s) URL or data URI. */
  readonly url = model<string>('');
  /** Builder options for built/preset avatars; undefined for photos and pasted URLs. */
  readonly config = model<AvatarConfig | undefined>(undefined);
  readonly label = input('Avatar (optional)');

  protected readonly premiumTier = SubscriptionTier.Premium;
  protected readonly presets = AVATAR_PRESETS;
  protected readonly thumbs = signal<Map<string, string>>(new Map());
  protected readonly selectedPresetId = signal<string | null>(null);
  protected readonly builderOpen = signal(false);
  protected readonly showUrl = signal(false);
  protected readonly uploadedName = signal('');

  // Crop tool state (moved here from the dashboard so both forms share it).
  protected readonly showCropModal = signal(false);
  protected readonly cropSourceImage = signal<string | null>(null);
  protected readonly cropZoom = signal(1);
  protected readonly cropOffsetX = signal(0);
  protected readonly cropOffsetY = signal(0);

  constructor() {
    this.renderer.preload();
    for (const preset of AVATAR_PRESETS) {
      void this.renderer.render(preset.config, 96).then((uri) => {
        this.thumbs.update((map) => { const next = new Map(map); next.set(preset.id, uri); return next; });
      }).catch(() => undefined);
    }
  }

  protected isDataUrl(): boolean {
    return (this.url() || '').startsWith('data:');
  }

  protected async choosePreset(preset: AvatarPreset): Promise<void> {
    const config = { ...preset.config };
    const uri = await this.renderer.render(config, 256);
    this.selectedPresetId.set(preset.id);
    this.config.set(config);
    this.url.set(uri);
    this.uploadedName.set('');
    this.cropSourceImage.set(null);
  }

  protected openBuilder(): void {
    this.builderOpen.set(true);
  }

  protected onBuilt(result: { config: AvatarConfig; dataUri: string }): void {
    this.builderOpen.set(false);
    this.selectedPresetId.set(null);
    this.config.set(result.config);
    this.url.set(result.dataUri);
    this.uploadedName.set('');
    this.cropSourceImage.set(null);
  }

  protected setUrl(value: string): void {
    this.url.set((value || '').trim());
    this.config.set(undefined);
    this.selectedPresetId.set(null);
  }

  protected clear(): void {
    this.url.set('');
    this.config.set(undefined);
    this.selectedPresetId.set(null);
    this.uploadedName.set('');
    this.cropSourceImage.set(null);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.modal.show('Please upload an image file.');
      return;
    }

    this.uploadedName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      this.cropSourceImage.set(result);
      this.cropZoom.set(1);
      this.cropOffsetX.set(0);
      this.cropOffsetY.set(0);
      this.showCropModal.set(true);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected cropTransform(): string {
    return `translate(${this.cropOffsetX()}px, ${this.cropOffsetY()}px) scale(${this.cropZoom()})`;
  }

  protected toNumber(event: Event, fallback: number): number {
    const target = event.target as HTMLInputElement | null;
    if (!target) return fallback;
    const parsed = Number(target.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  protected applyCrop(): void {
    const source = this.cropSourceImage();
    if (!source) return;

    const image = new Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coverScale = Math.max(size / image.width, size / image.height);
      const scale = coverScale * this.cropZoom();
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const dx = (size - drawWidth) / 2 + this.cropOffsetX();
      const dy = (size - drawHeight) / 2 + this.cropOffsetY();

      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

      this.url.set(canvas.toDataURL('image/jpeg', 0.85));
      this.config.set(undefined);
      this.selectedPresetId.set(null);
      this.showCropModal.set(false);
    };
    image.src = source;
  }
}
