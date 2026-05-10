import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { MessageService } from '../../chat/message.service';
import { HealthService } from '../../core/api/health.service';
import { DesktopNotificationService } from '../../notifications/desktop-notification.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { UserService } from '../../users/user.service';
import { Message } from '../../shared/models/message.model';
import { User } from '../../shared/models/user.model';

interface PresenceEvent {
  userId: string;
  online: boolean;
}

@Component({
  selector: 'app-messenger-shell',
  imports: [DatePipe],
  templateUrl: './messenger-shell.component.html',
  styleUrl: './messenger-shell.component.scss'
})
export class MessengerShellComponent implements OnDestroy {
  private readonly healthService = inject(HealthService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly desktopNotificationService = inject(DesktopNotificationService);
  private readonly realtimeSubscriptions = new Subscription();
  private heartbeatTimer?: number;

  protected readonly users = signal<User[]>([]);
  protected readonly selectedUser = signal<User | null>(null);
  protected readonly currentUser = signal<User | null>(null);
  protected readonly backendStatus = signal('Checking API...');
  protected readonly listStatus = signal('Loading users...');
  protected readonly messageStatus = signal('Select a user to start messaging.');
  protected readonly draftMessage = signal('');
  protected readonly messages = signal<Message[]>([]);
  protected readonly draggingFile = signal(false);

  protected readonly activeMessages = computed(() => this.messages());

  constructor() {
    this.healthService.getHealth().subscribe({
      next: (response) => this.backendStatus.set(`${response.data.status} - ${response.data.service}`),
      error: () => this.backendStatus.set('Backend offline')
    });
    this.loadCurrentUser();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.realtimeSubscriptions.unsubscribe();
    this.realtimeService.disconnect();

    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
    }

    this.userService.offline().subscribe({ error: () => undefined });
  }

  protected selectUser(user: User): void {
    const selected = { ...user, unread: false };
    this.selectedUser.set(selected);
    this.users.update((users) => users.map((item) => item.id === user.id ? selected : item));
    this.loadMessages(user.id);
  }

  protected updateDraft(value: string): void {
    this.draftMessage.set(value);
  }

  protected sendMessage(): void {
    const text = this.draftMessage().trim();

    if (!text) {
      return;
    }

    const receiver = this.selectedUser();

    if (!receiver) {
      this.messageStatus.set('Select a user before sending a message.');
      return;
    }

    this.messageService.sendMessage(receiver.id, text).subscribe({
      next: (message) => {
        this.addMessage(message);
        this.moveUserToTop(receiver.id, false);
        this.draftMessage.set('');
        this.messageStatus.set('');
      },
      error: () => this.messageStatus.set('Could not send message.')
    });
  }

  protected selectFile(fileList: FileList | null): void {
    const file = fileList?.item(0);

    if (file) {
      this.sendFile(file);
    }
  }

  protected dragOver(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(true);
  }

  protected dragLeave(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);
  }

  protected dropFile(event: DragEvent): void {
    event.preventDefault();
    this.draggingFile.set(false);

    const file = event.dataTransfer?.files.item(0);

    if (file) {
      this.sendFile(file);
    }
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected senderName(message: Message): string {
    return message.senderId === this.currentUser()?.id ? 'You' : this.selectedUser()?.name ?? 'Unknown';
  }

  protected isMine(message: Message): boolean {
    return message.senderId === this.currentUser()?.id;
  }

  protected isImage(message: Message): boolean {
    return message.type === 'FILE' && !!message.fileUrl && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(message.text ?? message.fileUrl);
  }

  private loadCurrentUser(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.startPresenceHeartbeat();
        this.startRealtime(user.id);
      },
      error: () => this.listStatus.set('Sign in again to load your account.')
    });
  }

  private sendFile(file: File): void {
    const receiver = this.selectedUser();

    if (!receiver) {
      this.messageStatus.set('Select a user before sending a file.');
      return;
    }

    this.messageStatus.set(`Uploading ${file.name}...`);
    this.messageService.sendFile(receiver.id, file).subscribe({
      next: (message) => {
        this.addMessage(message);
        this.moveUserToTop(receiver.id, false);
        this.messageStatus.set('');
      },
      error: () => this.messageStatus.set('Could not upload file.')
    });
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.update((currentUsers) => this.mergeUsers(users, currentUsers));
        this.listStatus.set(users.length ? '' : 'No other users found yet.');
      },
      error: () => this.listStatus.set('Could not load users.')
    });
  }

  private loadMessages(participantId: string): void {
    this.messageStatus.set('Loading messages...');
    this.messageService.getMessages(participantId).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.messageStatus.set(messages.length ? '' : 'No messages yet.');
      },
      error: () => this.messageStatus.set('Could not load messages.')
    });
  }

  private startRealtime(currentUserId: string): void {
    this.realtimeService.connect();
    this.realtimeSubscriptions.add(
      this.realtimeService.watchJson<Message>(`/topic/users/${currentUserId}/messages`).subscribe((message) => {
        const selected = this.selectedUser();
        const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
        const messageBelongsToOpenChat = selected?.id === otherUserId;
        const isIncoming = message.senderId !== currentUserId;

        if (messageBelongsToOpenChat) {
          this.addMessage(message);
          this.messageStatus.set('');
        }

        this.moveUserToTop(otherUserId, !messageBelongsToOpenChat && isIncoming);

        if (isIncoming) {
          void this.desktopNotificationService.notifyMessage(this.userName(otherUserId), message.text);
        }
      })
    );
    this.realtimeSubscriptions.add(
      this.realtimeService.watchJson<PresenceEvent>('/topic/presence').subscribe((event) => {
        if (event.userId === currentUserId) {
          return;
        }

        this.users.update((users) => {
          const updatedUsers = users.map((user) => user.id === event.userId ? { ...user, online: event.online } : user);
          return this.sortUsers(updatedUsers);
        });
        this.loadUsers();
      })
    );
  }

  private startPresenceHeartbeat(): void {
    this.userService.heartbeat().subscribe({ error: () => undefined });
    this.heartbeatTimer = window.setInterval(() => {
      this.userService.heartbeat().subscribe({ error: () => undefined });
    }, 15000);
  }

  private addMessage(message: Message): void {
    this.messages.update((messages) => {
      if (messages.some((existingMessage) => existingMessage.id === message.id)) {
        return messages;
      }

      return [...messages, message];
    });
  }

  private moveUserToTop(userId: string, unread: boolean): void {
    this.users.update((users) => {
      const user = users.find((item) => item.id === userId);

      if (!user) {
        this.loadUsers();
        return users;
      }

      const updatedUser = { ...user, unread: unread || user.unread };
      return [updatedUser, ...users.filter((item) => item.id !== userId)];
    });
  }

  private sortUsers(users: User[]): User[] {
    return [...users].sort((left, right) => {
      const onlineComparison = Number(right.online) - Number(left.online);
      if (onlineComparison !== 0) {
        return onlineComparison;
      }

      return left.name.localeCompare(right.name);
    });
  }

  private mergeUsers(nextUsers: User[], currentUsers: User[]): User[] {
    const currentById = new Map(currentUsers.map((user) => [user.id, user]));
    return this.sortUsers(nextUsers.map((user) => ({
      ...user,
      unread: currentById.get(user.id)?.unread ?? false
    })));
  }

  private userName(userId: string): string {
    return this.users().find((user) => user.id === userId)?.name ?? 'Desktop Messenger';
  }
}
