import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Observable, from } from 'rxjs';
import { auth, firestore, storage } from '../../app.config';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  constructor() { }

  // Firestore helpers
  getCollection<T>(path: string): CollectionReference<T> {
    return collection(firestore, path) as CollectionReference<T>;
  }

  getDocument<T>(path: string, id: string): DocumentReference<T> {
    return doc(firestore, path, id) as DocumentReference<T>;
  }

  async getDocumentData<T>(path: string, id: string): Promise<T | null> {
    try {
      const docRef = this.getDocument<T>(path, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return { ...docSnap.data(), id: docSnap.id } as T;
    } catch (error) {
      console.error(`Error getting document data from ${path}/${id}:`, error);
      return null;
    }
  }

  // Storage helpers
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Auth helpers
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  async getCurrentUserToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    return await user.getIdToken();
  }
} 
