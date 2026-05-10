import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();

  if (!accessToken) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  );
};
