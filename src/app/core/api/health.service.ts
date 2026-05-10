import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { appEnvironment } from '../config/app-environment';
import { ApiResponse } from './api-response.model';

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  getHealth() {
    return this.http.get<ApiResponse<HealthResponse>>(`${appEnvironment.apiBaseUrl}/health`);
  }
}
