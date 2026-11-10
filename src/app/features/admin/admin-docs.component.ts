import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ThemeService } from '../../core/services/theme.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { renderSimpleMarkdown, slugify } from '../../core/utils/simple-markdown';

interface DocSection { id: string; title: string; html: SafeHtml; }

/**
 * "How our features work" for super admins (server/docs/features.md): a contents list and
 * one section at a time, so the guide reads like a handbook rather than one long scroll.
 */
@Component({
  selector: 'app-admin-docs',
  standalone: true,
  imports: [RouterModule, NavbarComponent],
  styleUrl: './admin-docs.component.css',
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="docs-page">
      <app-navbar></app-navbar>
      <main class="docs-main">
        <a routerLink="/admin" [style.color]="theme.colors().textSecondary" class="docs-back">← Back to Admin tools</a>
        <header class="docs-header">
          <p [style.color]="theme.colors().textSecondary" class="docs-eyebrow">Team guide · Super admins</p>
          <h1 class="docs-title">How our features work</h1>
          @if (lastUpdated()) {
            <p [style.color]="theme.colors().textSecondary" class="docs-updated">{{ lastUpdated() }}</p>
          }
        </header>

        @if (sections().length) {
          <div class="docs-layout">
            <nav class="docs-nav" role="tablist" aria-label="Guide sections" aria-orientation="vertical">
              @for (section of sections(); track section.id; let i = $index) {
                <button type="button" role="tab"
                        [attr.aria-selected]="i === activeIndex()"
                        [attr.aria-controls]="'docs-panel'"
                        (click)="open(section.id)"
                        [style.color]="i === activeIndex() ? theme.colors().onBgPrimary : theme.colors().textSecondary"
                        [style.background-color]="i === activeIndex() ? theme.colors().primary + '14' : 'transparent'"
                        [style.border-color]="i === activeIndex() ? theme.colors().primary : 'transparent'"
                        class="docs-nav__item">
                  <span class="docs-nav__num" aria-hidden="true">{{ i + 1 }}</span>
                  <span class="docs-nav__label">{{ section.title }}</span>
                </button>
              }
            </nav>

            @if (active(); as section) {
              <article id="docs-panel" role="tabpanel"
                       [style.background-color]="theme.colors().cardBg"
                       [style.border]="'1px solid ' + theme.colors().border"
                       class="docs-section">
                <p [style.color]="theme.colors().textSecondary" class="docs-section__count">Section {{ activeIndex() + 1 }} of {{ sections().length }}</p>
                <h2 class="docs-section__title">{{ section.title }}</h2>
                <div class="docs-body" [innerHTML]="section.html"></div>

                <div class="docs-pager" [style.border-top]="'1px solid ' + theme.colors().border">
                  @if (activeIndex() > 0) {
                    <button type="button" (click)="step(-1)"
                            [style.color]="theme.colors().onBgPrimary" [style.border]="'1px solid ' + theme.colors().border"
                            class="docs-pager__btn docs-pager__prev">
                      <span class="docs-pager__dir">← Previous</span>
                      <span class="docs-pager__name">{{ sections()[activeIndex() - 1].title }}</span>
                    </button>
                  }
                  @if (activeIndex() < sections().length - 1) {
                    <button type="button" (click)="step(1)"
                            [style.color]="theme.colors().onBgPrimary" [style.border]="'1px solid ' + theme.colors().border"
                            class="docs-pager__btn docs-pager__next">
                      <span class="docs-pager__dir">Next →</span>
                      <span class="docs-pager__name">{{ sections()[activeIndex() + 1].title }}</span>
                    </button>
                  }
                </div>
              </article>
            }
          </div>
        } @else if (error()) {
          <p [style.color]="theme.colors().textSecondary">{{ error() }}</p>
        } @else {
          <p [style.color]="theme.colors().textSecondary">Loading the guide…</p>
        }
      </main>
    </div>
  `
})
export class AdminDocsComponent {
  protected theme = inject(ThemeService);
  private adminApi = inject(AdminApiService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private markdown = signal('');
  error = signal('');
  private selectedId = signal('');
  private query = toSignal(this.route.queryParamMap);

  /** The guide split on its "## " headings, one card each. */
  sections = computed<DocSection[]>(() => {
    const parts = this.markdown().split(/^## /m).slice(1);
    return parts.map((part) => {
      const newline = part.indexOf('\n');
      const title = (newline === -1 ? part : part.slice(0, newline)).trim();
      const body = newline === -1 ? '' : part.slice(newline + 1);
      // renderSimpleMarkdown escapes all text and only emits a fixed set of tags.
      return { id: slugify(title), title, html: this.sanitizer.bypassSecurityTrustHtml(renderSimpleMarkdown(body)) };
    });
  });

  /** The italic note under the title, e.g. "Last updated 10 Nov 2026." */
  lastUpdated = computed(() => {
    const line = /^_(.+)_\s*$/m.exec(this.markdown().split(/^## /m)[0] || '');
    return line ? line[1] : '';
  });

  activeIndex = computed(() => {
    const id = this.selectedId() || this.query()?.get('section') || '';
    const index = this.sections().findIndex((s) => s.id === id);
    return index === -1 ? 0 : index;
  });
  active = computed(() => this.sections()[this.activeIndex()]);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.markdown.set((await this.adminApi.getFeatureDocs()).markdown || '');
    } catch {
      this.error.set("Couldn't load the guide. Try again in a moment.");
    }
  }

  open(id: string): void {
    this.selectedId.set(id);
    // Keep the section in the link, so it can be shared and survives a refresh.
    void this.router.navigate([], { queryParams: { section: id }, replaceUrl: true });
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  step(delta: number): void {
    const next = this.sections()[this.activeIndex() + delta];
    if (next) this.open(next.id);
  }
}
