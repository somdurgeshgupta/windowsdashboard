import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { AuthService } from '../auth.service';

declare const google: {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (response: { credential?: string }) => void }): void;
      renderButton(element: HTMLElement, options: Record<string, string | number>): void;
    };
  };
};

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly status = signal('');
  protected readonly isTauri = signal(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);

  ngAfterViewInit(): void {
    if (this.isTauri()) {
      return;
    }

    this.renderGoogleButton();
  }

  protected loginWithGoogle(): void {
    if (this.isTauri()) {
      this.loginWithGoogleInSystemBrowser();
      return;
    }

    this.renderGoogleButton();
  }

  private renderGoogleButton(): void {
    const googleButton = document.getElementById('google-btn');

    if (!googleButton || typeof google === 'undefined') {
      this.status.set('Google login is still loading. Try again in a moment.');
      return;
    }

    google.accounts.id.initialize({
      client_id: this.authService.googleClientId(),
      callback: (response) => {
        if (!response.credential) {
          this.status.set('Google did not return a credential.');
          return;
        }

        this.status.set('Signing you in...');
        this.authService.loginWithGoogleCredential(response.credential).subscribe({
          next: () => void this.router.navigateByUrl('/chat'),
          error: () => this.status.set('Google login failed. Please check backend credentials and try again.')
        });
      }
    });

    google.accounts.id.renderButton(googleButton, {
      theme: 'filled_blue',
      size: 'large',
      shape: 'rectangular',
      width: 260
    });
    this.status.set('');
  }

  private loginWithGoogleInSystemBrowser(): void {
    this.status.set('Opening Google in your browser...');
    this.authService.startDesktopGoogleLogin().subscribe({
      next: ({ authUrl, state }) => {
        void invoke('open_external_url', { url: authUrl });
        this.pollDesktopLoginResult(state);
      },
      error: () => this.status.set('Could not start desktop Google login.')
    });
  }

  private pollDesktopLoginResult(state: string): void {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;

      if (attempts > 120) {
        window.clearInterval(timer);
        this.status.set('Google login timed out. Try again.');
        return;
      }

      this.authService.getDesktopGoogleLoginResult(state).subscribe({
        next: (response) => {
          if (!response.body) {
            this.status.set('Waiting for Google sign-in...');
            return;
          }

          window.clearInterval(timer);
          this.status.set('Signing you in...');
          void this.router.navigateByUrl('/chat');
        },
        error: () => {
          window.clearInterval(timer);
          this.status.set('Google login failed. Please check backend credentials and try again.');
        }
      });
    }, 1500);
  }
}
