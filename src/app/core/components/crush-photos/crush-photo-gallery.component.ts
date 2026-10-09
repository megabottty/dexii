import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusTrapDirective } from '../../a11y/focus-trap.directive';
import { ThemeService } from '../../services/theme.service';
import { DataService } from '../../services/data.service';
import { FriendsApiService, FriendSummary } from '../../services/friends-api.service';
import { ModalService } from '../../services/modal.service';
import { CrushPhoto } from '../../models/crush-profile.model';
import { UnreadableImageError, resizeImageFile } from '../../utils/image-resize';

const MAX_PHOTOS = 8;

interface HeroSlide { key: string; url: string; photo: CrushPhoto | null; }

/**
 * Photos of a crush. Owners add, reorder, remove, pick who sees each photo and
 * promote one to the profile picture. Friends get a swipeable carousel of the
 * photos they're allowed to see. Images load on first open, never with lists.
 */
@Component({
  selector: 'app-crush-photo-gallery',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  styleUrl: './crush-photo-gallery.component.css',
  template: `
    @if (layout() === 'hero') {
      <!-- The profile picture is the first slide; the other photos follow. Swipe, arrows, dots, tap for full screen. -->
      <div class="pg-hero" [class.pg-hero--small]="size() === 'small'">
        <div class="pg-hero-carousel" role="region" aria-roledescription="carousel" [attr.aria-label]="'Photos of ' + nickname()">
          <div #track class="pg-track pg-track--hero" (scroll)="onScroll()" tabindex="0" (keydown.arrowright)="step(1); $event.preventDefault()" (keydown.arrowleft)="step(-1); $event.preventDefault()">
            @for (slide of slides(); track slide.key; let i = $index) {
              <div class="pg-slide pg-slide--hero" role="group" [attr.aria-label]="(i === 0 ? 'Profile picture' : 'Photo ' + (i + 1)) + ' of ' + slides().length" [attr.aria-roledescription]="'slide'">
                <button type="button" class="pg-slide-btn" (click)="openLightbox(i)" [attr.aria-label]="'Open ' + (i === 0 ? 'profile picture' : 'photo ' + (i + 1)) + ' full screen'">
                  <img [src]="slide.url" [alt]="nickname() + (i === 0 ? '' : ', photo ' + (i + 1))" class="pg-img" [attr.loading]="i === 0 ? 'eager' : 'lazy'">
                </button>
                @if (mode() === 'owner' && slide.photo?.audience === 'friends') {
                  <span class="pg-badge pg-badge--hero" [style.background-color]="theme.colors().primary" [attr.title]="audienceLabel(slide.photo!)">🔒</span>
                }
              </div>
            }
          </div>
          @if (slides().length > 1) {
            <button type="button" class="pg-nav pg-nav--hero pg-nav--prev" (click)="step(-1)" [disabled]="index() === 0" aria-label="Previous photo" [style.background-color]="theme.colors().bg">‹</button>
            <button type="button" class="pg-nav pg-nav--hero pg-nav--next" (click)="step(1)" [disabled]="index() === slides().length - 1" aria-label="Next photo" [style.background-color]="theme.colors().bg">›</button>
          }
        </div>
        @if (slides().length > 1) {
          <div class="pg-dots pg-dots--hero" aria-hidden="true">
            @for (slide of slides(); track slide.key; let i = $index) {
              <span class="pg-dot" [style.background-color]="i === index() ? theme.colors().primary : theme.colors().border"></span>
            }
          </div>
          <p class="pg-counter pg-counter--hero" [style.color]="theme.colors().textSecondary" aria-live="polite">{{ index() + 1 }} / {{ slides().length }}</p>
        }
        @if (busy()) {
          <p [style.color]="theme.colors().textSecondary" class="pg-note pg-note--hero" role="status">{{ busy() }}</p>
        }
        @if (mode() === 'owner') {
          <div class="pg-hero-tools">
            @if (photos().length < max) {
              <label class="pg-add pg-add--hero" [style.background-color]="theme.colors().primary">
                <span aria-hidden="true">＋</span> Photos
                <input type="file" accept="image/*" multiple (change)="onFilesPicked($event)" class="pg-file" aria-label="Add photos of this crush">
              </label>
            }
            @if (currentHeroPhoto(); as photo) {
              <button type="button" (click)="openAudience(photo)" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost pg-btn--hero" [attr.title]="photo.audience === 'friends' ? audienceLabel(photo) : 'Everyone this crush is shared with'">{{ photo.audience === 'friends' ? '🔒 Who sees' : '👁️ Who sees' }}</button>
              <button type="button" (click)="useAsProfile(photo)" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost pg-btn--hero">Set as picture</button>
              <button type="button" (click)="move(photo, -1)" [disabled]="photoIndex(photo) === 0" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost pg-btn--hero pg-btn--icon" aria-label="Move this photo earlier">◀</button>
              <button type="button" (click)="move(photo, 1)" [disabled]="photoIndex(photo) === photos().length - 1" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost pg-btn--hero pg-btn--icon" aria-label="Move this photo later">▶</button>
              <button type="button" (click)="remove(photo)" class="pg-btn pg-btn--danger pg-btn--hero">Remove</button>
            }
            @if (photos().length > 1) {
              <button type="button" (click)="openSelect()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost pg-btn--hero">Select</button>
            }
            @if (hasHiddenPhotos()) {
              <button type="button" (click)="shareAll()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost pg-btn--hero">Share all</button>
            }
          </div>
        }
      </div>
    }

    @if (layout() === 'section' && (mode() === 'owner' || photos().length > 0)) {
      <section class="pg" [attr.aria-label]="'Photos of ' + nickname()">
        <div class="pg-head">
          <h3 class="pg-title">Photos <span class="pg-count" [style.color]="theme.colors().textSecondary">{{ photos().length }}@if (mode() === 'owner') { / {{ max }}}</span></h3>
          @if (mode() === 'owner') {
            <div class="pg-actions">
              @if (photos().length < max) {
                <label class="pg-add" [style.background-color]="theme.colors().primary">
                  <span aria-hidden="true">＋</span> Add photos
                  <input type="file" accept="image/*" multiple (change)="onFilesPicked($event)" class="pg-file" aria-label="Add photos of this crush">
                </label>
              }
              @if (photos().length > 1) {
                <button type="button" (click)="openSelect()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost">Select photos</button>
              }
              @if (photos().length > 0 && hasHiddenPhotos()) {
                <button type="button" (click)="shareAll()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost">Share all photos with everyone</button>
              }
            </div>
          }
        </div>

        @if (busy()) {
          <p [style.color]="theme.colors().textSecondary" class="pg-note" role="status">{{ busy() }}</p>
        }

        @if (loading() && photos().length === 0) {
          <p [style.color]="theme.colors().textSecondary" class="pg-note" role="status">Loading photos…</p>
        } @else if (photos().length === 0) {
          <p [style.color]="theme.colors().textSecondary" class="pg-note">No photos yet. Add up to {{ max }}; the first one can be the profile picture, and you choose who sees each one.</p>
        } @else {
          <!-- Carousel -->
          <div class="pg-carousel" role="region" aria-roledescription="carousel" [attr.aria-label]="'Photos of ' + nickname()">
            <div #track class="pg-track" (scroll)="onScroll()" tabindex="0" (keydown.arrowright)="step(1); $event.preventDefault()" (keydown.arrowleft)="step(-1); $event.preventDefault()">
              @for (photo of photos(); track photo.id; let i = $index) {
                <div class="pg-slide" role="group" [attr.aria-label]="'Photo ' + (i + 1) + ' of ' + photos().length" [attr.aria-roledescription]="'slide'">
                  <button type="button" class="pg-slide-btn" (click)="openLightbox(i)" [attr.aria-label]="'Open photo ' + (i + 1) + ' full screen'">
                    <img [src]="photo.url" [alt]="nickname() + ', photo ' + (i + 1)" class="pg-img" loading="lazy">
                  </button>
                  @if (mode() === 'owner' && photo.audience === 'friends') {
                    <span class="pg-badge" [style.background-color]="theme.colors().primary" [attr.title]="audienceLabel(photo)">🔒 {{ photo.friendIds.length }}</span>
                  }
                </div>
              }
            </div>
            @if (photos().length > 1) {
              <button type="button" class="pg-nav pg-nav--prev" (click)="step(-1)" [disabled]="index() === 0" aria-label="Previous photo" [style.background-color]="theme.colors().bg">‹</button>
              <button type="button" class="pg-nav pg-nav--next" (click)="step(1)" [disabled]="index() === photos().length - 1" aria-label="Next photo" [style.background-color]="theme.colors().bg">›</button>
              <div class="pg-dots" aria-hidden="true">
                @for (photo of photos(); track photo.id; let i = $index) {
                  <span class="pg-dot" [style.background-color]="i === index() ? theme.colors().primary : theme.colors().border"></span>
                }
              </div>
              <p class="pg-counter" [style.color]="theme.colors().textSecondary" aria-live="polite">{{ index() + 1 }} / {{ photos().length }}</p>
            }
          </div>

          @if (mode() === 'owner' && current(); as photo) {
            <div class="pg-owner-row" [style.border]="'1px solid ' + theme.colors().border">
              <div class="pg-owner-info">
                <span class="pg-owner-label" [style.color]="theme.colors().textSecondary">This photo</span>
                <span class="pg-owner-audience">{{ photo.audience === 'friends' ? '🔒 ' + audienceLabel(photo) : '👁️ Everyone this crush is shared with' }}</span>
              </div>
              <div class="pg-owner-actions">
                <button type="button" (click)="openAudience(photo)" [style.border]="'1px solid ' + theme.colors().primary" [style.color]="theme.colors().onBgPrimary" class="pg-btn pg-btn--ghost">Who can see this</button>
                @if (photo.url !== avatarUrl()) {
                  <button type="button" (click)="useAsProfile(photo)" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost">Use as profile picture</button>
                }
                <button type="button" (click)="move(photo, -1)" [disabled]="index() === 0" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost" aria-label="Move this photo earlier">◀</button>
                <button type="button" (click)="move(photo, 1)" [disabled]="index() === photos().length - 1" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost" aria-label="Move this photo later">▶</button>
                <button type="button" (click)="remove(photo)" class="pg-btn pg-btn--danger">Remove</button>
              </div>
            </div>
          }
        }

      </section>
    }

        <!-- Lightbox (both layouts) -->
        @if (lightboxIndex() !== null) {
          <div class="pg-lightbox" role="dialog" aria-modal="true" [attr.aria-label]="'Photo ' + (lightboxIndex()! + 1) + ' of ' + slides().length" (click)="closeLightbox()" (keydown.escape)="closeLightbox()" (keydown.arrowright)="lightboxStep(1)" (keydown.arrowleft)="lightboxStep(-1)">
            <button #lightboxClose type="button" class="pg-lightbox-close" (click)="closeLightbox()" aria-label="Close">✕</button>
            <img [src]="slides()[lightboxIndex()!]?.url" [alt]="nickname() + ', photo ' + (lightboxIndex()! + 1)" class="pg-lightbox-img" (click)="$event.stopPropagation()">
            @if (slides().length > 1) {
              <button type="button" class="pg-lightbox-nav pg-lightbox-nav--prev" (click)="lightboxStep(-1); $event.stopPropagation()" aria-label="Previous photo">‹</button>
              <button type="button" class="pg-lightbox-nav pg-lightbox-nav--next" (click)="lightboxStep(1); $event.stopPropagation()" aria-label="Next photo">›</button>
            }
            <p class="pg-lightbox-counter">{{ lightboxIndex()! + 1 }} / {{ slides().length }}</p>
          </div>
        }

        <!-- Audience sheet -->
        @if (audienceFor(); as photo) {
          <div class="pg-sheet-backdrop" (click)="closeAudience()">
            <div class="pg-sheet" role="dialog" aria-modal="true" aria-labelledby="pg-audience-title" appFocusTrap (escaped)="closeAudience()" (click)="$event.stopPropagation()"
                 [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border">
              <h3 id="pg-audience-title" class="pg-sheet-title">Who can see this photo?</h3>
              <label class="pg-choice" [style.border]="'1px solid ' + (draftAudience() === 'shared' ? theme.colors().primary : theme.colors().border)">
                <input type="radio" name="pg-audience" value="shared" [checked]="draftAudience() === 'shared'" (change)="draftAudience.set('shared')">
                <span><strong>Everyone I've shared {{ nickname() }} with</strong><br><small [style.color]="theme.colors().textSecondary">Follows the crush's sharing automatically.</small></span>
              </label>
              <label class="pg-choice" [style.border]="'1px solid ' + (draftAudience() === 'friends' ? theme.colors().primary : theme.colors().border)">
                <input type="radio" name="pg-audience" value="friends" [checked]="draftAudience() === 'friends'" (change)="draftAudience.set('friends')">
                <span><strong>Only these friends</strong><br><small [style.color]="theme.colors().textSecondary">Pick from the friends this crush is shared with.</small></span>
              </label>
              @if (draftAudience() === 'friends') {
                <div class="pg-friends" role="group" aria-label="Friends who can see this photo">
                  @for (friend of sharedFriends(); track friend.id) {
                    <button type="button" (click)="toggleDraftFriend(friend.id)" [attr.aria-pressed]="draftFriendIds().includes(friend.id)"
                            [style.background-color]="draftFriendIds().includes(friend.id) ? theme.colors().primary : 'transparent'"
                            [style.color]="draftFriendIds().includes(friend.id) ? '#fff' : theme.colors().text"
                            [style.border]="'1px solid ' + (draftFriendIds().includes(friend.id) ? theme.colors().primary : theme.colors().border)"
                            class="pg-chip">{{ friend.username }}</button>
                  } @empty {
                    <p [style.color]="theme.colors().textSecondary" class="pg-note">Share {{ nickname() }} with a friend first; then you can pick them here.</p>
                  }
                </div>
              }
              <div class="pg-sheet-actions">
                <button type="button" (click)="saveAudience()" [style.background-color]="theme.colors().primary" class="pg-btn pg-btn--primary">Save</button>
                <button type="button" (click)="closeAudience()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost">Cancel</button>
              </div>
            </div>
          </div>
        }

        <!-- Select-and-delete sheet -->
        @if (selecting()) {
          <div class="pg-sheet-backdrop" (click)="closeSelect()">
            <div class="pg-sheet" role="dialog" aria-modal="true" aria-labelledby="pg-select-title" appFocusTrap (escaped)="closeSelect()" (click)="$event.stopPropagation()"
                 [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border">
              <h3 id="pg-select-title" class="pg-sheet-title">Select photos to delete</h3>
              <div class="pg-pick-grid" role="group" aria-label="Photos">
                @for (photo of photos(); track photo.id; let i = $index) {
                  <label class="pg-pick" [class.pg-pick--on]="selectedIds().includes(photo.id)">
                    <input type="checkbox" [checked]="selectedIds().includes(photo.id)" (change)="toggleSelected(photo.id)" [attr.aria-label]="'Select photo ' + (i + 1) + ' of ' + photos().length">
                    <img [src]="photo.url" alt="" loading="lazy">
                    @if (photo.audience === 'friends') { <span class="pg-pick-lock" aria-hidden="true">🔒</span> }
                  </label>
                }
              </div>
              <div class="pg-sheet-actions">
                <button type="button" (click)="toggleSelectAll()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost">{{ allSelected() ? 'Deselect all' : 'Select all' }}</button>
                <button type="button" (click)="deleteSelected()" [disabled]="selectedIds().length === 0 || busy() === 'delete'" class="pg-btn pg-btn--danger">Delete selected ({{ selectedIds().length }})</button>
                <button type="button" (click)="closeSelect()" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="pg-btn pg-btn--ghost">Cancel</button>
              </div>
            </div>
          </div>
        }
  `
})
export class CrushPhotoGalleryComponent {
  readonly crushId = input.required<string>();
  /** 'owner': full management UI. 'viewer': a friend seeing what was shared with them. 'preview': the owner seeing their own crush the way any friend they've shared it with would -- same photos as 'viewer' (anything shared, not just one friend's slice), no management UI. */
  readonly mode = input<'owner' | 'viewer' | 'preview'>('viewer');
  /** 'section': the standalone Photos block. 'hero': sits in the profile-picture spot; the picture is slide one. */
  readonly layout = input<'section' | 'hero'>('section');
  /** Hero only: 'large' (owner header, 140px) or 'small' (friend view, 96px). */
  readonly size = input<'large' | 'small'>('large');
  readonly nickname = input('this crush');
  /** Owner only: the current profile picture, to offer "Use as profile picture". */
  readonly avatarUrl = input<string | undefined>(undefined);
  /** Owner only: friends the crush is shared with (candidates for per-photo audiences). */
  readonly sharedFriends = input<FriendSummary[]>([]);

