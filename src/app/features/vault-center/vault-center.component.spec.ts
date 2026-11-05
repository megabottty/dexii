import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataService } from '../../core/services/data.service';
import { ModalService } from '../../core/services/modal.service';
import type { Entry } from '../../core/models/entry.model';
import { VaultCenterComponent } from './vault-center.component';

describe('Vault journal (DEX-43)', () => {
  const entries = signal<Entry[]>([]);
  const addEntry = vi.fn();
  let query: Record<string, string> = {};

  beforeEach(() => {
    localStorage.clear();
    entries.set([]);
    query = {};
    addEntry.mockReset();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]', { status: 200 }))));
    TestBed.configureTestingModule({
      imports: [VaultCenterComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useFactory: () => ({ snapshot: { queryParamMap: convertToParamMap(query) } }) },
        {
          provide: DataService,
          useValue: {
            getEntriesForCrush: (id: string) => computed(() => entries().filter((e) => e.crushId === id)),
            addEntry,
            updateEntryContent: vi.fn(),
            activeCrushes: signal([{ id: 'c1', nickname: 'Sunny' }, { id: 'c2', nickname: 'Rio' }])
          }
        }
      ]
    });
    vi.spyOn(TestBed.inject(ModalService), 'show').mockImplementation(() => undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  const render = () => {
    const fixture = TestBed.createComponent(VaultCenterComponent);
    fixture.detectChanges();
    return fixture;
  };
  const text = (fixture: ReturnType<typeof render>) => (fixture.nativeElement as HTMLElement).textContent || '';

  it('says plainly, on screen, that nothing in the Vault is ever shared', () => {
    expect(text(render())).toContain('Nothing in the Vault is ever shared');
  });

  it('lets an entry be about one of your crushes, and saves it unshared', () => {
    const fixture = render();
    const vault = fixture.componentInstance;
    const options = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select[aria-label="About a crush"] option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['No crush', 'Sunny', 'Rio']);

    vault.newJournalEntry = 'thinking about Rio';
    vault.journalCrushId.set('c2');
    vault.saveJournal();
    expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({ type: 'PrivateJournal', visibility: [], taggedCrushId: 'c2' }));
    expect(vault.journalCrushId()).toBe('');
  });

  it('shows which crush a tagged entry is about', () => {
    entries.set([{ id: 'e1', crushId: 'private_vault', type: 'PrivateJournal', content: 'hmm', timestamp: new Date(), visibility: [], isSensitive: true, taggedCrushId: 'c1' }]);
    expect(text(render())).toContain('About Sunny');
  });

  it('starts an entry about the crush you came from (Write in the Vault)', () => {
    query = { crush: 'c2' };
    expect(render().componentInstance.journalCrushId()).toBe('c2');
  });
});
