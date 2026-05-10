import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = localStorage.getItem('cerberus_access_token');
  const authenticatedRequest = accessToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('API request failed', {
        status: error.status,
        url: error.url,
        message: error.message
      });

      return throwError(() => error);
    })
  );
};
