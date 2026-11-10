import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDocsComponent } from './admin-docs.component';
import { AdminComponent } from './admin.component';
import { FeatureGateService } from '../../core/services/feature-gate.service';

const DOC = '# Dexii: How Our Features Work\n\n_Last updated 10 Nov 2026._\n\n## Overview\n\nDexii is an app.\n\n## The Stash\n\nOne card per crush.\n\n- **Archiving:** hides it.\n\n## The Tea\n\nThe feed.';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('Admin feature guide page', () => {
  let query: BehaviorSubject<any>;
  beforeEach(() => {
    localStorage.clear();
    query = new BehaviorSubject(convertToParamMap({}));
    vi.stubGlobal('fetch', vi.fn((url: string) =>
      String(url).endsWith('/admin/docs/features') ? json({ markdown: DOC, updatedAt: '2026-11-10T12:00:00Z' }) : json([])));
    TestBed.configureTestingModule({
      imports: [AdminDocsComponent, AdminComponent],
      providers: [
        provideRouter([]),
        { provide: FeatureGateService, useValue: { canManageSuperAdmins: () => true } },
        { provide: ActivatedRoute, useValue: { queryParamMap: query } }
      ]
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const settle = async (fixture: any) => {
    fixture.detectChanges();
    for (let i = 0; i < 4; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
  };
  const render = async () => {
    const fixture = TestBed.createComponent(AdminDocsComponent);
    await settle(fixture);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };
  const navLabels = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('.docs-nav [role="tab"] .docs-nav__label')).map((b) => b.textContent!.trim());

  it('lists every section in the contents and shows only the first one', async () => {
    const { root } = await render();
    expect(navLabels(root)).toEqual(['Overview', 'The Stash', 'The Tea']);
    expect(root.querySelector('.docs-nav [aria-selected="true"]')!.textContent).toContain('Overview');
    const card = root.querySelector('.docs-section')!;
    expect(card.querySelector('h2')!.textContent).toContain('Overview');
    expect(card.textContent).toContain('Dexii is an app.');
    expect(card.textContent).not.toContain('One card per crush.');
  });

  it('switches section from the contents and with Next / Previous', async () => {
    const { fixture, root } = await render();
    (Array.from(root.querySelectorAll<HTMLButtonElement>('.docs-nav [role="tab"]')).find((b) => b.textContent!.includes('The Stash'))!).click();
    await settle(fixture);
    expect(root.querySelector('.docs-section h2')!.textContent).toContain('The Stash');
    expect(root.querySelector('.docs-section li strong')!.textContent).toContain('Archiving:');

    root.querySelector<HTMLButtonElement>('.docs-pager__next')!.click();
    await settle(fixture);
    expect(root.querySelector('.docs-section h2')!.textContent).toContain('The Tea');
    expect(root.querySelector('.docs-pager__next')).toBeNull(); // last section

    root.querySelector<HTMLButtonElement>('.docs-pager__prev')!.click();
    await settle(fixture);
    expect(root.querySelector('.docs-section h2')!.textContent).toContain('The Stash');
  });

  it('opens straight to a section named in the link', async () => {
    query.next(convertToParamMap({ section: 'the-tea' }));
    const { root } = await render();
    expect(root.querySelector('.docs-section h2')!.textContent).toContain('The Tea');
  });

  it('is linked from the Admin page instead of being shown inline', async () => {
    const fixture = TestBed.createComponent(AdminComponent);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#feature-docs a[href="/admin/docs"]')).toBeTruthy();
    expect(root.querySelector('#feature-docs .admin-docs__body')).toBeNull();
  });
});
