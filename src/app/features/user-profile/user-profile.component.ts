import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  styleUrl: './user-profile.component.css',
  imports: [CommonModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg"
         [style.color]="theme.colors().text"
         class="user-profile-component__s1">
      <div [style.background]="'linear-gradient(180deg, ' + theme.colors().primary + '30, ' + theme.colors().bg + ')'"
           class="user-profile-component__s2">
        <a routerLink="/dashboard"
           [style.color]="theme.colors().text"
           class="user-profile-component__s3">
          ← Dashboard
        </a>
      </div>

      <div class="user-profile-component__s4">
        <app-page-hint
          hintKey="user_profile_inline"
          title="Profile Hint"
          message="This page shows the user's crush list. Open any crush card to view details and notes.">
        </app-page-hint>

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s5">
          <div class="user-profile-component__s6">
            <img [src]="profileAvatar()"
                 [alt]="profileDisplayName()"
                 class="user-profile-component__s7">
            <div>
              <h1 class="user-profile-component__s8">{{ profileDisplayName() }}</h1>
              <p [style.color]="theme.colors().primary"
                 class="user-profile-component__s9">
                Her Boys
              </p>
              @if (profileBio()) {
                <p [style.color]="theme.colors().textSecondary"
                   class="user-profile-component__s10">
                  {{ profileBio() }}
                </p>
              }
            </div>
          </div>
        </div>

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s11">
          <div class="user-profile-component__s12">
            <p [style.color]="theme.colors().textSecondary"
               class="user-profile-component__s13">
              {{ crushes().length }} connections
            </p>
            @if (isSelf()) {
              <a routerLink="/dashboard"
                 [style.color]="theme.colors().primary"
                 class="user-profile-component__s14">
                + Add New Connection
              </a>
            }
          </div>

          @if (crushes().length > 0) {
            <div class="user-profile-component__s15">
              @for (crush of crushes(); track crush.id) {
                <a [routerLink]="['/profile', crush.id]"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   class="user-profile-component__s16">
                  <div class="user-profile-component__s17">
                    <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                         [alt]="crush.nickname"
                         class="user-profile-component__s18">
                    <div>
                      <p class="user-profile-component__s19">{{ crush.nickname }}</p>
                      <p [style.color]="theme.colors().textSecondary"
                         class="user-profile-component__s20">{{ crush.fullName || 'No first name set' }}</p>
                    </div>
                  </div>
                  <span [style.color]="theme.colors().primary"
                        class="user-profile-component__s21">
                    {{ crush.status }}
                  </span>
                </a>
              }
            </div>
          } @else {
            <div [style.border]="'1px dashed ' + theme.colors().border"
                 class="user-profile-component__s22">
              <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">No crush profiles found for this user yet.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class UserProfileComponent {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  public theme = inject(ThemeService);

  private currentUsername = localStorage.getItem('dexii_api_username') || 'dexii_demo_user';
  private routeUserId = signal(this.route.snapshot.paramMap.get('id') || 'me');

  isSelf = computed(() => {
    const id = this.routeUserId();
    return id === 'me' || id === this.currentUsername;
  });

  profileDisplayName = computed(() => (this.isSelf() ? this.currentUsername : this.routeUserId()));
  profileBio = computed(() => (this.isSelf() ? (localStorage.getItem('dexii_profile_bio') || '') : ''));

  profileAvatar = computed(() => `https://i.pravatar.cc/300?u=${encodeURIComponent(this.profileDisplayName())}`);

  crushes = computed(() => {
    const all = this.dataService.getAllCrushes()();
    if (this.isSelf()) return all;
    return all.filter((c) => c.userId === this.routeUserId());
  });
}
