import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { appEnvironment } from '../core/config/app-environment';

export interface DesktopGoogleStartResponse {
  state: string;
  authUrl: string;
}

export interface GoogleLoginResponse {
  accessToken: string;
  accessTokenExpiresIn: string;
  user: {
    payload: {
      sub: string;
      email: string;
      name: string;
      picture?: string;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly accessTokenStorageKey = 'cerberus_access_token';
  private readonly userStorageKey = 'cerberus_google_user';

  googleClientId(): string {
    return appEnvironment.googleAuthKey;
  }

  loginWithGoogleCredential(credential: string): Observable<GoogleLoginResponse> {
    return this.http
      .post<GoogleLoginResponse>(
        `${appEnvironment.apiBaseUrl}/googlelogin`,
        { tokendata: credential },
        { withCredentials: true }
      )
      .pipe(tap((response) => this.storeSession(response)));
  }

  startDesktopGoogleLogin(): Observable<DesktopGoogleStartResponse> {
    return this.http.get<DesktopGoogleStartResponse>(`${appEnvironment.apiBaseUrl}/auth/google/desktop/start`, {
      withCredentials: true
    });
  }

  getDesktopGoogleLoginResult(state: string): Observable<HttpResponse<GoogleLoginResponse>> {
    return this.http
      .get<GoogleLoginResponse>(`${appEnvironment.apiBaseUrl}/auth/google/desktop/result/${state}`, {
        observe: 'response',
        withCredentials: true
      })
      .pipe(
        tap((response) => {
          if (response.body) {
            this.storeSession(response.body);
          }
        })
      );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenStorageKey);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  logout(): void {
    this.http.post(`${appEnvironment.apiBaseUrl}/users/logout`, {}, { withCredentials: true }).subscribe({
      error: () => undefined
    });
    localStorage.removeItem(this.accessTokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
    void this.router.navigateByUrl('/login');
  }

  private storeSession(response: GoogleLoginResponse): void {
    localStorage.setItem(this.accessTokenStorageKey, response.accessToken);
    localStorage.setItem(this.userStorageKey, JSON.stringify(response.user.payload));
  }
}
