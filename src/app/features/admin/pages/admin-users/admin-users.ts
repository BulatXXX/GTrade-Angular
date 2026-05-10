import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, debounceTime, startWith } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../../../core/admin/admin-api.service';
import { AdminUser, AdminMessageRequest, AdminPriceAlertResult } from '../../../../core/admin/admin.types';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ProgressBarComponent } from '../../../../shared/ui/progress-bar/progress-bar';
import { TPipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

// TODO(backend): no block/delete endpoint — when added, expose Block button

type AlertStatus = 'idle' | 'running' | 'done' | 'error';
type UsersState = {
  status: 'loading' | 'ready' | 'error';
  users: AdminUser[];
  filtered: AdminUser[];
  error?: string;
  alertStatus: AlertStatus;
  alertResult?: AdminPriceAlertResult;
  alertError?: string;
  forceSend: boolean;
  messageDrawerOpen: boolean;
  messageTargetUser?: AdminUser;
  messageSending: boolean;
  messageSent: boolean;
  messageError?: string;
};

const initial: UsersState = {
  status: 'loading', users: [], filtered: [],
  alertStatus: 'idle', forceSend: true,
  messageDrawerOpen: false, messageSending: false, messageSent: false,
};

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProgressBarComponent, TPipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsersPage implements OnInit {
  private api = inject(AdminApiService);
  private confirm = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);
  private i18n = inject(I18nService);
  private stateSubject = new BehaviorSubject<UsersState>(initial);
  state$ = this.stateSubject.asObservable();

  filterCtrl = new FormControl('');

  messageForm = new FormGroup({
    subject: new FormControl(''),
    html_body: new FormControl(''),
    text_body: new FormControl(''),
  });

  ngOnInit(): void {
    this.loadUsers();

    this.filterCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(q => this.applyFilter(q ?? ''));
  }

  loadUsers(): void {
    this.patch({ status: 'loading', error: undefined });
    this.api.listUsers().pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ status: 'error', error: String(err?.message ?? err) });
        return of([]);
      }),
    ).subscribe(users => {
      this.patch({ status: 'ready', users });
      this.applyFilter(this.filterCtrl.value ?? '');
    });
  }

  private applyFilter(q: string): void {
    const users = this.stateSubject.value.users;
    const lower = q.toLowerCase();
    this.patch({ filtered: lower ? users.filter(u => u.email.toLowerCase().includes(lower)) : users });
  }

  async changeRole(user: AdminUser, newRole: string): Promise<void> {
    if (newRole === user.role) return;
    const isAdminPromotion = newRole === 'admin';
    const ok = await this.confirm.confirm({
      title: isAdminPromotion ? this.i18n.t('admin.users.confirm.promoteTitle') : this.i18n.t('admin.users.confirm.changeTitle'),
      message: isAdminPromotion
        ? this.i18n.t('admin.users.confirm.promoteMsg', { email: user.email })
        : this.i18n.t('admin.users.confirm.changeMsg', { email: user.email, role: newRole }),
      danger: isAdminPromotion,
      confirmLabel: this.i18n.t('admin.users.confirm.changeBtn'),
    });
    if (!ok) return;

    this.api.setUserRole(user.id, newRole).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        alert('Failed to change role: ' + String(err?.message ?? err));
        return of(null);
      }),
    ).subscribe(updated => {
      if (!updated) return;
      const users = this.stateSubject.value.users.map(u => u.id === updated.id ? updated : u);
      this.patch({ users });
      this.applyFilter(this.filterCtrl.value ?? '');
    });
  }

  async sendAllAlerts(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('admin.users.confirm.sendTitle'),
      message: this.i18n.t('admin.users.confirm.sendMessage'),
      confirmLabel: this.i18n.t('admin.users.confirm.send'),
    });
    if (!ok) return;

    // TODO(backend): convert to job-based for real progress
    this.patch({ alertStatus: 'running', alertResult: undefined, alertError: undefined });
    this.api.sendPriceAlerts({ force_send: this.stateSubject.value.forceSend }).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ alertStatus: 'error', alertError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(result => {
      if (!result) return;
      this.patch({ alertStatus: 'done', alertResult: result });
    });
  }

  resetAlerts(): void {
    this.patch({ alertStatus: 'idle', alertResult: undefined, alertError: undefined });
  }

  toggleForceSend(): void {
    this.patch({ forceSend: !this.stateSubject.value.forceSend });
  }

  openMessageDrawer(user: AdminUser): void {
    this.messageForm.reset();
    this.patch({ messageDrawerOpen: true, messageTargetUser: user, messageSent: false, messageError: undefined });
  }

  closeMessageDrawer(): void {
    this.patch({ messageDrawerOpen: false });
  }

  sendMessage(): void {
    const s = this.stateSubject.value;
    if (!s.messageTargetUser) return;
    const val = this.messageForm.value;
    const req: AdminMessageRequest = {
      user_id: s.messageTargetUser.id,
      subject: val.subject ?? '',
      html_body: val.html_body ?? '',
      text_body: val.text_body ?? '',
    };
    this.patch({ messageSending: true, messageError: undefined });
    this.api.sendAdminMessage(req).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ messageSending: false, messageError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(() => {
      this.patch({ messageSending: false, messageSent: true });
      setTimeout(() => this.patch({ messageDrawerOpen: false, messageSent: false }), 1500);
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatNum(n: number): string {
    return new Intl.NumberFormat('en-US').format(n);
  }

  private patch(p: Partial<UsersState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...p });
  }
}
