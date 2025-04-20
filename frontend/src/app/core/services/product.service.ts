import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
  QueryConstraint
} from 'firebase/firestore';

import { Product, ProductCategory, ProductResponse } from '../models/product.model';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from '../../app.config';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly COLLECTION_NAME = 'products';

  constructor() { }

  getAllProducts(
    page: number = 1,
    pageSize: number = 10,
    category?: ProductCategory,
    featured?: boolean,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    sortField: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<ProductResponse> {
    const queryConstraints: QueryConstraint[] = [];

    // Add filters
    if (category) {
      queryConstraints.push(where('category', '==', category));
    }

    if (featured !== undefined) {
      queryConstraints.push(where('featured', '==', featured));
    }

    if (minPrice !== undefined) {
      queryConstraints.push(where('price', '>=', minPrice));
    }

    if (maxPrice !== undefined) {
      queryConstraints.push(where('price', '<=', maxPrice));
    }

    // Add sorting
    queryConstraints.push(orderBy(sortField, sortOrder));

    // Calculate pagination
    const startAt = (page - 1) * pageSize;

    // Get total count first (for pagination info)
    return from(this.getFilteredProductsCount(queryConstraints)).pipe(
      switchMap(async (total) => {
        const productsQuery = query(
          collection(firestore, this.COLLECTION_NAME),
          ...queryConstraints,
          limit(pageSize)
        );

        const snapshot = await getDocs(productsQuery);
        const products: Product[] = [];

        snapshot.forEach(doc => {
          const data = doc.data() as Omit<Product, '_id'>;
          products.push({
            _id: doc.id,
            ...data
          } as Product);
        });

        // Filter by search term if provided (client-side filtering for simplicity)
        let filteredProducts = products;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredProducts = products.filter(p =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchLower)))
          );
        }

        return {
          products: filteredProducts,
          pagination: {
            total,
            page,
            limit: pageSize,
            pages: Math.ceil(total / pageSize)
          }
        };
      }),
      catchError(error => {
        console.error('Get all products error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch products'));
      })
    );
  }

  getProductById(productId: string): Observable<Product> {
    return from(getDoc(doc(firestore, this.COLLECTION_NAME, productId))).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          throw new Error('Product not found');
        }

        const data = docSnap.data() as Omit<Product, '_id'>;
        return {
          _id: docSnap.id,
          ...data
        } as Product;
      }),
      catchError(error => {
        console.error('Get product error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch product'));
      })
    );
  }

  getFeaturedProducts(limitCount: number = 6): Observable<Product[]> {
    const queryConstraints: QueryConstraint[] = [
      where('featured', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];

    return from(getDocs(query(
      collection(firestore, this.COLLECTION_NAME),
      ...queryConstraints
    ))).pipe(
      map(snapshot => {
        const products: Product[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Omit<Product, '_id'>;
          products.push({
            _id: doc.id,
            ...data
          } as Product);
        });
        return products;
      }),
      catchError(error => {
        console.error('Get featured products error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch featured products'));
      })
    );
  }

  getProductsByCategory(
    category: ProductCategory,
    page: number = 1,
    pageSize: number = 10,
    sortField: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<ProductResponse> {
    const queryConstraints: QueryConstraint[] = [
      where('category', '==', category),
      orderBy(sortField, sortOrder)
    ];

    return from(this.getFilteredProductsCount(queryConstraints)).pipe(
      switchMap(async (total) => {
        const productsQuery = query(
          collection(firestore, this.COLLECTION_NAME),
          ...queryConstraints,
          limit(pageSize)
        );

        const snapshot = await getDocs(productsQuery);
        const products: Product[] = [];

        snapshot.forEach(doc => {
          const data = doc.data() as Omit<Product, '_id'>;
          products.push({
            _id: doc.id,
            ...data
          } as Product);
        });

        return {
          products,
          pagination: {
            total,
            page,
            limit: pageSize,
            pages: Math.ceil(total / pageSize)
          }
        };
      }),
      catchError(error => {
        console.error('Get products by category error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch products'));
      })
    );
  }

  // Admin methods
  createProduct(product: Omit<Product, '_id'>): Observable<Product> {
    const productWithId = {
      ...product,
      productCode: product.productCode || `PROD-${uuidv4().slice(0, 8)}`,
      createdAt: new Date()
    };

    return from(addDoc(collection(firestore, this.COLLECTION_NAME), productWithId)).pipe(
      map(docRef => ({
        _id: docRef.id,
        ...productWithId
      } as Product)),
      catchError(error => {
        console.error('Create product error:', error);
        return throwError(() => new Error(error.message || 'Failed to create product'));
      })
    );
  }

  updateProduct(productId: string, updates: Partial<Product>): Observable<Product> {
    const docRef = doc(firestore, this.COLLECTION_NAME, productId);

    return from(updateDoc(docRef, { ...updates, updatedAt: new Date() })).pipe(
      switchMap(() => this.getProductById(productId)),
      catchError(error => {
        console.error('Update product error:', error);
        return throwError(() => new Error(error.message || 'Failed to update product'));
      })
    );
  }

  deleteProduct(productId: string): Observable<void> {
    return from(deleteDoc(doc(firestore, this.COLLECTION_NAME, productId))).pipe(
      catchError(error => {
        console.error('Delete product error:', error);
        return throwError(() => new Error(error.message || 'Failed to delete product'));
      })
    );
  }

  // Helper methods
  private async getFilteredProductsCount(queryConstraints: QueryConstraint[]): Promise<number> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        ...queryConstraints
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting products count:', error);
      return 0;
    }
  }
} 
