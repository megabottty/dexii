import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrushStatus } from '../../core/models/crush-profile.model';
import { DataService } from '../../core/services/data.service';
import { ModalService } from '../../core/services/modal.service';
import { ProfileDetailComponent } from './profile-detail.component';

const ID = '6b0000000000000000000001';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('Crush profile: update feed on top after the first visit (DEX-48)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState({}, '');
    localStorage.setItem('dexii_api_token', 'token');
    const sunny = { _id: ID, nickname: 'Sunny', status: 'Crush', visibility: [], bio: 'Sweet barista', memorableMoments: 'The night at the lake' };
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (String(url).endsWith('/crushes')) return init?.method === 'POST' ? json(sunny, 201) : json([sunny]);
      return json([]);
    }));
    TestBed.configureTestingModule({
      imports: [ProfileDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: ID })), queryParamMap: of(convertToParamMap({})), snapshot: { paramMap: convertToParamMap({ id: ID }), queryParamMap: convertToParamMap({}) } } }
      ]
    });
    vi.spyOn(TestBed.inject(ModalService), 'show').mockImplementation(() => undefined);
    const data = TestBed.inject(DataService);
    const local = data.addCrush({ nickname: 'Sunny', fullName: '', displayName: 'nickname', avatarUrl: '', status: CrushStatus.Crush, visibility: [], rating: 3, relationshipLabels: [], customNotes: '', bio: 'Sweet barista' } as any);
    await data.savedCrush(local.id);
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Where the feed and the bio sit on the page: negative means the feed comes first. */
  const feedVsDetails = async () => {
    const fixture = TestBed.createComponent(ProfileDetailComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const feed = root.querySelector("#updates-title");
    const bio = root.querySelector('.profile-bio');
    expect(feed).toBeTruthy();
    expect(bio).toBeTruthy();
    return feed!.compareDocumentPosition(bio!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  };

  it('right after creating the crush, shows their details first', async () => {
    history.replaceState({ justCreated: ID }, '');
    expect(await feedVsDetails()).toBe(1);
  });

  it('on every later visit, shows the update feed above the details', async () => {
    expect(await feedVsDetails()).toBe(-1);
  });

  it('only shows details first once, even if the same page state comes back', async () => {
    history.replaceState({ justCreated: ID }, '');
    await feedVsDetails();
    expect(await feedVsDetails()).toBe(-1);
  });

  it('keeps Memorable Moments folded until you tap it', async () => {
    const fixture = TestBed.createComponent(ProfileDetailComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Memorable Moments');
    expect(root.textContent).not.toContain('The night at the lake');
    (root.querySelector('[aria-controls="memorable-moments"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.textContent).toContain('The night at the lake');
  });
});
