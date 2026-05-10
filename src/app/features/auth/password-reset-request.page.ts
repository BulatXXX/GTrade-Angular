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
      <div class="auth__badge">{{ 'auth.reset.badge' | t | async }}</div>
      <h1 class="auth__title">{{ 'auth.reset.title' | t | async }}</h1>
      <p class="auth__subtitle muted">{{ 'auth.reset.subtitle' | t | async }}</p>
      <form class="auth__form" (ngSubmit)="submit()">
        <label class="field"><span class="field__label">{{ 'auth.email' | t | async }}</span>
          <input class="input" type="email" autocomplete="email" [formControl]="email" placeholder="you@example.com" />
        </label>
        @if (message()) { <div class="auth__ok">{{ message() }}</div> }
        @if (error()) { <div class="auth__error">{{ error() }}</div> }
        <button class="btn btn--primary" type="submit" [disabled]="loading()">@if (loading()) { {{ 'auth.reset.submitLoading' | t | async }} } @else { {{ 'auth.reset.submit' | t | async }} }</button>
        <div class="auth__links muted"><a routerLink="/auth/password-reset/confirm">{{ 'auth.reset.haveToken' | t | async }}</a><span class="dot">•</span><a routerLink="/auth/login">{{ 'auth.backToLogin' | t | async }}</a></div>
      </form>
    </div></div>
  `,
  styleUrls: ['./auth-login.page/auth-login.page.scss'],
  styles: [`.auth__ok{border:1px solid rgba(120,255,170,.35);background:rgba(120,255,170,.08);border-radius:14px;padding:10px 12px;font-size:13px}`]
})
export class PasswordResetRequestPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private i18n = inject(I18nService);
  loading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  email = this.fb.nonNullable.control('', [Validators.required, Validators.email]);

  submit() {
    this.error.set(null); this.message.set(null);
    if (this.email.invalid) { this.email.markAsTouched(); return; }
    this.loading.set(true);
    this.auth.requestPasswordReset(this.email.value).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: res => this.message.set(this.i18n.t('auth.reset.requestAccepted', { status: String(res.status) })),
      error: e => this.error.set(String(e?.error?.error ?? e?.message ?? e)),
    });
  }
}
