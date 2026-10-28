import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Entry } from '../../models/entry.model';
import { UpdateTimelineComponent, dayLabel } from './update-timeline.component';

const update = (id: string, content: string, timestamp: Date): Entry => ({
  id, crushId: 'c1', type: 'Update', content, timestamp, visibility: [], isSensitive: false
});

describe('UpdateTimelineComponent (DEX-44)', () => {
  let fixture: ComponentFixture<UpdateTimelineComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UpdateTimelineComponent] }).compileComponents();
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
});
