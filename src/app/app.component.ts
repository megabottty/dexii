import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SecurityService } from './core/services/security.service';
import { ThemeService } from './core/services/theme.service';
import { AlertModalComponent } from './core/components/alert-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AlertModalComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" style="min-height: 100vh; margin: 0; padding: 0; transition: background-color 0.5s ease;">
      <router-outlet></router-outlet>
      <app-alert-modal></app-alert-modal>
    </div>
  `
})
export class AppComponent implements OnInit {
  protected security = inject(SecurityService);
  protected theme = inject(ThemeService);
  private router = inject(Router);
  protected readonly title = signal('dexii');

  ngOnInit() {
    console.log('AppComponent initialized, isLocked:', this.security.isLocked());
    if (this.security.isLocked()) {
      console.log('AppComponent is locked, navigating to /lock');
      this.router.navigate(['/lock']);
    } else {
      console.log('AppComponent is not locked');
    }
  }
}