  readonly theme = inject(ThemeService);
  private dataService = inject(DataService);
  private friendsApi = inject(FriendsApiService);
  private modal = inject(ModalService);

  readonly max = MAX_PHOTOS;
  readonly photos = signal<CrushPhoto[]>([]);
  readonly loading = signal(false);
  readonly busy = signal('');
  readonly index = signal(0);
  readonly lightboxIndex = signal<number | null>(null);
  readonly audienceFor = signal<CrushPhoto | null>(null);
  readonly draftAudience = signal<'shared' | 'friends'>('shared');
  readonly draftFriendIds = signal<string[]>([]);
  private readonly track = viewChild<ElementRef<HTMLDivElement>>('track');
  private readonly lightboxClose = viewChild<ElementRef<HTMLButtonElement>>('lightboxClose');
  private lastFocused: HTMLElement | null = null;

  readonly current = computed(() => this.layout() === 'hero' ? null : (this.photos()[this.index()] || null));

  /** What the carousel shows: in hero layout the profile picture first, then every photo that isn't it. */
  readonly slides = computed<HeroSlide[]>(() => {
    const photos = this.photos().filter((p) => p.url);
    if (this.layout() !== 'hero') return photos.map((p) => ({ key: p.id, url: p.url!, photo: p }));
    const avatar = this.avatarUrl() || `https://i.pravatar.cc/300?u=${encodeURIComponent(this.nickname())}`;
    return [{ key: 'avatar', url: avatar, photo: null }, ...photos.filter((p) => p.url !== avatar).map((p) => ({ key: p.id, url: p.url!, photo: p }))];
  });
  /** Hero layout: the photo under the current slide (null on the profile-picture slide). */
  readonly currentHeroPhoto = computed(() => this.slides()[this.index()]?.photo || null);
  photoIndex(photo: CrushPhoto): number { return this.photos().findIndex((p) => p.id === photo.id); }
  readonly hasHiddenPhotos = computed(() => this.photos().some((p) => p.audience === 'friends'));

