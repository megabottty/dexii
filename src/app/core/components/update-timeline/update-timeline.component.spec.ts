import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('shows friends no composer and no edit buttons', () => {
    fixture.componentRef.setInput('entries', [update('a', 'hi', new Date())]);
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

  describe('reactions and comments (DEX-45)', () => {
    const withActivity = (): Entry => ({
      ...update('u1', 'We kissed!', new Date()),
      userId: 'owner',
      reactions: [
        { userId: 'ana', emoji: '😍' }, { userId: 'me', emoji: '😍' }, { userId: 'ben', emoji: '🔥' }
      ],
      comments: [
        { id: 'c1', userId: 'ana', content: 'omg', createdAt: new Date(), hearts: ['me'], user: { id: 'ana', username: 'ana' } },
        { id: 'c2', userId: 'me', content: 'yay', createdAt: new Date(), hearts: [] },
        { id: 'c3', userId: 'ben', content: 'finally', createdAt: new Date(), hearts: [] }
      ]
    });

    it('counts each emoji and marks yours', () => {
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.detectChanges();
      expect(fixture.componentInstance.reactionCounts(withActivity())).toEqual([
        { emoji: '😍', count: 2, mine: true },
        { emoji: '🔥', count: 1, mine: false }
      ]);
    });

    it('shows the last two comments until View all, with your heart filled', () => {
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.detectChanges();
      expect(el().querySelectorAll('.ut-comment').length).toBe(2);
      const viewAll = el().querySelector<HTMLButtonElement>('.ut-view-all')!;
      expect(viewAll.textContent).toContain('View all 3 comments');
      viewAll.click();
      fixture.detectChanges();
      expect(el().querySelectorAll('.ut-comment').length).toBe(3);
      expect(el().querySelector('.ut-heart--on')).not.toBeNull();
    });

    it("lets you edit only your own comment, and delete only yours when it isn't your update", () => {
      fixture.componentRef.setInput('entries', [withActivity()]);
      fixture.componentInstance.expand('u1');
      fixture.detectChanges();
      const rows = Array.from(el().querySelectorAll('.ut-comment'));
      const buttons = (i: number) => Array.from(rows[i].querySelectorAll('.ut-comment__meta button')).map((b) => b.textContent?.trim());
      expect(buttons(0)).toEqual([]);
      expect(buttons(1)).toEqual(['Edit', 'Delete']);
    });

    it('lets the person whose update it is delete anyone’s comment', () => {
      fixture.componentRef.setInput('entries', [{ ...withActivity(), userId: 'me' }]);
      fixture.componentInstance.expand('u1');
      fixture.detectChanges();
      const first = el().querySelectorAll('.ut-comment')[0];
      expect(Array.from(first.querySelectorAll('.ut-comment__meta button')).map((b) => b.textContent?.trim())).toEqual(['Delete']);
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
