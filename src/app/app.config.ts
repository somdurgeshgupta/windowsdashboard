import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { authTokenInterceptor } from './core/http/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
    provideRouter(routes)
  ]
};
