import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiResponse } from '../core/api/api-response.model';
import { appEnvironment } from '../core/config/app-environment';
import { User } from '../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getCurrentUser() {
    return this.http
      .get<ApiResponse<User>>(`${appEnvironment.apiBaseUrl}/users/me`)
      .pipe(map((response) => response.data));
  }

  getUsers() {
    return this.http
      .get<ApiResponse<User[]>>(`${appEnvironment.apiBaseUrl}/users`)
      .pipe(map((response) => response.data));
  }

  heartbeat() {
    return this.http
      .post<ApiResponse<void>>(`${appEnvironment.apiBaseUrl}/users/presence/heartbeat`, {})
      .pipe(map((response) => response.data));
  }

  offline() {
    return this.http
      .post<ApiResponse<void>>(`${appEnvironment.apiBaseUrl}/users/presence/offline`, {})
      .pipe(map((response) => response.data));
  }
}
