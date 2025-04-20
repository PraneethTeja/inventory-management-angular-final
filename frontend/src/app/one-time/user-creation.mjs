// create-admin-user.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

import { environment } from '../../environments/environment';

const firebaseConfig = environment.firebase;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Admin user details - change these as needed
const ADMIN_EMAIL = "admintest@gmail.com";
const ADMIN_PASSWORD = "adminpass";
const ADMIN_NAME = "Admin User";

async function createAdminUser() {
  try {
    console.log(`Creating admin user: ${ADMIN_EMAIL}`);

    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );

    const userId = userCredential.user.uid;
    console.log(`User created in Authentication with ID: ${userId}`);

    // Add user profile to Firestore
    const userData = {
      _id: userId,
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      role: "admin",
      preferences: {
        theme: "light",
        notifications: true
      },
      createdAt: new Date()
    };

    await setDoc(doc(firestore, 'users', userId), userData);
    console.log(`User profile added to Firestore: ${JSON.stringify(userData, null, 2)}`);

    console.log('Admin user creation completed successfully!');
  } catch (error) {
    console.error('Error creating admin user:', error.message);

    if (error.code === 'auth/email-already-in-use') {
      console.log('Email is already in use. You may need to check if the user exists in Firestore.');
    }
  }
}

// Execute the function
createAdminUser();
