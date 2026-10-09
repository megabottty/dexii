import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { lockGuard } from './core/guards/lock.guard';
import { accessGuard } from './core/guards/access.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'login',
    title: 'Log in',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'lock',
    title: 'Unlock',
    loadComponent: () => import('./features/lock-screen/lock-screen.component').then(m => m.LockScreenComponent)
  },
  {
    path: 'signup-profile',
    title: 'Create account',
    loadComponent: () => import('./features/signup-profile/signup-profile.component').then(m => m.SignupProfileComponent)
  },
  {
    path: 'signup-pin',
    title: 'Set PIN',
    loadComponent: () => import('./features/signup-pin/signup-pin.component').then(m => m.SignupPinComponent)
  },
  {
    path: 'signup-email-confirmation',
    title: 'Confirm email',
    loadComponent: () => import('./features/signup-email-confirmation/signup-email-confirmation.component').then(m => m.SignupEmailConfirmationComponent)
  },
  {
    path: 'signup-notifications',
    title: 'Notifications setup',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/signup-notifications/signup-notifications.component').then(m => m.SignupNotificationsComponent)
  },
  {
    path: 'dashboard',
    title: 'Crushes',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'feed',
    title: 'Tea',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent)
  },
  {
    path: 'profile/:id',
    title: 'Crush',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/profile-detail/profile-detail.component').then(m => m.ProfileDetailComponent)
  },
  {
    path: 'friends',
    title: 'Friends',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/friends-list/friends-list.component').then(m => m.FriendsListComponent)
  },
  {
    path: 'sharing',
    title: 'Sharing',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/sharing/sharing.component').then(m => m.SharingComponent)
  },
  {
    path: 'friends/:id',
    title: 'Friendship',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/friend-profile/friend-profile.component').then(m => m.FriendProfileComponent)
  },
  {
    path: 'user/:id',
    title: 'Profile',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/user-profile/user-profile.component').then(m => m.UserProfileComponent)
  },
  {
    path: 'chat',
    title: 'Chats',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/messaging/messaging.component').then(m => m.MessagingComponent)
  },
  {
    path: 'groups/:groupId',
    title: 'Group chat',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/group-chat/group-chat.component').then(m => m.GroupChatComponent)
  },
  {
    path: 'shared-history',
    redirectTo: () => inject(Router).createUrlTree(['/sharing'], { queryParams: { tab: 'history' } })
  },
  {
    path: 'vault',
    title: 'Vault',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/vault-center/vault-center.component').then(m => m.VaultCenterComponent)
  },
  {
    path: 'settings',
    title: 'Settings',
    canActivate: [lockGuard],
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    // Super admin tools. accessGuard blocks the URL for anyone below that rung.
    path: 'admin',
    title: 'Admin',
    canActivate: [lockGuard, accessGuard('manageSuperAdmins')],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
