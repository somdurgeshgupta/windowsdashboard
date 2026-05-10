import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { appEnvironment } from '../core/config/app-environment';

type StompHandler = (body: string) => void;

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket?: WebSocket;
  private connected = false;
  private subscriptionId = 0;
  private pendingSubscriptions: Array<{ topic: string; handler: StompHandler }> = [];
  private readonly disconnect$ = new Subject<void>();

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(appEnvironment.websocketUrl);
    this.socket.onopen = () => this.sendFrame('CONNECT', {
      'accept-version': '1.2',
      'heart-beat': '10000,10000'
    });
    this.socket.onmessage = (event) => this.handleRawMessage(String(event.data));
    this.socket.onclose = () => {
      this.connected = false;
      window.setTimeout(() => this.connect(), 2000);
    };
  }

  watchJson<T>(topic: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (body: string) => {
        subscriber.next(JSON.parse(body) as T);
      };

      this.subscribe(topic, handler);

      return () => {
        subscriber.complete();
      };
    });
  }

  disconnect(): void {
    this.disconnect$.next();

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendFrame('DISCONNECT', {});
    }

    this.socket?.close();
    this.socket = undefined;
    this.connected = false;
    this.pendingSubscriptions = [];
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private subscribe(topic: string, handler: StompHandler): void {
    if (!this.connected) {
      this.pendingSubscriptions.push({ topic, handler });
      this.connect();
      return;
    }

    this.sendFrame('SUBSCRIBE', {
      id: `sub-${this.subscriptionId++}`,
      destination: topic
    });
    this.pendingSubscriptions.push({ topic, handler });
  }

  private handleRawMessage(rawMessage: string): void {
    for (const frame of rawMessage.split('\0').filter(Boolean)) {
      const [head, body = ''] = frame.split('\n\n');
      const [command, ...headerLines] = head.split('\n').filter(Boolean);

      if (command === 'CONNECTED') {
        this.connected = true;
        const subscriptions = [...this.pendingSubscriptions];
        this.pendingSubscriptions = [];
        subscriptions.forEach(({ topic, handler }) => this.subscribe(topic, handler));
        return;
      }

      if (command !== 'MESSAGE') {
        continue;
      }

      const destination = headerLines
        .map((line) => line.split(':', 2))
        .find(([key]) => key === 'destination')?.[1];

      this.pendingSubscriptions
        .filter(({ topic }) => topic === destination)
        .forEach(({ handler }) => handler(body));
    }
  }

  private sendFrame(command: string, headers: Record<string, string>): void {
    const headerBlock = Object.entries(headers)
      .map(([key, value]) => `${key}:${value}`)
      .join('\n');
    this.socket?.send(`${command}\n${headerBlock}\n\n\0`);
  }
}
