import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataService } from '../../core/services/data.service';
import { MessagingComponent } from './messaging.component';

const ME = '6aa2f82237d736a1196c9e1d';
const ANA = '6aab389c4cdfe3aa2ae76a8d';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

/** The chat's typing box (multi-line, grows) and the "+ Add Crush" share picker. */
describe('Chat composer and crush share picker', () => {
  const shared = new Set<string>();

  beforeEach(() => {
    localStorage.clear();
    shared.clear();
    localStorage.setItem('dexii_api_token', 'token');
    localStorage.setItem('dexii_api_user_id', ME);
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (String(url).endsWith('/friends')) return json([{ id: ANA, username: 'ana', displayName: 'Ana Lopez' }]);
      return json([]);
    }));
    const params = new BehaviorSubject(convertToParamMap({ friendId: ANA, friendName: 'Ana Lopez' }));
    TestBed.configureTestingModule({
      imports: [MessagingComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable(), paramMap: params.asObservable(), snapshot: { queryParamMap: params.value } } }
      ]
    });
    // Only the share-picker bits of the data service are faked; the rest stays real.
    const data = TestBed.inject(DataService);
    Object.defineProperty(data, 'activeCrushes', { value: signal([{ id: 'c1', nickname: 'Alex', status: 'Crushing' }]) });
    vi.spyOn(data, 'isCrushSharedWith').mockImplementation((crush: any) => shared.has(crush.id));
    vi.spyOn(data, 'toggleCrushVisibility').mockImplementation((id: string) => { if (shared.has(id)) shared.delete(id); else shared.add(id); });
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Renders the chat with Ana and lets the friend list load. */
  const render = async () => {
    const fixture = TestBed.createComponent(MessagingComponent);
    fixture.detectChanges();
    for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('uses a multi-line box for typing', async () => {
    const { root } = await render();
    const box = root.querySelector('[aria-label="Message input"]');
    expect(box?.tagName).toBe('TEXTAREA');
  });

  it('sends on Enter but not on Shift+Enter (keyboard)', async () => {
    const { fixture } = await render();
    const chat = fixture.componentInstance;
    const send = vi.spyOn(chat, 'send').mockImplementation(() => undefined);
    vi.spyOn(chat as any, 'enterSends').mockReturnValue(true);

    chat.onComposerEnter(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(send).not.toHaveBeenCalled();
    chat.onComposerEnter(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('lets Enter add a new line on touch screens', async () => {
    const { fixture } = await render();
    const chat = fixture.componentInstance;
    const send = vi.spyOn(chat, 'send').mockImplementation(() => undefined);
    vi.spyOn(chat as any, 'enterSends').mockReturnValue(false);
    chat.onComposerEnter(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(send).not.toHaveBeenCalled();
  });

  it('makes the whole crush card the share toggle, with a small status chip', async () => {
    const { fixture, root } = await render();
    fixture.componentInstance.toggleAddCrush();
    fixture.detectChanges();
    const card = root.querySelector<HTMLButtonElement>('button.messaging-crush-picker-card')!;
    expect(card).not.toBeNull();
    expect(card.getAttribute('aria-pressed')).toBe('false');
    expect(card.querySelector('.messaging-crush-picker-chip')?.textContent).toContain('Share');

    card.click();
    fixture.detectChanges();
    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(card.querySelector('.messaging-crush-picker-chip')?.textContent).toContain('Shared');
  });
});
