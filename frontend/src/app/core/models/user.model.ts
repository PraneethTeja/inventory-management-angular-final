export interface User {
  _id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'customer';
  preferences?: UserPreferences;
  createdAt?: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
} 
