# Jewelry Shop App - Firebase Migration

This project has been migrated from MongoDB/Node.js backend to Firebase. This document outlines the changes made and the setup required to use Firebase.

## Setup Instructions

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Authentication, Firestore, and Storage services

2. **Update Firebase Configuration**:
   - Edit `src/environments/environment.ts` and `src/environments/environment.prod.ts` (if exists)
   - Replace the Firebase configuration values with your own:
     ```typescript
     firebase: {
       apiKey: "YOUR_API_KEY",
       authDomain: "your-project-id.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project-id.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
     }
     ```

3. **Set Up Firestore Security Rules**:
   - In Firebase Console, navigate to Firestore Database
   - Go to the Rules tab and set up appropriate security rules, for example:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         // Allow authenticated users to read any document
         match /{document=**} {
           allow read: if request.auth != null;
         }
         
         // User profiles
         match /users/{userId} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.auth.uid == userId;
         }
         
         // Products
         match /products/{productId} {
           allow read: if true;
           allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
         }
         
         // Orders
         match /orders/{orderId} {
           allow read: if request.auth != null && (
             request.auth.uid == resource.data.userId || 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
           );
           allow create: if request.auth != null;
           allow update: if request.auth != null && (
             request.auth.uid == resource.data.userId || 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
           );
         }
         
         // Carts
         match /carts/{userId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
     ```

4. **Set Up Firebase Authentication**:
   - In Firebase Console, go to Authentication
   - Enable Email/Password sign-in method
   - Optionally enable other sign-in methods as needed

## Firestore Data Structure

The app uses the following collections in Firestore:

1. **users**: Stores user profiles
   ```
   {
     _id: string (document ID = auth UID),
     email: string,
     displayName: string,
     role: 'admin' | 'customer',
     preferences: {
       theme: 'light' | 'dark',
       notifications: boolean
     },
     createdAt: timestamp
   }
   ```

2. **products**: Stores product information
   ```
   {
     name: string,
     category: 'chain' | 'pendant' | 'combination' | 'accessory',
     price: number,
     description: string,
     inStock: boolean,
     productCode: string,
     imageUrl: string,
     imageUrls?: string[],
     stockQuantity: number,
     details?: {
       material?: string,
       weight?: string,
       dimensions?: string,
       features?: string[]
     },
     featured?: boolean,
     discount?: {
       percentage: number,
       validUntil?: timestamp
     },
     tags?: string[],
     relatedProducts?: string[],
     customProperties?: Record<string, any>
   }
   ```

3. **orders**: Stores order information
   ```
   {
     userId: string,
     customer: {
       name: string,
       email: string,
       phone: string,
       address?: {
         street?: string,
         city?: string,
         state?: string,
         zipCode?: string,
         country: string
       }
     },
     items: [...],
     status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'canceled',
     subtotal: number,
     tax: number,
     shippingCost: number,
     discount: number,
     totalAmount: number,
     paymentMethod: string,
     paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
     createdAt: timestamp,
     updatedAt: timestamp,
     statusHistory: [
       {
         status: string,
         date: timestamp,
         note: string
       }
     ]
   }
   ```

4. **carts**: Stores user shopping carts
   ```
   {
     items: [...],
     updatedAt: timestamp
   }
   ```

5. **whatsapp_orders**: Stores information for WhatsApp integration
   ```
   {
     items: [...],
     userId: string,
     phoneNumber: string,
     createdAt: timestamp,
     status: string
   }
   ```

## Key Changes from MongoDB to Firebase

1. **Authentication**: 
   - Using Firebase Authentication instead of JWT tokens
   - User data stored in both Authentication and Firestore

2. **Data Access**:
   - Replaced HTTP API calls with direct Firestore operations
   - Services updated to use Firebase SDK

3. **Real-time Updates**:
   - Firebase allows for real-time updates through listeners
   - Can be implemented to enhance UI responsiveness

## Deployment

1. **Firebase Hosting**:
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login to Firebase: `firebase login`
   - Initialize Firebase in your project: `firebase init`
   - Build the Angular app: `ng build --prod`
   - Deploy to Firebase: `firebase deploy`

2. **Continuous Integration**:
   - Consider setting up GitHub Actions or similar CI/CD for automated deployments

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Angular Fire Documentation](https://github.com/angular/angularfire)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started) 
