import {CommonModule} from '@angular/common';
import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {AuthService} from '../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth"><div class="auth__card">
      <div class="auth__badge">ACCOUNT RECOVERY</div>
      <h1 class="auth__title">Reset password</h1>
      <p class="auth__subtitle muted">Enter your email. Backend will send the reset token through notification-service.</p>
      <form class="auth__form" (ngSubmit)="submit()">
        <label class="field"><span class="field__label">Email</span>
          <input class="input" type="email" autocomplete="email" [formControl]="email" placeholder="you@example.com" />
        </label>
        @if (message()) { <div class="auth__ok">{{ message() }}</div> }
        @if (error()) { <div class="auth__error">{{ error() }}</div> }
        <button class="btn btn--primary" type="submit" [disabled]="loading()">@if (loading()) { Sending… } @else { Send reset email }</button>
        <div class="auth__links muted"><a routerLink="/auth/password-reset/confirm">I have a token</a><span class="dot">•</span><a routerLink="/auth/login">Back to login</a></div>
      </form>
    </div></div>
  `,
  styleUrls: ['./auth-login.page/auth-login.page.scss'],
  styles: [`.auth__ok{border:1px solid rgba(120,255,170,.35);background:rgba(120,255,170,.08);border-radius:14px;padding:10px 12px;font-size:13px}`]
})
export class PasswordResetRequestPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  loading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  email = this.fb.nonNullable.control('', [Validators.required, Validators.email]);

  submit() {
    this.error.set(null); this.message.set(null);
    if (this.email.invalid) { this.email.markAsTouched(); return; }
    this.loading.set(true);
    this.auth.requestPasswordReset(this.email.value).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: res => this.message.set(`Request accepted: ${res.status}`),
      error: e => this.error.set(String(e?.error?.error ?? e?.message ?? e)),
    });
  }
}
