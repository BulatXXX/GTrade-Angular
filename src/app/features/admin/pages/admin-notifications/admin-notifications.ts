import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../../../core/admin/admin-api.service';
import { AdminPriceAlertResult, AdminMessageRequest } from '../../../../core/admin/admin.types';
import { ProgressBarComponent } from '../../../../shared/ui/progress-bar/progress-bar';

// TODO(backend): convert to job-based for real progress

const STORAGE_KEY = 'gtrade.admin.recent.v1';
const MAX_RECENT = 10;

type AlertStatus = 'idle' | 'running' | 'done' | 'error';
type MsgStatus = 'idle' | 'sending' | 'done' | 'error';
type ActiveTab = 'alerts' | 'message';
type RecentEntry = { type: 'alert' | 'message'; timestamp: string; summary: string };

type NotifState = {
  tab: ActiveTab;
  alertTarget: 'all' | 'user';
  alertUserId: string;
  alertStatus: AlertStatus;
  alertResult?: AdminPriceAlertResult;
  alertError?: string;
  msgStatus: MsgStatus;
  msgError?: string;
  recent: RecentEntry[];
};

const initial: NotifState = {
  tab: 'alerts', alertTarget: 'all', alertUserId: '',
  alertStatus: 'idle', msgStatus: 'idle', recent: [],
};

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProgressBarComponent],
  templateUrl: './admin-notifications.html',
  styleUrl: './admin-notifications.scss',
})
export class AdminNotificationsPage implements OnInit {
  private api = inject(AdminApiService);
  private destroyRef = inject(DestroyRef);
  private stateSubject = new BehaviorSubject<NotifState>(initial);
  state$ = this.stateSubject.asObservable();

  alertUserCtrl = new FormControl('');

  messageForm = new FormGroup({
    user_id: new FormControl(''),
    subject: new FormControl(''),
    html_body: new FormControl(''),
    text_body: new FormControl(''),
  });

  ngOnInit(): void {
    this.patch({ recent: this.loadRecent() });
  }

  setTab(tab: ActiveTab): void {
    this.patch({ tab });
  }

  setAlertTarget(target: 'all' | 'user'): void {
    this.patch({ alertTarget: target });
  }

  runAlerts(): void {
    const s = this.stateSubject.value;
    const req: { user_id?: number } = s.alertTarget === 'user' && s.alertUserId
      ? { user_id: parseInt(s.alertUserId, 10) }
      : {};

    this.patch({ alertStatus: 'running', alertResult: undefined, alertError: undefined });
    this.api.sendPriceAlerts(req).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ alertStatus: 'error', alertError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(result => {
      if (!result) return;
      this.patch({ alertStatus: 'done', alertResult: result });
      this.addRecent({
        type: 'alert',
        timestamp: new Date().toISOString(),
        summary: `Sent ${result.emails_sent} alerts to ${result.users_checked} users (${result.changes_found} changes)`,
      });
    });
  }

  resetAlerts(): void {
    this.patch({ alertStatus: 'idle', alertResult: undefined, alertError: undefined });
  }

  sendMessage(): void {
    const val = this.messageForm.value;
    const req: AdminMessageRequest = {
      user_id: parseInt(val.user_id ?? '0', 10),
      subject: val.subject ?? '',
      html_body: val.html_body ?? '',
      text_body: val.text_body ?? '',
    };
    this.patch({ msgStatus: 'sending', msgError: undefined });
    this.api.sendAdminMessage(req).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ msgStatus: 'error', msgError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(() => {
      this.patch({ msgStatus: 'done' });
      this.addRecent({
        type: 'message',
        timestamp: new Date().toISOString(),
        summary: `Message "${req.subject}" → user #${req.user_id}`,
      });
      this.messageForm.reset();
    });
  }

  resetMsg(): void {
    this.patch({ msgStatus: 'idle', msgError: undefined });
  }

  updateAlertUserId(val: string): void {
    this.patch({ alertUserId: val });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatNum(n: number): string {
    return new Intl.NumberFormat('en-US').format(n);
  }

  private addRecent(entry: RecentEntry): void {
    const current = this.stateSubject.value.recent;
    const updated = [entry, ...current].slice(0, MAX_RECENT);
    this.patch({ recent: updated });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }

  private loadRecent(): RecentEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private patch(p: Partial<NotifState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...p });
  }
}
