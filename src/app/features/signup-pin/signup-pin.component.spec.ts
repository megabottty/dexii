import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SignupPinComponent } from './signup-pin.component';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';

describe('SignupPinComponent', () => {
  let component: SignupPinComponent;
  let fixture: ComponentFixture<SignupPinComponent>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const securitySpy = jasmine.createSpyObj('SecurityService', ['setInitialPin']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [SignupPinComponent],
      providers: [
        { provide: SecurityService, useValue: securitySpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    securityService = TestBed.inject(SecurityService) as jasmine.SpyObj<SecurityService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(SignupPinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display initial PIN creation message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const subtitle = compiled.querySelector('.pin-subtitle');
    expect(subtitle?.textContent).toContain('Create Your 4-Digit Vault PIN');
  });

  it('should accept PIN input and build 4-digit PIN', () => {
    component.handleInput('1');
    component.handleInput('2');
    component.handleInput('3');
    component.handleInput('4');

    expect(component.setupPinFirst()).toBe('1234');
  });

  it('should show success message after first PIN entry', () => {
    component.handleInput('1');
    component.handleInput('2');
    component.handleInput('3');
    component.handleInput('4');

    fixture.detectChanges();

    expect(component.successMessage()).toContain('PIN saved!');
    expect(component.enteredPin()).toBe(''); // Should be cleared
  });

  it('should update subtitle to "Confirm your new PIN" after first entry', () => {
    component.handleInput('1');
    component.handleInput('2');
    component.handleInput('3');
    component.handleInput('4');

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const subtitle = compiled.querySelector('.pin-subtitle');
    expect(subtitle?.textContent).toContain('Confirm your new PIN');
  });

  it('should show error if PINs do not match', () => {
    // First PIN
    component.handleInput('1');
    component.handleInput('2');
    component.handleInput('3');
    component.handleInput('4');

    // Different second PIN
    component.handleInput('5');
    component.handleInput('6');
    component.handleInput('7');
    component.handleInput('8');

    expect(component.errorMessage()).toContain('did not match');
    expect(component.pinConfirmed()).toBe(false);
  });

  it('should confirm PIN when both entries match', () => {
    // First PIN
    component.handleInput('1');
    component.handleInput('2');
    component.handleInput('3');
    component.handleInput('4');

    // Matching second PIN
    component.handleInput('1');
    component.handleInput('2');
    component.handleInput('3');
    component.handleInput('4');

    expect(component.pinConfirmed()).toBe(true);
    expect(component.successMessage()).toContain('PIN confirmed!');
    expect(component.errorMessage()).toBe('');
  });

  it('should show "Create My Account" button after PIN confirmation', () => {
    component.pinConfirmed.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const createButton = compiled.querySelector('button');
    expect(createButton?.textContent).toContain('Create My Account');
  });

  it('should call setInitialPin when creating account', () => {
    component.setupPinFirst.set('1234');
    component.pinConfirmed.set(true);
    component.createAccount();

    expect(securityService.setInitialPin).toHaveBeenCalledWith('1234');
  });

  it('should not allow more than 4 digits', () => {
    component.handleInput('1');
    component.handleInput('2');
    component.handleInput('3');
    component.handleInput('4');
    component.handleInput('5'); // Should be ignored

    expect(component.enteredPin().length).toBeLessThanOrEqual(4);
  });

  it('should clear PIN input when clear button is clicked', () => {
    component.handleInput('1');
    component.handleInput('2');
    component.clear();

    expect(component.enteredPin()).toBe('');
  });
});
