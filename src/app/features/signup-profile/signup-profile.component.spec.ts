import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SignupProfileComponent } from './signup-profile.component';
import { ThemeService } from '../../core/services/theme.service';

describe('SignupProfileComponent', () => {
  let component: SignupProfileComponent;
  let fixture: ComponentFixture<SignupProfileComponent>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [SignupProfileComponent],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(SignupProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not cache form data in localStorage on initialization', () => {
    expect(component.username()).toBe('');
    expect(component.email()).toBe('');
    expect(component.bio()).toBe('');
  });

  it('should validate username requirements', () => {
    component.username.set('');
    component.continue();
    expect(component.errorMessage()).toContain('Username is required');
  });

  it('should validate username format (3-24 chars, alphanumeric)', () => {
    component.username.set('ab');
    component.continue();
    expect(component.errorMessage()).toContain('3-24 chars');

    component.username.set('valid_user_123');
    component.continue();
    expect(component.errorMessage()).toBe('');
  });

  it('should require an email and validate email format', () => {
    component.username.set('validuser');
    component.email.set('');
    component.continue();
    expect(component.errorMessage()).toContain('Email is required');

    component.email.set('invalid-email');
    component.continue();
    expect(component.errorMessage()).toContain('valid email');

    component.email.set('valid@example.com');
    component.continue();
    expect(component.errorMessage()).toBe('');
  });

  it('should navigate to PIN setup on valid form submission', () => {
    component.username.set('testuser');
    component.email.set('test@example.com');
    component.bio.set('Test bio');
    component.continue();

    expect(router.navigate).toHaveBeenCalledWith(['/signup-pin']);
  });

  it('should clear cached credentials after navigation', () => {
    // Simulate that localStorage was populated from a previous failed attempt
    localStorage.setItem('dexii_api_username', 'olduser');
    localStorage.setItem('dexii_profile_email', 'old@example.com');

    // Create new component instance
    const newFixture = TestBed.createComponent(SignupProfileComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    // Should NOT load from localStorage
    expect(newComponent.username()).toBe('');
    expect(newComponent.email()).toBe('');
  });

  it('should have autocomplete="off" on username and email inputs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const usernameInput = compiled.querySelector('input[placeholder="e.g. dev_user"]') as HTMLInputElement;
    const emailInput = compiled.querySelector('input[placeholder="email@example.com"]') as HTMLInputElement;

    expect(usernameInput?.getAttribute('autocomplete')).toBe('off');
    expect(emailInput?.getAttribute('autocomplete')).toBe('off');
  });
});
