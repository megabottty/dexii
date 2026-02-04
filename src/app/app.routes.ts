import { Routes } from '@angular/router';
import { lockGuard } from './core/guards/lock.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'lock',
    loadComponent: () => import('./features/lock-screen/lock-screen.component').then(m => m.LockScreenComponent)
  },
  {
    path: 'dashboard',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'profile/:id',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/profile-detail/profile-detail.component').then(m => m.ProfileDetailComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
