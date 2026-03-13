import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { CrushStatus } from '../../core/models/crush-profile.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         style="min-height: 100vh; font-family: 'Times New Roman', serif; padding-bottom: 60px; transition: all 0.8s ease; position: relative; overflow-x: hidden;">

      <!-- New Entry Modal -->
      @if (showNewEntryModal()) {
        <div style="position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; backdrop-blur: 15px; padding: 20px;">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               style="width: 100%; max-width: 500px; padding: 40px; border-radius: 0px; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">

            <button (click)="closeModal()" [style.color]="theme.colors().textSecondary" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>

            <h3 style="font-size: 32px; font-weight: 200; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 32px; text-align: center;">New Connection</h3>

            <div style="display: flex; flex-direction: column; gap: 24px; max-height: 70vh; overflow-y: auto; padding-right: 10px;">
              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Avatar (Optional)</label>
                <div style="display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                  <button (click)="avatarUpload.click()" [style.border]="'1px solid ' + theme.colors().primary"
                          [style.color]="theme.colors().primary"
                          style="background: transparent; padding: 8px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
                    Upload Photo
                  </button>
                  <input #avatarUpload type="file" accept="image/*" (change)="onAvatarFileSelected($event)" style="display: none;">
                  @if (uploadedAvatarName()) {
                    <span [style.color]="theme.colors().textSecondary" style="font-size: 10px;">{{ uploadedAvatarName() }}</span>
                  }
                </div>

                @if (newCrush.avatarUrl) {
                  <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                    <img [src]="newCrush.avatarUrl" [style.border]="'1px solid ' + theme.colors().border"
                         style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;">
                    @if (cropSourceImage()) {
                      <button (click)="showCropModal.set(true)" [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().text"
                              style="background: transparent; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">
                        Re-Crop
                      </button>
                    }
                  </div>
                }

                <div style="display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                   @for (avatar of mockAvatars; track avatar) {
                     <img [src]="avatar" (click)="newCrush.avatarUrl = avatar"
                          [style.border]="newCrush.avatarUrl === avatar ? '2px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                          style="width: 50px; height: 50px; cursor: pointer; border-radius: 50%; object-fit: cover;">
                   }
                </div>
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Nickname</label>
                <input [(ngModel)]="newCrush.nickname" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px; border-radius: 0px; outline: none; font-family: 'Times New Roman', serif;">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Full Name (Optional)</label>
                <input [(ngModel)]="newCrush.fullName" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px; border-radius: 0px; outline: none;">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Status</label>
                <select [(ngModel)]="newCrush.status" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px; border-radius: 0px; outline: none; appearance: none;">
                  <option [value]="statuses.Crush">Crush</option>
                  <option [value]="statuses.Dating">Dating</option>
                  <option [value]="statuses.Exclusive">Exclusive</option>
                </select>
              </div>

              <!-- About the Boy Sections -->
              <div style="border-top: 1px solid {{theme.colors().border}}; padding-top: 24px;">
                <h4 [style.color]="theme.colors().primary" style="font-size: 14px; text-transform: uppercase; letter-spacing: 3px; text-align: center; margin-bottom: 20px; font-style: italic;">About the Boy</h4>

                <div style="margin-bottom: 24px;">
                  <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; text-align: center;">Hair</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    @for (h of ['Blonde', 'Brown', 'Black', 'Red', 'Long', 'Spikey', 'Bald', 'Other']; track h) {
                      <div (click)="toggleSelection(newCrush.hair, h)"
                           [style.border]="newCrush.hair.includes(h) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.hair.includes(h) ? theme.colors().primary + '10' : 'transparent'"
                           style="display: flex; align-items: center; gap: 12px; padding: 10px; cursor: pointer; transition: all 0.2s; border-radius: 4px;">
                        <div [style.border]="'2px solid ' + (newCrush.hair.includes(h) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.hair.includes(h) ? theme.colors().primary : 'transparent'"
                             style="width: 18px; height: 18px; border-radius: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                           @if (newCrush.hair.includes(h)) {
                             <span style="color: white; font-size: 12px;">✓</span>
                           }
                        </div>
                        <span style="font-size: 13px;">{{h}}</span>
                      </div>
                    }
                  </div>
                </div>

                <div style="margin-bottom: 24px;">
                  <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; text-align: center;">Eyes</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    @for (e of ['Grey', 'Blue', 'Aqua', 'Green', 'Brown', 'Hazel', 'Black', 'Other']; track e) {
                      <div (click)="toggleSelection(newCrush.eyes, e)"
                           [style.border]="newCrush.eyes.includes(e) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.eyes.includes(e) ? theme.colors().primary + '10' : 'transparent'"
                           style="display: flex; align-items: center; gap: 12px; padding: 10px; cursor: pointer; transition: all 0.2s; border-radius: 4px;">
                        <div [style.border]="'2px solid ' + (newCrush.eyes.includes(e) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.eyes.includes(e) ? theme.colors().primary : 'transparent'"
                             style="width: 18px; height: 18px; border-radius: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                           @if (newCrush.eyes.includes(e)) {
                             <span style="color: white; font-size: 12px;">✓</span>
                           }
                        </div>
                        <span style="font-size: 13px;">{{e}}</span>
                      </div>
                    }
                  </div>
                </div>

                <div style="margin-bottom: 24px;">
                  <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; text-align: center;">Build</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    @for (b of ['Skinny', 'Ripped', 'Athletic', 'Tall', 'Short', 'Lots to love', 'Average', 'Other']; track b) {
                      <div (click)="toggleSelection(newCrush.build, b)"
                           [style.border]="newCrush.build.includes(b) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.build.includes(b) ? theme.colors().primary + '10' : 'transparent'"
                           style="display: flex; align-items: center; gap: 12px; padding: 10px; cursor: pointer; transition: all 0.2s; border-radius: 4px;">
                        <div [style.border]="'2px solid ' + (newCrush.build.includes(b) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.build.includes(b) ? theme.colors().primary : 'transparent'"
                             style="width: 18px; height: 18px; border-radius: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                           @if (newCrush.build.includes(b)) {
                             <span style="color: white; font-size: 12px;">✓</span>
                           }
                        </div>
                        <span style="font-size: 13px;">{{b}}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- Social Handles -->
              <div style="border-top: 1px solid {{theme.colors().border}}; padding-top: 24px;">
                <h4 [style.color]="theme.colors().primary" style="font-size: 14px; text-transform: uppercase; letter-spacing: 3px; text-align: center; margin-bottom: 20px; font-style: italic;">Where I can find them</h4>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  <div style="display: flex; align-items: center; gap: 12px; position: relative;">
                    <span style="font-size: 20px; position: absolute; left: 12px;">👻</span>
                    <input placeholder="Snapchat Username" [(ngModel)]="newCrush.social.snapchat" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px 12px 12px 44px; outline: none; font-size: 13px; border-radius: 4px;">
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px; position: relative;">
                    <span style="font-size: 20px; position: absolute; left: 12px;">💬</span>
                    <input placeholder="WhatsApp Number" [(ngModel)]="newCrush.social.whatsapp" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px 12px 12px 44px; outline: none; font-size: 13px; border-radius: 4px;">
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px; position: relative;">
                    <span style="font-size: 20px; position: absolute; left: 12px;">🐦</span>
                    <input placeholder="Twitter @username" [(ngModel)]="newCrush.social.twitter" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px 12px 12px 44px; outline: none; font-size: 13px; border-radius: 4px;">
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px; position: relative;">
                    <span style="font-size: 20px; position: absolute; left: 12px;">📘</span>
                    <input placeholder="Facebook.com/" [(ngModel)]="newCrush.social.facebook" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px 12px 12px 44px; outline: none; font-size: 13px; border-radius: 4px;">
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px; position: relative;">
                    <span style="font-size: 20px; position: absolute; left: 12px;">📸</span>
                    <input placeholder="Instagram @username" [(ngModel)]="newCrush.social.instagram" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px 12px 12px 44px; outline: none; font-size: 13px; border-radius: 4px;">
                  </div>
                </div>
              </div>

              <!-- Relationship Status -->
              <div style="border-top: 1px solid {{theme.colors().border}}; padding-top: 24px;">
                <h4 [style.color]="theme.colors().primary" style="font-size: 14px; text-transform: uppercase; letter-spacing: 3px; text-align: center; margin-bottom: 20px; font-style: italic;">Relationship Status</h4>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  @for (s of ["He doesn't know I exist", "Just friends", "I think he likes me", "Getting serious", "We are a couple", "Friends With Benefits", "We are engaged", "Other"]; track s) {
                    <div (click)="newCrush.relationshipStatus = s"
                         [style.border]="newCrush.relationshipStatus === s ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                         [style.background-color]="newCrush.relationshipStatus === s ? theme.colors().primary + '10' : 'transparent'"
                         style="display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; transition: all 0.2s; border-radius: 4px;">
                      <div [style.border]="'2px solid ' + (newCrush.relationshipStatus === s ? theme.colors().primary : theme.colors().textSecondary)"
                           style="width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                         @if (newCrush.relationshipStatus === s) {
                           <div [style.background-color]="theme.colors().primary" style="width: 10px; height: 10px; border-radius: 50%;"></div>
                         }
                      </div>
                      <span style="font-size: 13px;">{{s}}</span>
                    </div>
                  }
                </div>
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Initial Vibe (1-5 Stars)</label>
                <div style="display: flex; gap: 8px; justify-content: center; font-size: 24px;">
                  @for (star of [1,2,3,4,5]; track star) {
                    <span (click)="newCrush.rating = star" [style.color]="newCrush.rating >= star ? theme.colors().accent : theme.colors().border" style="cursor: pointer;">★</span>
                  }
                </div>
              </div>
            </div>

            <button (click)="saveCrush()" [style.background-color]="theme.colors().primary" style="width: 100%; color: white; border: none; padding: 16px; border-radius: 0px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; cursor: pointer; margin-top: 20px;">
              Save Connection
            </button>
          </div>
        </div>
      }

      @if (showCropModal() && cropSourceImage()) {
        <div style="position: fixed; inset: 0; z-index: 260; background: rgba(0,0,0,0.88); display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border"
               style="width: 100%; max-width: 520px; padding: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">Crop Avatar</h3>
            <div [style.background-color]="theme.colors().bgSecondary" style="padding: 16px; margin-bottom: 16px;">
              <div style="width: 280px; height: 280px; margin: 0 auto; overflow: hidden; border-radius: 50%; position: relative; border: 2px solid rgba(255,255,255,0.25); background: #111;">
                <img [src]="cropSourceImage()!"
                     [style.transform]="cropTransform()"
                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform-origin: center center;">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px;">
              <label style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
                Zoom
                <input type="range" min="1" max="3" step="0.05" [value]="cropZoom()" (input)="cropZoom.set(toNumber($event, 1.5))" style="width: 100%;">
              </label>
              <label style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
                Horizontal
                <input type="range" min="-120" max="120" step="1" [value]="cropOffsetX()" (input)="cropOffsetX.set(toNumber($event, 0))" style="width: 100%;">
              </label>
              <label style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
                Vertical
                <input type="range" min="-120" max="120" step="1" [value]="cropOffsetY()" (input)="cropOffsetY.set(toNumber($event, 0))" style="width: 100%;">
              </label>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button (click)="cancelCrop()" [style.border]="'1px solid ' + theme.colors().border"
                      style="background: transparent; color: inherit; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">
                Cancel
              </button>
              <button (click)="applyCrop()" [style.background-color]="theme.colors().primary"
                      style="border: none; color: white; padding: 10px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer;">
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Digital Note Passing Overlay (Simulation) -->
      @if (isNotePassing()) {
        <div style="position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; backdrop-blur: 10px;">
           <div (click)="closeNote()"
                [style.background-color]="theme.colors().bgSecondary"
                [style.border]="'2px solid ' + theme.colors().primary"
                style="padding: 40px; max-width: 400px; transform: rotate(-2deg); shadow: 0 20px 50px rgba(0,0,0,0.5); cursor: pointer;">
             <span [style.color]="theme.colors().primary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; display: block; margin-bottom: 20px;">Private Note Received</span>
             <p style="font-size: 18px; line-height: 1.6; font-style: italic;">"{{ currentTeaPreview() || 'No new tea right now.' }}"</p>
           </div>
        </div>
      }

      <!-- Glamour Decorative Elements -->
      @if (theme.mode() === 'light') {
        <div style="position: absolute; top: 0; right: 0; width: 600px; height: 600px; background: radial-gradient(circle, #fce7f3 0%, transparent 70%); opacity: 0.5; pointer-events: none;"></div>
      }

      <!-- Navigation -->
      <nav [style.background-color]="theme.colors().bgSecondary"
           [style.border-bottom]="'1px solid ' + theme.colors().border"
           style="padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; backdrop-blur: 10px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
               style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 200; font-size: 24px; color: white; shadow: 0 4px 10px rgba(0,0,0,0.1);">D</div>
          <span style="font-size: 28px; font-weight: 200; letter-spacing: 4px; text-transform: uppercase;">Dexii</span>
        </div>

        <div style="display: flex; gap: 20px;">
          <a routerLink="/friends"
             [style.color]="theme.colors().text"
             style="text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; align-self: center;">
            Friends
          </a>
          <button (click)="theme.toggleTheme()"
                  [style.background-color]="'transparent'"
                  [style.color]="theme.colors().text"
                  [style.border]="'1px solid ' + theme.colors().border"
                  style="padding: 10px 20px; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px;">
            {{ theme.mode() === 'dark' ? 'Pearl' : 'Onyx' }}
          </button>
          <button (click)="security.lockApp()"
                  [style.background-color]="theme.colors().primary"
                  style="color: white; border: none; padding: 10px 24px; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; shadow: 0 4px 15px rgba(219, 39, 119, 0.3);">
            Lock
          </button>
          <a routerLink="/vault"
             [style.background-color]="theme.colors().accent"
             style="color: white; text-decoration: none; padding: 10px 24px; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; shadow: 0 4px 15px rgba(219, 39, 119, 0.3);">
            Vault
          </a>
        </div>
      </nav>

      <main style="max-width: 1200px; margin: 0 auto; padding: 60px 40px;">
        <!-- Hero Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 60px; flex-wrap: wrap; gap: 32px;">
          <div style="max-width: 600px;">
            <h2 style="font-size: 48px; font-weight: 200; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px;">The Rolodex</h2>
            <p [style.color]="theme.colors().textSecondary" style="margin: 0; font-size: 14px; letter-spacing: 1px; font-style: italic;">Curating {{ dataService.visibleCrushes().length }} exclusive connections.</p>
          </div>
          <div style="display: flex; gap: 16px;">
            <button (click)="simulateNote()"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    style="background: transparent; padding: 14px 24px; border-radius: 0px; font-weight: 700; cursor: pointer; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">
               Spill Tea {{ unreadTeaCount() > 0 ? '(' + unreadTeaCount() + ')' : '' }}
            </button>
            <button (click)="openNewEntryModal()" [style.border]="'1px solid ' + theme.colors().primary"
                    [style.color]="theme.colors().primary"
                    style="background: transparent; padding: 14px 32px; border-radius: 0px; font-weight: 700; cursor: pointer; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s;">
               + New Entry
            </button>
          </div>
        </div>

        <!-- Filter Chips -->
        <div style="display: flex; gap: 20px; margin-bottom: 48px; overflow-x: auto; padding-bottom: 12px;">
          <button (click)="selectedFilter.set('All')"
                  [style.color]="selectedFilter() === 'All' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'All' ? '2px solid ' + theme.colors().primary : 'none'"
                  style="background: none; border: none; padding: 8px 0; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px;">All</button>
          <button (click)="selectedFilter.set('Dating')"
                  [style.color]="selectedFilter() === 'Dating' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'Dating' ? '2px solid ' + theme.colors().primary : 'none'"
                  style="background: none; border: none; padding: 8px 0; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; opacity: 1;">Dating</button>
          <button (click)="selectedFilter.set('Prospects')"
                  [style.color]="selectedFilter() === 'Prospects' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'Prospects' ? '2px solid ' + theme.colors().primary : 'none'"
                  style="background: none; border: none; padding: 8px 0; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; opacity: 1;">Prospects</button>
        </div>

        <!-- Grid -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
             <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 6px; color: {{ theme.colors().primary }}">The Rolodex</h2>
             <button (click)="toggleArchived()"
                     [style.color]="theme.colors().textSecondary"
                     style="background: none; border: none; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">
               {{ showArchived() ? 'View Active' : 'View Archive' }}
             </button>
          </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 48px;">
          @for (crush of filteredCrushes(); track crush.id) {
            <div [routerLink]="['/profile', crush.id]"
                 [style.background-color]="theme.colors().cardBg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 style="border-radius: 0px; overflow: hidden; cursor: pointer; transition: all 0.4s; position: relative;">

              <!-- Shimmer Effect on Card (Light Mode) -->
              @if (theme.mode() === 'light') {
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent, #fbbf24, transparent); opacity: 0.3;"></div>
              }

              <!-- Image Area -->
              <div style="height: 240px; position: relative; overflow: hidden;">
                <img [src]="crush.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                     style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s ease;">
                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4));"></div>
                <div style="position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                   <span [style.background-color]="'rgba(255,255,255,0.9)'"
                         [style.color]="theme.colors().primary"
                         style="padding: 6px 14px; border-radius: 0px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                     {{ crush.status }}
                   </span>
                   <span *ngIf="crush.redFlags > 0"
                         style="background-color: #ef4444; color: white; padding: 4px 8px; font-size: 8px; font-weight: 900; text-transform: uppercase;">
                     {{ crush.redFlags }} Flags
                   </span>
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 32px; text-align: center;">
                <h3 style="font-size: 26px; font-weight: 200; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px;">{{ crush.nickname }}</h3>

                <div [style.color]="theme.colors().accent" style="font-size: 14px; margin-bottom: 20px; letter-spacing: 4px;">
                  @for (star of [1,2,3,4,5]; track star) {
                     {{ (crush.rating || 0) >= star ? '★' : '☆' }}
                  }
                </div>

                <p [style.color]="theme.colors().textSecondary" style="font-size: 13px; line-height: 1.8; margin: 0 0 28px 0; height: 48px; overflow: hidden; font-style: italic;">
                  "{{ crush.bio || 'A connection waiting to be defined.' }}"
                </p>

                <div [style.border-top]="'1px solid ' + theme.colors().border" style="display: flex; justify-content: center; align-items: center; padding-top: 20px;">
                  <span [style.color]="theme.colors().textSecondary" style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">Profile Active • {{ crush.lastInteraction | date:'MMM d' }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  public dataService = inject(DataService);
  public security = inject(SecurityService);
  public theme = inject(ThemeService);
  public messaging = inject(MessagingService);

  isNotePassing = signal(false);
  currentTeaPreview = signal('');
  showNewEntryModal = signal(false);
  showCropModal = signal(false);
  statuses = CrushStatus;
  uploadedAvatarName = signal('');
  cropSourceImage = signal<string | null>(null);
  cropZoom = signal(1);
  cropOffsetX = signal(0);
  cropOffsetY = signal(0);

  mockAvatars = [
    'https://i.pravatar.cc/150?u=1',
    'https://i.pravatar.cc/150?u=2',
    'https://i.pravatar.cc/150?u=3',
    'https://i.pravatar.cc/150?u=4'
  ];

  showArchived = signal(false);
  selectedFilter = signal<'All' | 'Dating' | 'Prospects'>('All');

  filteredCrushes = computed(() => {
    let crushes = this.dataService.visibleCrushes();

    if (this.showArchived()) {
      return crushes.filter((c: any) => c.status === CrushStatus.Archived);
    }

    // Filter by Archive first
    crushes = crushes.filter((c: any) => c.status !== CrushStatus.Archived);

    // Apply category filters
    const filter = this.selectedFilter();
    if (filter === 'Dating') {
      return crushes.filter((c: any) => c.status === CrushStatus.Dating || c.status === CrushStatus.Exclusive);
    } else if (filter === 'Prospects') {
      return crushes.filter((c: any) => c.status === CrushStatus.Crush);
    }

    return crushes;
  });

  unreadTeaCount = computed(() => this.messaging.getUnreadForUser('me').length);

  newCrush = {
    nickname: '',
    fullName: '',
    status: CrushStatus.Crush,
    rating: 3,
    bio: '',
    visibility: [] as string[],
    avatarUrl: '',
    hair: [] as string[],
    eyes: [] as string[],
    build: [] as string[],
    social: {
      snapchat: '',
      whatsapp: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    relationshipStatus: ''
  };

  ngOnInit() {}

  toggleArchived() {
    this.showArchived.update(v => !v);
  }

  simulateNote() {
    const latestUnread = this.messaging.getLatestUnreadForUser('me');
    if (latestUnread) {
      this.currentTeaPreview.set(latestUnread.content);
      this.messaging.markUnreadForUserAsRead('me');
    } else {
      this.currentTeaPreview.set('No unread private tea at the moment.');
    }
    this.isNotePassing.set(true);
  }

  closeNote() {
    this.isNotePassing.set(false);
    this.currentTeaPreview.set('');
  }

  openNewEntryModal() {
    this.showNewEntryModal.set(true);
  }

  closeModal() {
    this.showNewEntryModal.set(false);
    this.cancelCrop();
    this.resetForm();
  }

  toggleSelection(list: string[], item: string) {
    const index = list.indexOf(item);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(item);
    }
  }

  saveCrush() {
    if (!this.newCrush.nickname) {
      alert("Please enter a nickname at least!");
      return;
    }
    if (!this.security.moderateContent(this.newCrush.nickname) ||
        !this.security.moderateContent(this.newCrush.fullName) ||
        !this.security.moderateContent(this.newCrush.bio)) {
      alert('Profile text flagged by AI moderation.');
      return;
    }

    this.dataService.addCrush({
      nickname: this.newCrush.nickname,
      fullName: this.newCrush.fullName,
      status: this.newCrush.status,
      rating: this.newCrush.rating,
      bio: this.newCrush.bio,
      visibility: [],
      avatarUrl: this.newCrush.avatarUrl || `https://i.pravatar.cc/150?u=${this.newCrush.nickname}`, // Fallback avatar
      hair: this.newCrush.hair,
      eyes: this.newCrush.eyes,
      build: this.newCrush.build,
      social: { ...this.newCrush.social },
      relationshipStatus: this.newCrush.relationshipStatus
    });

    this.closeModal();
    alert("Profile Secured in the Rolodex.");
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    this.uploadedAvatarName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      this.cropSourceImage.set(result);
      this.cropZoom.set(1);
      this.cropOffsetX.set(0);
      this.cropOffsetY.set(0);
      this.showCropModal.set(true);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  cropTransform(): string {
    return `translate(${this.cropOffsetX()}px, ${this.cropOffsetY()}px) scale(${this.cropZoom()})`;
  }

  toNumber(event: Event, fallback: number): number {
    const target = event.target as HTMLInputElement | null;
    if (!target) return fallback;
    const parsed = Number(target.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  cancelCrop() {
    this.showCropModal.set(false);
  }

  applyCrop() {
    const source = this.cropSourceImage();
    if (!source) return;

    const image = new Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coverScale = Math.max(size / image.width, size / image.height);
      const scale = coverScale * this.cropZoom();
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const dx = (size - drawWidth) / 2 + this.cropOffsetX();
      const dy = (size - drawHeight) / 2 + this.cropOffsetY();

      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

      this.newCrush.avatarUrl = canvas.toDataURL('image/jpeg', 0.92);
      this.showCropModal.set(false);
    };
    image.src = source;
  }

  resetForm() {
    this.newCrush = {
      nickname: '',
      fullName: '',
      status: CrushStatus.Crush,
      rating: 3,
      bio: '',
      visibility: [],
      avatarUrl: '',
      hair: [],
      eyes: [],
      build: [],
      social: {
        snapchat: '',
        whatsapp: '',
        twitter: '',
        facebook: '',
        instagram: ''
      },
      relationshipStatus: ''
    };
    this.uploadedAvatarName.set('');
    this.cropSourceImage.set(null);
    this.cropZoom.set(1);
    this.cropOffsetX.set(0);
    this.cropOffsetY.set(0);
  }
}
