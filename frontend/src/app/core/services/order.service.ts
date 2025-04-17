import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Order, OrderResponse, OrderStats, OrderStatus } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) { }

  // Admin methods
  getAllOrders(
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus,
    sort: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<OrderResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', sort)
      .set('order', order);

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<OrderResponse>(this.apiUrl, { params }).pipe(
      catchError(error => {
        console.error('Get all orders error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch orders'));
      })
    );
  }

  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`).pipe(
      catchError(error => {
        console.error('Get order error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch order'));
      })
    );
  }

  createOrder(order: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, order).pipe(
      catchError(error => {
        console.error('Create order error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to create order'));
      })
    );
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${orderId}/status`, { status }).pipe(
      catchError(error => {
        console.error('Update order status error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to update order status'));
      })
    );
  }

  updateWhatsappStatus(orderId: string, whatsappData: { conversationId?: string, messageSent: boolean }): Observable<{ _id: string, whatsapp: any }> {
    return this.http.put<{ _id: string, whatsapp: any }>(`${this.apiUrl}/${orderId}/whatsapp-status`, whatsappData).pipe(
      catchError(error => {
        console.error('Update WhatsApp status error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to update WhatsApp status'));
      })
    );
  }

  getOrderStats(): Observable<OrderStats> {
    return this.http.get<OrderStats>(`${this.apiUrl}/stats`).pipe(
      catchError(error => {
        console.error('Get order stats error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch order stats'));
      })
    );
  }

  // Customer methods
  createWhatsappOrder(orderData: {
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    items: {
      product: string;
      quantity: number;
      combinationDetails?: {
        isCombo: boolean;
        pendantInfo?: { id: string; name: string; price: number };
        chainInfo?: { id: string; name: string; price: number };
      };
    }[];
    notes?: string;
  }): Observable<{
    orderId: string;
    customer: any;
    totalAmount: number;
    items: any[];
    whatsappRedirect: boolean;
  }> {
    return this.http.post<any>(`${this.apiUrl}/whatsapp`, orderData).pipe(
      catchError(error => {
        console.error('Create WhatsApp order error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to create order'));
      })
    );
  }
} 
