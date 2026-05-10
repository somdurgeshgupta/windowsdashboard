export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  googleId?: string;
  createdAt?: string;
  online?: boolean;
  unread?: boolean;
}
