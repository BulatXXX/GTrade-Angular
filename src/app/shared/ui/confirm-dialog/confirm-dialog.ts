import {
  ApplicationRef,
  Component,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmOptions {
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cd-backdrop" (click)="cancel()">
      <div class="cd-dialog" (click)="$event.stopPropagation()">
        <h3 class="cd-title">{{ options.title }}</h3>
        <p class="cd-message">{{ options.message }}</p>
        <div class="cd-actions">
          <button class="cd-btn cd-btn--cancel" (click)="cancel()">
            {{ options.cancelLabel || 'Cancel' }}
          </button>
          <button class="cd-btn" [class.cd-btn--danger]="options.danger" [class.cd-btn--confirm]="!options.danger" (click)="confirm()">
            {{ options.confirmLabel || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cd-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: grid;
      place-items: center;
      padding: 16px;
    }
    .cd-dialog {
      background: rgba(18, 20, 28, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 24px;
      max-width: 440px;
      width: 100%;
      backdrop-filter: blur(10px);
    }
    .cd-title {
      margin: 0 0 12px;
      font-size: 18px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.95);
    }
    .cd-message {
      margin: 0 0 20px;
      font-size: 14px;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.7);
      font-family: var(--font-body), system-ui;
    }
    .cd-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .cd-btn {
      padding: 9px 18px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.88);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      transition: 140ms ease;
    }
    .cd-btn:hover {
      background: rgba(255, 255, 255, 0.10);
    }
    .cd-btn--cancel {
      background: transparent;
    }
    .cd-btn--confirm {
      background: rgba(255, 122, 138, 0.18);
      border-color: rgba(255, 122, 138, 0.4);
      color: #ff7a8a;
    }
    .cd-btn--confirm:hover {
      background: rgba(255, 122, 138, 0.28);
    }
    .cd-btn--danger {
      background: rgba(255, 80, 80, 0.18);
      border-color: rgba(255, 80, 80, 0.4);
      color: #ff8c8c;
    }
    .cd-btn--danger:hover {
      background: rgba(255, 80, 80, 0.28);
    }
  `],
})
export class ConfirmDialogOverlayComponent {
  @Input() options!: ConfirmOptions;
  resolve!: (value: boolean) => void;

  confirm() { this.resolve(true); }
  cancel() { this.resolve(false); }
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const componentRef = createComponent(ConfirmDialogOverlayComponent, {
        environmentInjector: this.injector,
        hostElement: host,
      });

      componentRef.instance.options = options;
      componentRef.instance.resolve = (value: boolean) => {
        resolve(value);
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        document.body.removeChild(host);
      };

      this.appRef.attachView(componentRef.hostView);
      componentRef.changeDetectorRef.detectChanges();
    });
  }
}
