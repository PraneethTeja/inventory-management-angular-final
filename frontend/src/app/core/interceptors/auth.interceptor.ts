import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap, Observable } from 'rxjs';
import { auth } from '../../app.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for Firebase auth requests
  if (req.url.includes('firebaseapp.com') || req.url.includes('googleapis.com')) {
    return next(req);
  }

  // Get current user from Firebase auth
  const user = auth.currentUser;

  // If user exists, get the token and add it to the Authorization header
  if (user) {
    return from(user.getIdToken()).pipe(
      switchMap(token => {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(authReq);
      })
    );
  }

  return next(req);
}; 
