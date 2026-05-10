import { Injectable } from '@angular/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

@Injectable({ providedIn: 'root' })
export class DesktopNotificationService {
  private permissionReady = false;

  async notifyMessage(senderName: string, text?: string): Promise<void> {
    if (!this.isTauri()) {
      return;
    }

    const granted = await this.ensurePermission();

    if (!granted) {
      return;
    }

    sendNotification({
      title: `New message from ${senderName}`,
      body: text || 'Sent you a message'
    });
  }

  private async ensurePermission(): Promise<boolean> {
    if (this.permissionReady) {
      return true;
    }

    let granted = await isPermissionGranted();

    if (!granted) {
      granted = (await requestPermission()) === 'granted';
    }

    this.permissionReady = granted;
    return granted;
  }

  private isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }
}
