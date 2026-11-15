import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Entry } from '../../models/entry.model';
import { SecurityService } from '../../services/security.service';
import { DataService } from '../../services/data.service';
import { UpdateTimelineComponent, dayLabel, timeAgo } from './update-timeline.component';

const update = (id: string, content: string, timestamp: Date): Entry => ({
  id, crushId: 'c1', type: 'Update', content, timestamp, visibility: [], isSensitive: false
});

describe('UpdateTimelineComponent (DEX-44)', () => {
  let fixture: ComponentFixture<UpdateTimelineComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateTimelineComponent],
      providers: [
        provideRouter([]),
        { provide: SecurityService, useValue: { currentUserId: () => 'me', moderateContent: () => true } },
        // The timeline only calls these on DataService; stubbed so no real service (or network) starts.
        { provide: DataService, useValue: { reactToUpdate: async () => {}, commentOnUpdate: async () => {}, editUpdateComment: async () => {}, deleteUpdateComment: async () => {}, heartUpdateComment: async () => {} } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(UpdateTimelineComponent);
    fixture.componentRef.setInput('crushName', 'Sunny');
  });

  it('groups updates by day, newest first', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    fixture.componentRef.setInput('entries', [update('a', 'older', yesterday), update('b', 'newer', now)]);
    fixture.detectChanges();
    const labels = Array.from(el().querySelectorAll('.ut-day__label')).map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Today', 'Yesterday']);
    const texts = Array.from(el().querySelectorAll('.ut-bubble__text')).map((n) => n.textContent?.trim());
    expect(texts).toEqual(['newer', 'older']);
  });

  it('lets the owner share once something is typed, and says who it goes to', () => {
    fixture.componentRef.setInput('entries', []);
    fixture.componentRef.setInput('canPost', true);
    fixture.componentRef.setInput('audience', ['Ana', 'Ben']);
    fixture.detectChanges();
    const button = el().querySelector<HTMLButtonElement>('.ut-composer .ut-share')!;
    expect(button.textContent).toContain('Share Update');
    expect(button.disabled).toBe(true);
    expect(el().textContent).toContain('Goes to Ana, Ben');

    const shared: string[] = [];
    fixture.componentInstance.share.subscribe((text) => shared.push(text));
    fixture.componentInstance.draft.set('  We kissed!  ');
    fixture.detectChanges();
    button.click();
    expect(shared).toEqual(['We kissed!']);
  });

  it('shows friends no composer and no edit buttons on someone else’s update', () => {
    fixture.componentRef.setInput('entries', [{ ...update('a', 'hi', new Date()), userId: 'owner' }]);
    fixture.detectChanges();
    expect(el().querySelector('.ut-composer')).toBeNull();
    expect(el().querySelector('.ut-icon-btn')).toBeNull();
  });

  it('labels older days by date', () => {
    const today = new Date(2026, 9, 27);
    expect(dayLabel(new Date(2026, 9, 27, 9), today)).toBe('Today');
    expect(dayLabel(new Date(2026, 9, 26, 23), today)).toBe('Yesterday');
    expect(dayLabel(new Date(2025, 0, 2), today)).toContain('2025');
  });

  describe('reactions and the chat icon (DEX-45, DEX-71)', () => {
    const withActivity = (): Entry => ({
      ...update('u1', 'We kissed!', new Date()),
      userId: 'owner',
      owner: { id: 'owner', username: 'ana', displayName: 'Ana Lopez' },
      reactions: [
        { userId: 'ana', emoji: '😍' }, { userId: 'me', emoji: '😍' }, { userId: 'ben', emoji: '🔥' }
      ],
      comments: [
        { id: 'c1', userId: 'ana', content: 'omg', createdAt: new Date(), hearts: ['me'], user: { id: 'ana', username: 'ana' } }
      ]
    } as Entry);

    it('shows nothing to act on when the timeline is read-only (owner previewing as a friend)', () => {
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.componentRef.setInput('interactive', false);
      fixture.detectChanges();
      expect(el().querySelector('.ut-bubble__text')?.textContent).toContain('We kissed!');
      expect(el().querySelector('.ut-reactions')).toBeNull();
      expect(el().querySelector('.ut-chat')).toBeNull();
    });

    it("lets a friend react and gives them the top-menu chat icon, with no word, on the owner's update", () => {
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.detectChanges();
      expect(el().querySelector('.ut-reactions')).not.toBeNull();
      const chat = el().querySelector<HTMLButtonElement>('.ut-chat')!;
      expect(chat).toBeTruthy();
      expect(chat.querySelector('img')?.getAttribute('src')).toBe('icons/nav/chat.svg');
      expect(chat.textContent?.trim()).toBe('');
      expect(chat.getAttribute('aria-label')).toBe('Chat with Ana Lopez about this update');
    });

    it("opens the one-to-one chat with the update's owner, quoting the update", () => {
      const router = TestBed.inject(Router);
      const calls: unknown[][] = [];
      router.navigate = ((...args: unknown[]) => { calls.push(args); return Promise.resolve(true); }) as Router['navigate'];
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.detectChanges();
      el().querySelector<HTMLButtonElement>('.ut-chat')!.click();
      expect(calls).toEqual([[['/chat'], { queryParams: { friendId: 'owner', friendName: 'Ana Lopez', quoteEntryId: 'u1' } }]]);
    });

    it('gives the owner no chat icon on their own update, but keeps reactions', () => {
      fixture.componentRef.setInput('entries', [{ ...withActivity(), userId: 'me' }]);
      fixture.componentRef.setInput('isCrushOwner', true);
      fixture.detectChanges();
      expect(el().querySelector('.ut-reactions')).not.toBeNull();
      expect(el().querySelector('.ut-chat')).toBeNull();
    });

    it('has no comments anywhere: no Comment link, comment list, comment box or expand-all', () => {
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.detectChanges();
      expect(el().querySelector('.ut-comments-toggle')).toBeNull();
      expect(el().querySelector('.ut-comments')).toBeNull();
      expect(el().querySelector('.ut-add-comment')).toBeNull();
      expect(el().querySelector('.ut-expand-all')).toBeNull();
      expect(el().textContent).not.toMatch(/comment/i);
    });

    it('counts each emoji and marks yours', () => {
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.detectChanges();
      expect(fixture.componentInstance.reactionCounts(withActivity())).toEqual([
        { emoji: '😍', count: 2, mine: true },
        { emoji: '🔥', count: 1, mine: false }
      ]);
    });

    it("shows a friend's post with their name, lets the crush's owner delete it but not edit it", () => {
      fixture.componentRef.setInput('entries', [{ ...withActivity(), userId: 'ana', owner: { id: 'ana', username: 'ana', displayName: 'Ana' } } as any]);
      fixture.componentRef.setInput('canPost', true);
      fixture.componentRef.setInput('isCrushOwner', true);
      fixture.detectChanges();
      expect(el().querySelector('.ut-bubble__author')?.textContent).toContain('ana');
      const labels = Array.from(el().querySelectorAll('.ut-bubble__actions button')).map((b) => b.getAttribute('aria-label'));
      expect(labels).toEqual(['Delete update']);
    });

    it('shows a status change as its own entry that nobody can edit', () => {
      fixture.componentRef.setInput('entries', [{ ...update('s1', 'Dating', new Date()), type: 'StatusChange', userId: 'me' }]);
      fixture.componentRef.setInput('isCrushOwner', true);
      fixture.componentRef.setInput('sharedWith', 'Shared with Ana, Ben');
      fixture.detectChanges();
      expect(el().querySelector('.ut-status')?.textContent?.replace(/\s+/g, ' ')).toContain('Status changed to Dating');
      expect(el().textContent).toContain('Shared with Ana, Ben');
      const labels = Array.from(el().querySelectorAll('.ut-bubble__actions button')).map((b) => b.getAttribute('aria-label'));
      expect(labels).toEqual(['Delete update']);
    });

    it('shows a status change with the old status, and a Feels change, neither editable (DEX-68)', () => {
      fixture.componentRef.setInput('entries', [
        { ...update('s2', 'Dating', new Date()), type: 'StatusChange', previousStatus: 'Crush', userId: 'me' },
        { ...update('f1', 'Slow burn, Butterflies', new Date(Date.now() - 1000)), type: 'FeelsChange', userId: 'me' }
      ]);
      fixture.componentRef.setInput('isCrushOwner', true);
      fixture.detectChanges();
      expect(el().querySelector('.ut-status')?.textContent?.replace(/\s+/g, ' ')).toContain('Status changed from Crush to Dating');
      expect(el().querySelector('.ut-feels')?.textContent?.replace(/\s+/g, ' ')).toContain('The Feels: Slow burn, Butterflies');
      const labels = Array.from(el().querySelectorAll('.ut-bubble__actions button')).map((b) => b.getAttribute('aria-label'));
      expect(labels).toEqual(['Delete update', 'Delete update']);
    });

    it('sends a reaction through the data service', () => {
      const data = TestBed.inject(DataService);
      const calls: string[] = [];
      data.reactToUpdate = async (_id: string, emoji: string) => { calls.push(emoji); };
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.detectChanges();
      fixture.componentInstance.react(withActivity(), '💗');
      expect(calls).toEqual(['💗']);
    });

    it('words comment times like Instagram', () => {
      const now = new Date(2026, 9, 27, 12, 0, 0);
      expect(timeAgo(new Date(2026, 9, 27, 11, 59, 30), now)).toBe('now');
      expect(timeAgo(new Date(2026, 9, 27, 11, 55), now)).toBe('5m');
      expect(timeAgo(new Date(2026, 9, 27, 9, 0), now)).toBe('3h');
      expect(timeAgo(new Date(2026, 9, 25, 12, 0), now)).toBe('2d');
    });
  });
});
