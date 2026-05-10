import {AsyncPipe, CommonModule} from '@angular/common';
import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {AuthService} from '../../core/auth/auth.service';
import {TPipe} from '../../core/i18n/t.pipe';
import {I18nService} from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TPipe, AsyncPipe],
  template: `
    <div class="auth"><div class="auth__card">
      <div class="auth__badge">{{ 'auth.confirm.badge' | t | async }}</div>
      <h1 class="auth__title">{{ 'auth.confirm.title' | t | async }}</h1>
      <p class="auth__subtitle muted">{{ 'auth.confirm.subtitle' | t | async }}</p>
      <form class="auth__form" (ngSubmit)="submit()">
        <label class="field"><span class="field__label">{{ 'auth.confirm.token' | t | async }}</span><input class="input" [formControl]="token" autocomplete="one-time-code" /></label>
        <label class="field"><span class="field__label">{{ 'auth.confirm.newPassword' | t | async }}</span><input class="input" type="password" [formControl]="password" autocomplete="new-password" /></label>
        @if (message()) { <div class="auth__ok">{{ message() }}</div> }
        @if (error()) { <div class="auth__error">{{ error() }}</div> }
        <button class="btn btn--primary" type="submit" [disabled]="loading()">@if (loading()) { {{ 'auth.confirm.submitLoading' | t | async }} } @else { {{ 'auth.confirm.submit' | t | async }} }</button>
        <div class="auth__links muted"><a routerLink="/auth/login">{{ 'auth.backToLogin' | t | async }}</a></div>
      </form>
    </div></div>
  `,
  styleUrls: ['./auth-login.page/auth-login.page.scss'],
  styles: [`.auth__ok{border:1px solid rgba(120,255,170,.35);background:rgba(120,255,170,.08);border-radius:14px;padding:10px 12px;font-size:13px}`]
})
export class PasswordResetConfirmPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private i18n = inject(I18nService);
  loading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  token = this.fb.nonNullable.control('', [Validators.required]);
  password = this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]);

  submit() {
    this.error.set(null); this.message.set(null);
    if (this.token.invalid || this.password.invalid) { this.token.markAsTouched(); this.password.markAsTouched(); return; }
    this.loading.set(true);
    this.auth.confirmPasswordReset(this.token.value, this.password.value).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: res => this.message.set(this.i18n.t('auth.confirm.updated', { status: String(res.status) })),
      error: e => this.error.set(String(e?.error?.error ?? e?.message ?? e)),
    });
  }
}
