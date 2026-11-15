import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagingComponent } from './messaging.component';

const ME = '6aa2f82237d736a1196c9e1d';
const ANA = '6aab389c4cdfe3aa2ae76a8d';
const UPDATE = '6ac000000000000000000001';
const CRUSH = '6ab000000000000000000001';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

/** DEX-71: tapping the chat icon on a friend's crush update opens chat with that update quoted. */
describe('Replying to a crush update in chat (DEX-71)', () => {
  let posted: any[];
  let params: BehaviorSubject<any>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dexii_api_token', 'token');
    localStorage.setItem('dexii_api_user_id', ME);
    posted = [];
    const quote = { entryId: UPDATE, crushId: CRUSH, crushName: 'Alex', excerpt: 'We went to the farmers market…' };
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith(`/entries/${UPDATE}/quote`)) return json(quote);
      if (u.endsWith('/messages') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        posted.push(body);
        return json({ _id: '6ad000000000000000000001', sender: ME, recipient: ANA, content: body.content, crushId: CRUSH, relatedEntryId: UPDATE, quote, createdAt: new Date().toISOString() });
      }
      if (u.endsWith('/friends')) return json([{ id: ANA, username: 'ana', displayName: 'Ana Lopez' }]);
      return json([]);
    }));
    params = new BehaviorSubject(convertToParamMap({ friendId: ANA, friendName: 'Ana Lopez', quoteEntryId: UPDATE }));
    TestBed.configureTestingModule({
      imports: [MessagingComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable(), paramMap: params.asObservable(), snapshot: { queryParamMap: params.value } } }
      ]
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Renders the chat and lets the quote and friend list load. */
  const render = async () => {
    const fixture = TestBed.createComponent(MessagingComponent);
    fixture.detectChanges();
    for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('shows the update being replied to above the message box', async () => {
    const { root } = await render();
    const preview = root.querySelector('.messaging-reply-quote');
    expect(preview?.textContent).toContain('Alex');
    expect(preview?.textContent).toContain('We went to the farmers market');
  });

  it('sends the quote with the message, keeps it on the sent message, and clears the preview', async () => {
    const { fixture, root } = await render();
    const component = fixture.componentInstance;
    component.newMessage = 'omg tell me everything';
    component.send();
    for (let i = 0; i < 4; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
    expect(posted[0].quoteEntryId).toBe(UPDATE);
    expect(root.querySelector('.messaging-reply-quote')).toBeNull();
    const bubbleQuote = root.querySelector('.messaging-quote');
    expect(bubbleQuote?.textContent).toContain('Alex');
    expect(bubbleQuote?.textContent).toContain('We went to the farmers market');
  });

  it('lets you drop the quote before sending', async () => {
    const { fixture, root } = await render();
    root.querySelector<HTMLButtonElement>('.messaging-reply-quote__close')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.messaging-reply-quote')).toBeNull();
    fixture.componentInstance.newMessage = 'hey';
    fixture.componentInstance.send();
    await new Promise((r) => setTimeout(r, 0));
    expect(posted[0]?.quoteEntryId).toBeUndefined();
  });
});
