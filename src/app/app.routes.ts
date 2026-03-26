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
    path: 'signup-profile',
    loadComponent: () => import('./features/signup-profile/signup-profile.component').then(m => m.SignupProfileComponent)
  },
  {
    path: 'signup-pin',
    loadComponent: () => import('./features/signup-pin/signup-pin.component').then(m => m.SignupPinComponent)
  },
  {
    path: 'signup-email-confirmation',
    loadComponent: () => import('./features/signup-email-confirmation/signup-email-confirmation.component').then(m => m.SignupEmailConfirmationComponent)
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
    path: 'friends',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/friends-list/friends-list.component').then(m => m.FriendsListComponent)
  },
  {
    path: 'friends/:id',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/friend-profile/friend-profile.component').then(m => m.FriendProfileComponent)
  },
  {
    path: 'user/:id',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/user-profile/user-profile.component').then(m => m.UserProfileComponent)
  },
  {
    path: 'chat',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/messaging/messaging.component').then(m => m.MessagingComponent)
  },
  {
    path: 'vault',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/vault-center/vault-center.component').then(m => m.VaultCenterComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
