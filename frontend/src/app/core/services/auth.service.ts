import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  user$ = this.userSubject.asObservable();
  token$ = this.tokenSubject.asObservable();
  isAuthenticated$ = this.user$.pipe(map(user => !!user));
  isAdmin$ = this.user$.pipe(map(user => user?.role === 'admin'));

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthentication(response)),
      map(response => this.mapToUser(response)),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.error?.message || 'Login failed'));
      })
    );
  }

  register(userData: RegisterRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => this.handleAuthentication(response)),
      map(response => this.mapToUser(response)),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => new Error(error.error?.message || 'Registration failed'));
      })
    );
  }

  logout(): Observable<void> {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.userSubject.next(null);
    this.tokenSubject.next(null);
    return of(void 0);
  }

  getCurrentUser(): Observable<User | null> {
    const token = this.getToken();
    if (!token) {
      return of(null);
    }

    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => this.userSubject.next(user)),
      catchError(error => {
        console.error('Get current user error:', error);
        this.logout();
        return of(null);
      })
    );
  }

  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, userData).pipe(
      tap(user => this.userSubject.next(user)),
      catchError(error => {
        console.error('Update profile error:', error);
        return throwError(() => new Error(error.error?.message || 'Update profile failed'));
      })
    );
  }

  getToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('token');
  }

  private loadUserFromStorage(): void {
    try {
      const userJson = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (userJson && token) {
        const user: User = JSON.parse(userJson);
        this.userSubject.next(user);
        this.tokenSubject.next(token);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }

  private handleAuthentication(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    const user = this.mapToUser(response);
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
    this.tokenSubject.next(response.token);
  }

  private mapToUser(response: AuthResponse): User {
    return {
      _id: response._id,
      email: response.email,
      displayName: response.displayName,
      role: response.role as 'admin' | 'customer',
      preferences: response.preferences as any,
      createdAt: new Date()
    };
  }
} 
