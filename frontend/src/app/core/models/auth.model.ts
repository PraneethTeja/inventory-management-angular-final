import { User } from './user.model';

export interface AuthResponse {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  token: string;
  preferences?: {
    theme: string;
    notifications: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
} 
