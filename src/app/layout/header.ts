import {Component, computed, inject} from '@angular/core';
import {RouterModule} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';

import {AuthService} from '../core/auth/auth.service';
import {TPipe} from '../core/i18n/t.pipe';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, TPipe, AsyncPipe],
  template: `
    <header class="hdr">
      <div class="hdr__inner">
        <a class="pill pill--brand"
           routerLink="/items"
           [attr.aria-label]="(('header.searchAria' | t | async) ?? 'Open search')">
          GTrade
        </a>

        <!-- Profile pill (always) -->
        <a class="pill pill--user"
           routerLink="/profile"
           [attr.aria-label]="(('header.profileAria' | t | async) ?? 'Open profile')">

          <span class="avatar" aria-hidden="true">
            @if (isAuthed()) {
              @if (avatarUrl()) {
                <img class="avatar__img" [src]="avatarUrl()!" alt="" />
              } @else {
                <span class="avatar__fallback">{{ initial() }}</span>
              }
            } @else {
              <span class="avatar__fallback">★</span>
            }
          </span>

          <span class="pill__text">
            @if (isAuthed()) {
              {{ userName() }}
            } @else {
              Watchlist
            }
          </span>
        </a>


        <!-- Login icon (only for guest) -->
        @if (!isAuthed()) {
          <a class="icon-btn"
             routerLink="/auth/login"
             aria-label="Sign in"
             title="Sign in">
            👤
          </a>
        }
      </div>
    </header>
  `,
  styles: [`
    .hdr{
      position: sticky;
      top: 0;
      z-index: 50;

      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.25);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .hdr__inner{
      max-width: 980px;
      margin: 0 auto;

      display: grid;
      grid-template-columns: 1fr auto auto auto;
      align-items: center;
      gap: 12px;

      min-width: 0;
    }

    .pill{
      display: inline-flex;
      align-items: center;
      gap: 10px;

      padding: 8px 12px;
      border-radius: 999px;

      text-decoration: none;
      color: rgba(255,255,255,0.90);
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);

      transition: 140ms ease;
      min-width: 0;
      white-space: nowrap;
    }

    .pill:hover{
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.22);
      color: rgba(255,255,255,0.95);
    }

    .pill--brand{
      justify-self: start;
      font-family: var(--font-display);
      letter-spacing: 0.6px;
    }

    .pill--admin{
      background: rgba(255, 122, 138, 0.12);
      border-color: rgba(255, 122, 138, 0.32);
      color: #ff7a8a;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 6px 14px;
    }

    .pill--admin:hover{
      background: rgba(255, 122, 138, 0.20);
      border-color: rgba(255, 122, 138, 0.45);
    }

    .pill--user{
      justify-self: end;
      max-width: 260px;
    }

    .pill__text{
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .avatar{
      width: 26px;
      height: 26px;
      border-radius: 10px;

      display: grid;
      place-items: center;

      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.12);
      overflow: hidden;
      flex: 0 0 auto;
    }

    .avatar__img{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar__fallback{
      font-family: var(--font-display);
      font-size: 12px;
      letter-spacing: 0.6px;
      opacity: 0.95;
    }

    .icon-btn{
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.90);
      text-decoration: none;
      display: grid;
      place-items: center;
      transition: 140ms ease;
      font-size: 18px;
      line-height: 1;
    }

    .icon-btn:hover{
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.22);
      color: rgba(255,255,255,0.95);
    }

    @media (max-width: 599px){
      .hdr{ padding: 10px 12px; }
      .pill{ padding: 8px 10px; }
      .pill--user{ max-width: 200px; }
      .icon-btn{ width: 42px; height: 42px; }
    }
  `],
})
export class AppHeader {
  private auth = inject(AuthService);

  private state = toSignal(this.auth.state$, { initialValue: { status: 'guest' } as any });

  isAuthed = computed(() => this.state()?.status === 'auth');
  isAdmin = computed(() => this.state()?.status === 'auth' && this.state().user.role === 'admin');
  userName = computed(() => (this.state()?.status === 'auth' ? this.state().user.name : 'User'));
  avatarUrl = computed(() => (this.state()?.status === 'auth' ? (this.state().user.avatarUrl ?? null) : null));
  initial = computed(() => ((this.userName()?.trim()?.[0] ?? 'U').toUpperCase()));
}
