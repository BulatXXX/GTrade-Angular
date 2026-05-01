import {Component} from '@angular/core';
import {RouterModule} from '@angular/router';
import {Location} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-not-found',
  imports: [RouterModule],
  template: `
    <section class="nf" aria-label="Not found">
      <div class="nf__content">
        <div class="nf__card" role="group" aria-label="404 card">
          <div class="nf__badge">RAID ENDED</div>

          <h1 class="nf__title">404 — Killed in Action</h1>

          <p class="nf__subtitle">
            You went out of bounds / Ты вышел за пределы локации.
          </p>

          <p class="nf__meta muted">
            Raid ended • Error code: 404 • Session lost
          </p>

          <div class="nf__actions" role="navigation" aria-label="Actions">
            <button class="btn btn--primary" type="button" (click)="back()">
              ← Back
            </button>

            <a class="btn btn--ghost" routerLink="/items">Main menu</a>
            <a class="btn btn--ghost" routerLink="/items">Open items search</a>
          </div>

          <div class="nf__hint">
            <div class="nf__warn">
              Attention! You have lost all items you brought and found during the raid
              <span class="muted">(except insured)</span>.
            </div>
            <div class="nf__easter muted">
              СБЭУ «Комар» докладывает: цель не обнаружена. Навигация потеряна.
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    /* фиксируем экран, чтобы не зависеть от высоты router-outlet */
    .nf{
      position: fixed;
      inset: 0;
      overflow: hidden;

      /* “окно” между хедером и футером:
         подстройка под разные экраны без знания точных высот */
      padding-top: calc(env(safe-area-inset-top) + clamp(64px, 8vh, 92px));
      padding-bottom: calc(env(safe-area-inset-bottom) + clamp(76px, 10vh, 120px));
      padding-left: 16px;
      padding-right: 16px;
      box-sizing: border-box;

      display: grid;
      place-items: center;

      /* чтобы футер/хедер (они в DOM позже/выше) оставались видимыми */
      z-index: 0;
    }

    .nf::before{
      content:"";
      position: fixed;
      inset: 0;
      z-index: 0;

      background:
        linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.70)),
        url("/assets/404-raid-ended.jpg") center / cover no-repeat;

      filter: blur(6px);
      transform: scale(1.06);
      will-change: transform, filter;
      pointer-events: none;
    }

    .nf::after{
      content:"";
      position: fixed;
      inset: 0;
      z-index: 1;

      background: repeating-linear-gradient(
          0deg,
          rgba(255,255,255,0.018) 0px,
          rgba(255,255,255,0.018) 1px,
          rgba(0,0,0,0.00) 2px,
          rgba(0,0,0,0.00) 4px
      );

      opacity: 0.35;
      mix-blend-mode: overlay;
      pointer-events: none;
    }

    .nf__content{
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 980px;

      display: grid;
      place-items: center;

      /* легкий “тарковский” сдвиг вверх, можно убрать */
      transform: translateY(-4px);
    }

    .nf__card{
      width: 100%;
      max-width: 760px;

      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);

      padding: 18px;
      box-sizing: border-box;
    }

    .nf__badge{
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);

      font-family: var(--font-display);
      letter-spacing: 0.8px;
      font-size: 12px;
      color: rgba(255,255,255,0.88);
      margin-bottom: 10px;
    }

    .nf__title{
      margin: 0;
      font-family: var(--font-display);
      letter-spacing: 0.6px;
      font-size: 34px;
      line-height: 1.15;
      color: rgba(255,255,255,0.94);
    }

    .nf__subtitle{
      margin: 10px 0 0;
      font-size: 15px;
      color: rgba(255,255,255,0.86);
    }

    .nf__meta{
      margin: 8px 0 0;
      font-size: 12px;
    }

    .nf__actions{
      margin-top: 16px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .btn{
      display: inline-flex;
      align-items: center;
      justify-content: center;

      padding: 10px 14px;
      border-radius: 999px;

      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);

      color: rgba(255,255,255,0.90);
      text-decoration: none;
      cursor: pointer;
      transition: 140ms ease;
      font: inherit;
      white-space: nowrap;
    }

    .btn:hover{
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.22);
      color: rgba(255,255,255,0.95);
    }

    .btn--primary{
      border-color: rgba(255,255,255,0.22);
      background: rgba(255,255,255,0.08);
    }

    .btn--ghost{
      background: rgba(255,255,255,0.04);
    }

    .nf__hint{
      margin-top: 14px;
      padding: 12px;
      border-radius: 14px;
      border: 1px solid rgba(255,80,80,0.28);
      background: rgba(255,80,80,0.06);
    }

    .nf__warn{
      font-size: 13px;
      color: rgba(255,255,255,0.90);
    }

    .nf__easter{
      margin-top: 6px;
      font-size: 12px;
    }

    @media (max-width: 599px){
      .nf{
        padding-left: 12px;
        padding-right: 12px;
        padding-top: calc(env(safe-area-inset-top) + 64px);
        padding-bottom: calc(env(safe-area-inset-bottom) + 110px);
      }

      .nf__content{ transform: translateY(-2px); }
      .nf__card{ padding: 16px; }
      .nf__title{ font-size: 26px; }

      .nf__actions{
        flex-direction: column;
        align-items: stretch;
      }
      .btn{ width: 100%; }
    }
  `]
})
export class NotFoundComponent {
  constructor(private loc: Location) {}
  back(){ this.loc.back(); }
}
