import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { MessengerShellComponent } from './layout/messenger-shell/messenger-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'chat',
    component: MessengerShellComponent
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
