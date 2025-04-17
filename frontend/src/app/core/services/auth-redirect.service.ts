import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { filter, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectService {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * Redirects the user based on their role after login
   */
  redirectAfterLogin(): void {
    this.authService.user$
      .pipe(
        filter(user => !!user), // Only when user exists
        take(1) // Take only once, then unsubscribe
      )
      .subscribe(user => {
        if (user?.role === 'admin') {
          // Admin users go to admin dashboard
          this.router.navigate(['/admin/dashboard']);
        } else {
          // Regular users go to home
          this.router.navigate(['/']);
        }
      });
  }

  /**
   * Redirects user to appropriate page based on auth status and role
   * @param returnUrl Optional URL to redirect to if user is customer
   */
  redirectBasedOnAuthStatus(returnUrl: string = '/'): void {
    this.authService.user$
      .pipe(take(1))
      .subscribe(user => {
        if (user) {
          if (user.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate([returnUrl]);
          }
        } else {
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl }
          });
        }
      });
  }
} 
