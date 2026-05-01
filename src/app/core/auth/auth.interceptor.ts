import {inject, Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {catchError, Observable, throwError} from 'rxjs';
import {AuthService} from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth = inject(AuthService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isApi =
      req.url.startsWith('/api') ||
      req.url.startsWith('/tracked') ||
      req.url.startsWith(`${window.location.origin}/api`) ||
      req.url.startsWith(`${window.location.origin}/tracked`);
    const token = isApi ? this.auth.accessToken : null;
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next.handle(authReq).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401 && isApi) this.auth.logout();
        return throwError(() => err);
      })
    );
  }
}
