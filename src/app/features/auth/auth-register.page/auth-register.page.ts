import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {finalize} from 'rxjs/operators';

import {AuthService} from '../../../core/auth/auth.service';
import {TPipe} from '../../../core/i18n/t.pipe';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule, TPipe],
  templateUrl: './auth-register.page.html',
  styleUrls: ['./auth-register.page.scss'],
})
export class AuthRegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, password } = this.form.getRawValue();

    this.auth.register({ email, password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: async () => {
          await this.router.navigateByUrl('/profile');
        },
        error: (e) => this.error.set(String(e?.error?.message ?? e?.message ?? e)),
      });
  }

  get name() { return this.form.controls.name; }
  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
}
