import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { ActivityTimelineComponent } from '../../core/components/activity-timeline/activity-timeline.component';

/**
 * The "History" tab of the Sharing page: everything that has happened between
 * you and your friends (shares, requests, chat activity), filterable by kind
 * and by friend. Rendered inside SharingComponent, so no page chrome here.
 */
@Component({
  selector: 'app-shared-history-panel',
  standalone: true,
  imports: [CommonModule, PageHintComponent, ActivityTimelineComponent],
  styleUrl: './shared-history-panel.component.css',
  template: `
    <div class="shared-history-panel">
      <app-page-hint
        hintKey="shared_history"
        title="History Hint"
        message="Your history with every friend: crushes and notes shared or unshared, requests and nudges, pauses, and how many messages you traded each day. Seen shows when a friend has opened a crush you shared.">
      </app-page-hint>
      <app-activity-timeline></app-activity-timeline>
    </div>
  `
})
export class SharedHistoryPanelComponent {
  public theme = inject(ThemeService);
}
