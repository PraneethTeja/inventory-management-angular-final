import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Product, ProductCategory, ProductResponse } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) { }

  // Added convenience method to get all products as an array
  getProducts(): Observable<Product[]> {
    return this.getAllProducts(1, 100)
      .pipe(
        map(response => response.products)
      );
  }

  getAllProducts(
    page: number = 1,
    limit: number = 10,
    category?: ProductCategory,
    featured?: boolean,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    sort: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<ProductResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', sort)
      .set('order', order);

    if (category) {
      params = params.set('category', category);
    }

    if (featured !== undefined) {
      params = params.set('featured', featured.toString());
    }

    if (search) {
      params = params.set('search', search);
    }

    if (minPrice !== undefined) {
      params = params.set('minPrice', minPrice.toString());
    }

    if (maxPrice !== undefined) {
      params = params.set('maxPrice', maxPrice.toString());
    }

    return this.http.get<ProductResponse>(this.apiUrl, { params }).pipe(
      catchError(error => {
        console.error('Get all products error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch products'));
      })
    );
  }

  getProductById(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${productId}`).pipe(
      catchError(error => {
        console.error('Get product error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch product'));
      })
    );
  }

  getFeaturedProducts(limit: number = 6): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Product[]>(`${this.apiUrl}/featured`, { params }).pipe(
      catchError(error => {
        console.error('Get featured products error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch featured products'));
      })
    );
  }

  getProductsByCategory(
    category: ProductCategory,
    page: number = 1,
    limit: number = 10,
    sort: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<ProductResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', sort)
      .set('order', order);

    return this.http.get<ProductResponse>(`${this.apiUrl}/category/${category}`, { params }).pipe(
      catchError(error => {
        console.error('Get products by category error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch products'));
      })
    );
  }

  // Admin methods
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product).pipe(
      catchError(error => {
        console.error('Create product error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to create product'));
      })
    );
  }

  updateProduct(productId: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${productId}`, product).pipe(
      catchError(error => {
        console.error('Update product error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to update product'));
      })
    );
  }

  deleteProduct(productId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${productId}`).pipe(
      catchError(error => {
        console.error('Delete product error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to delete product'));
      })
    );
  }
} 
