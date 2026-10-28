import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageMenuComponent } from './message-menu.component';

describe('MessageMenuComponent', () => {
  let fixture: ComponentFixture<MessageMenuComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const items = () => Array.from(el().querySelectorAll('.mm-item')).map((b) => b.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MessageMenuComponent] }).compileComponents();
    fixture = TestBed.createComponent(MessageMenuComponent);
  });

  const open = () => {
    el().querySelector<HTMLButtonElement>('.mm-trigger')!.click();
    fixture.detectChanges();
  };

  it('offers edit and delete for everyone on your own message, like other chat apps', () => {
    fixture.componentRef.setInput('mine', true);
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();
    open();
    expect(items()).toEqual(['✏️ Edit', '🗑️ Delete for everyone', '🙈 Delete for me']);
  });

  it("only offers delete for me on someone else's message", () => {
    fixture.detectChanges();
    open();
    expect(items()).toEqual(['🙈 Delete for me']);
  });

  it('emits the choice and closes', () => {
    fixture.componentRef.setInput('mine', true);
    fixture.detectChanges();
    const picked: string[] = [];
    fixture.componentInstance.deleteForEveryone.subscribe(() => picked.push('everyone'));
    open();
    el().querySelectorAll<HTMLButtonElement>('.mm-item')[0].click();
    fixture.detectChanges();
    expect(picked).toEqual(['everyone']);
    expect(el().querySelector('.mm-menu')).toBeNull();
  });
});