  constructor() {
    effect(() => {
      const id = this.crushId();
      const mode = this.mode();
      void this.load(id, mode);
    }, { allowSignalWrites: true });
    // Move focus into the lightbox when it opens, and back when it closes.
    effect(() => {
      const open = this.lightboxIndex() !== null;
      queueMicrotask(() => {
        if (open) this.lightboxClose()?.nativeElement.focus();
        else this.lastFocused?.focus();
      });
    });
  }

  private async load(id: string, mode: 'owner' | 'viewer' | 'preview'): Promise<void> {
    if (!id) return;
    this.loading.set(true);
    try {
      let photos: CrushPhoto[];
      if (mode === 'owner') {
        photos = await this.dataService.loadCrushPhotos(id);
      } else if (mode === 'preview') {
        // Your own photos, same slice any friend you've shared this crush with
        // would see: shared with everyone, or shared with at least one friend.
        photos = (await this.dataService.loadCrushPhotos(id)).filter((p) => p.audience === 'shared' || p.friendIds.length > 0);
      } else {
        photos = await this.friendsApi.getSharedCrushPhotos(id);
      }
      this.photos.set(photos);
      this.index.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  audienceLabel(photo: CrushPhoto): string {
    const names = photo.friendIds.map((id) => this.sharedFriends().find((f) => f.id === id)?.username || 'a friend');
    return names.length ? `Only ${names.join(', ')}` : 'Only friends you pick';
  }

  onScroll(): void {
    const el = this.track()?.nativeElement;
    if (!el || el.clientWidth === 0) return;
    this.index.set(Math.max(0, Math.min(this.slides().length - 1, Math.round(el.scrollLeft / el.clientWidth))));
  }

  step(delta: number): void {
    const next = Math.max(0, Math.min(this.slides().length - 1, this.index() + delta));
    this.index.set(next);
    const el = this.track()?.nativeElement;
    el?.scrollTo({ left: next * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  openLightbox(i: number): void { this.lastFocused = document.activeElement as HTMLElement; this.lightboxIndex.set(i); }
  closeLightbox(): void { this.lightboxIndex.set(null); }
  lightboxStep(delta: number): void {
    const i = this.lightboxIndex();
    if (i === null) return;
    this.lightboxIndex.set(Math.max(0, Math.min(this.slides().length - 1, i + delta)));
  }

  async onFilesPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    const room = this.max - this.photos().length;
    if (files.length > room) this.modal.show(`You can add ${room} more photo${room === 1 ? '' : 's'} (${this.max} per crush).`);
    for (const file of files.slice(0, Math.max(0, room))) {
      this.busy.set(`Adding ${file.name}…`);
      try {
        const resized = await resizeImageFile(file, { maxEdge: 1024, quality: 0.82 });
        const saved = await this.dataService.addCrushPhoto(this.crushId(), resized);
        if (saved) this.photos.update((list) => [...list, { ...saved, url: saved.url || resized.url }]);
      } catch (err) {
        this.modal.show(err instanceof UnreadableImageError ? err.message : 'Could not read that photo.');
      }
    }
    this.busy.set('');
    if (this.photos().length) this.index.set(this.photos().length - 1);
  }

  remove(photo: CrushPhoto): void {
    this.modal.confirm('Delete this photo? This cannot be undone.', async () => {
      if (await this.dataService.removeCrushPhoto(this.crushId(), photo.id)) {
        this.dropPhotos([photo.id]);
      }
    }, undefined, { title: 'Delete photo?', confirmLabel: 'Delete', danger: true });
  }

  /** Select several photos and delete them together. */
  readonly selecting = signal(false);
  readonly selectedIds = signal<string[]>([]);
  readonly allSelected = computed(() => this.photos().length > 0 && this.photos().every((p) => this.selectedIds().includes(p.id)));
  openSelect(): void { this.selectedIds.set([]); this.selecting.set(true); }
  closeSelect(): void { this.selecting.set(false); this.selectedIds.set([]); }
  toggleSelected(id: string): void {
    this.selectedIds.update((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }
  toggleSelectAll(): void {
    this.selectedIds.set(this.allSelected() ? [] : this.photos().map((p) => p.id));
  }
  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    const noun = ids.length === 1 ? 'this photo' : `${ids.length} photos`;
    this.modal.confirm(`Delete ${noun}? This cannot be undone.`, async () => {
      this.busy.set('delete');
      const ok = ids.length === 1
        ? await this.dataService.removeCrushPhoto(this.crushId(), ids[0])
        : await this.dataService.removeCrushPhotos(this.crushId(), ids);
      this.busy.set('');
      if (ok) { this.dropPhotos(ids); this.closeSelect(); }
    }, undefined, { title: ids.length === 1 ? 'Delete photo?' : 'Delete photos?', confirmLabel: ids.length === 1 ? 'Delete' : `Delete ${ids.length}`, danger: true });
  }
  private dropPhotos(ids: string[]): void {
    this.photos.update((list) => list.filter((p) => !ids.includes(p.id)));
    this.index.update((i) => Math.max(0, Math.min(i, this.photos().length - 1)));
  }

  async move(photo: CrushPhoto, delta: number): Promise<void> {
    const list = [...this.photos()];
    const from = list.findIndex((p) => p.id === photo.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) return;
    list.splice(from, 1); list.splice(to, 0, photo);
    this.photos.set(list);
    const target = this.layout() === 'hero' ? Math.max(0, this.slides().findIndex((slide) => slide.photo?.id === photo.id)) : to;
    this.index.set(target);
    const el = this.track()?.nativeElement;
    el?.scrollTo({ left: target * el.clientWidth, behavior: 'auto' });
    await this.dataService.reorderCrushPhotos(this.crushId(), list.map((p) => p.id));
  }

  useAsProfile(photo: CrushPhoto): void {
    const crush = this.dataService.getAllCrushes()().find((c) => c.id === this.crushId());
    if (!crush || !photo.url) return;
    this.dataService.updateCrush({ ...crush, avatarUrl: photo.url, avatarConfig: undefined }, { fields: ['avatarUrl', 'avatarConfig'] });
    this.modal.show('Profile picture updated.');
  }

  openAudience(photo: CrushPhoto): void {
    this.audienceFor.set(photo);
    this.draftAudience.set(photo.audience);
    this.draftFriendIds.set([...photo.friendIds]);
  }
  closeAudience(): void { this.audienceFor.set(null); }
  toggleDraftFriend(id: string): void {
    this.draftFriendIds.update((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }
  async saveAudience(): Promise<void> {
    const photo = this.audienceFor();
    if (!photo) return;
    const audience = this.draftAudience();
    const friendIds = audience === 'friends' ? this.draftFriendIds() : [];
    if (await this.dataService.setCrushPhotoAudience(this.crushId(), photo.id, audience, friendIds)) {
      this.photos.update((list) => list.map((p) => p.id === photo.id ? { ...p, audience, friendIds } : p));
    }
    this.closeAudience();
  }
  async shareAll(): Promise<void> {
    if (await this.dataService.setCrushPhotoAudience(this.crushId(), null, 'shared')) {
      this.photos.update((list) => list.map((p) => ({ ...p, audience: 'shared', friendIds: [] })));
    }
  }
}
