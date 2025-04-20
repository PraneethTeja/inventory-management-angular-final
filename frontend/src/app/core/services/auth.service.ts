import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import {
  User as FirebaseUser, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile, browserLocalPersistence,
  setPersistence, onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { User } from '../models/user.model';
import { LoginRequest, RegisterRequest } from '../models/auth.model';
import { auth, firestore } from '../../app.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  user$ = this.userSubject.asObservable();
  token$ = this.tokenSubject.asObservable();
  isAuthenticated$ = this.user$.pipe(map(user => !!user));
  isAdmin$ = this.user$.pipe(map(user => user?.role === 'admin'));

  constructor() {
    // Set persistence to LOCAL (equivalent to localStorage)
    setPersistence(auth, browserLocalPersistence);

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await this.getUserData(user.uid);
        if (userData) {
          this.userSubject.next(userData);
          const token = await user.getIdToken();
          this.tokenSubject.next(token);
        }
      } else {
        this.userSubject.next(null);
        this.tokenSubject.next(null);
      }
    });
  }

  login(credentials: LoginRequest): Observable<User> {
    return from(signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    )).pipe(
      switchMap(async (userCredential) => {
        const token = await userCredential.user.getIdToken();
        this.tokenSubject.next(token);

        const userData = await this.getUserData(userCredential.user.uid);
        if (!userData) {
          throw new Error('User data not found');
        }

        this.userSubject.next(userData);
        return userData;
      }),
      catchError((error) => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.message || 'Login failed'));
      })
    );
  }

  register(userData: RegisterRequest): Observable<User> {
    return from(createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    )).pipe(
      switchMap(async (userCredential) => {
        // Update displayName
        await updateProfile(userCredential.user, {
          displayName: userData.displayName
        });

        // Create user document in Firestore
        const newUser: User = {
          _id: userCredential.user.uid,
          email: userCredential.user.email!,
          displayName: userData.displayName,
          role: 'customer', // Default role
          preferences: {
            theme: 'light',
            notifications: true
          },
          createdAt: new Date()
        };

        await setDoc(doc(firestore, 'users', userCredential.user.uid), newUser);

        const token = await userCredential.user.getIdToken();
        this.tokenSubject.next(token);
        this.userSubject.next(newUser);

        return newUser;
      }),
      catchError((error) => {
        console.error('Registration error:', error);
        return throwError(() => new Error(error.message || 'Registration failed'));
      })
    );
  }

  logout(): Observable<void> {
    return from(signOut(auth)).pipe(
      tap(() => {
        this.userSubject.next(null);
        this.tokenSubject.next(null);
      }),
      catchError((error) => {
        console.error('Logout error:', error);
        return throwError(() => new Error(error.message || 'Logout failed'));
      })
    );
  }

  getCurrentUser(): Observable<User | null> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return of(null);
    }

    return from(this.getUserData(currentUser.uid)).pipe(
      tap(user => {
        if (user) {
          this.userSubject.next(user);
        }
      }),
      catchError((error) => {
        console.error('Get current user error:', error);
        return of(null);
      })
    );
  }

  updateProfile(userData: Partial<User>): Observable<User> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    return from(this.getUserData(currentUser.uid)).pipe(
      switchMap(async (existingUser) => {
        if (!existingUser) {
          throw new Error('User not found');
        }

        // Update in Firestore
        const updatedUser = {
          ...existingUser,
          ...userData,
          _id: currentUser.uid // Ensure ID doesn't change
        };

        await setDoc(doc(firestore, 'users', currentUser.uid), updatedUser, { merge: true });

        // If displayName is updated, also update in Firebase Auth
        if (userData.displayName) {
          await updateProfile(currentUser, {
            displayName: userData.displayName
          });
        }

        this.userSubject.next(updatedUser);
        return updatedUser;
      }),
      catchError((error) => {
        console.error('Update profile error:', error);
        return throwError(() => new Error(error.message || 'Update profile failed'));
      })
    );
  }

  getToken(): Observable<string | null> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return of(null);
    }

    return from(currentUser.getIdToken());
  }

  // Helper method to get user data from Firestore
  private async getUserData(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));

      if (!userDoc.exists()) {
        return null;
      }

      return userDoc.data() as User;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }
} 
