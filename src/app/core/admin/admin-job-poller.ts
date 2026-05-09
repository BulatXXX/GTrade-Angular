import { inject, Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { AdminApiService } from './admin-api.service';
import { AdminJob } from './admin.types';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

@Injectable({ providedIn: 'root' })
export class AdminJobPoller {
  private api = inject(AdminApiService);

  poll(id: string, ms = 2000): Observable<AdminJob> {
    return timer(0, ms).pipe(
      switchMap(() => this.api.getJob(id)),
      takeWhile(job => !TERMINAL_STATUSES.has(job.status), true),
    );
  }
}
