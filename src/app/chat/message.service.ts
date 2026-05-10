import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiResponse } from '../core/api/api-response.model';
import { appEnvironment } from '../core/config/app-environment';
import { Message } from '../shared/models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);

  getMessages(participantId: string) {
    const params = new HttpParams().set('participantId', participantId);

    return this.http
      .get<ApiResponse<Message[]>>(`${appEnvironment.apiBaseUrl}/messages`, { params })
      .pipe(map((response) => response.data));
  }

  sendMessage(receiverId: string, text: string) {
    return this.http
      .post<ApiResponse<Message>>(`${appEnvironment.apiBaseUrl}/messages`, { receiverId, text })
      .pipe(map((response) => response.data));
  }

  sendFile(receiverId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const params = new HttpParams().set('receiverId', receiverId);

    return this.http
      .post<ApiResponse<Message>>(`${appEnvironment.apiBaseUrl}/messages/files`, formData, { params })
      .pipe(map((response) => response.data));
  }
}
