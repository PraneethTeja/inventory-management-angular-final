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
  query,
  where,
  orderBy,
  limit,
  QueryConstraint
} from 'firebase/firestore';
import { User } from 'firebase/auth';

import { Order, OrderResponse, OrderStats, OrderStatus } from '../models/order.model';
import { auth, firestore } from '../../app.config';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly COLLECTION_NAME = 'orders';

  constructor() { }

  // Admin methods
  getAllOrders(
    page: number = 1,
    pageSize: number = 10,
    status?: OrderStatus,
    sortField: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<OrderResponse> {
    const queryConstraints: QueryConstraint[] = [];

    if (status) {
      queryConstraints.push(where('status', '==', status));
    }

    queryConstraints.push(orderBy(sortField, sortOrder));

    return from(this.getFilteredOrdersCount(queryConstraints)).pipe(
      switchMap(async (total) => {
        const ordersQuery = query(
          collection(firestore, this.COLLECTION_NAME),
          ...queryConstraints,
          limit(pageSize)
        );

        const snapshot = await getDocs(ordersQuery);
        const orders: Order[] = [];

        snapshot.forEach(doc => {
          const data = doc.data() as Omit<Order, '_id'>;
          orders.push({
            _id: doc.id,
            ...data
          } as Order);
        });

        return {
          orders,
          pagination: {
            total,
            page,
            limit: pageSize,
            pages: Math.ceil(total / pageSize)
          }
        };
      }),
      catchError(error => {
        console.error('Get all orders error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch orders'));
      })
    );
  }

  getOrderById(orderId: string): Observable<Order> {
    return from(getDoc(doc(firestore, this.COLLECTION_NAME, orderId))).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          throw new Error('Order not found');
        }

        const data = docSnap.data() as Omit<Order, '_id'>;
        return {
          _id: docSnap.id,
          ...data
        } as Order;
      }),
      catchError(error => {
        console.error('Get order error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch order'));
      })
    );
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Observable<Order> {
    const docRef = doc(firestore, this.COLLECTION_NAME, orderId);

    return from(updateDoc(docRef, {
      status,
      updatedAt: new Date(),
      statusHistory: this.addToStatusHistory(status)
    })).pipe(
      switchMap(() => this.getOrderById(orderId)),
      catchError(error => {
        console.error('Update order status error:', error);
        return throwError(() => new Error(error.message || 'Failed to update order status'));
      })
    );
  }

  // Customer methods
  getCustomerOrders(
    page: number = 1,
    pageSize: number = 10,
    status?: OrderStatus,
    sortField: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<OrderResponse> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    const queryConstraints: QueryConstraint[] = [
      where('userId', '==', currentUser.uid)
    ];

    if (status) {
      queryConstraints.push(where('status', '==', status));
    }

    queryConstraints.push(orderBy(sortField, sortOrder));

    return from(this.getFilteredOrdersCount(queryConstraints)).pipe(
      switchMap(async (total) => {
        const ordersQuery = query(
          collection(firestore, this.COLLECTION_NAME),
          ...queryConstraints,
          limit(pageSize)
        );

        const snapshot = await getDocs(ordersQuery);
        const orders: Order[] = [];

        snapshot.forEach(doc => {
          const data = doc.data() as Omit<Order, '_id'>;
          orders.push({
            _id: doc.id,
            ...data
          } as Order);
        });

        return {
          orders,
          pagination: {
            total,
            page,
            limit: pageSize,
            pages: Math.ceil(total / pageSize)
          }
        };
      }),
      catchError(error => {
        console.error('Get customer orders error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch orders'));
      })
    );
  }

  createOrder(order: Omit<Order, '_id'>): Observable<Order> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    const newOrder = {
      ...order,
      userId: currentUser.uid,
      createdAt: new Date(),
      status: 'pending' as OrderStatus,
      statusHistory: [
        { status: 'pending', date: new Date(), note: 'Order created' }
      ]
    };

    return from(addDoc(collection(firestore, this.COLLECTION_NAME), newOrder)).pipe(
      map(docRef => ({
        _id: docRef.id,
        ...newOrder
      } as Order)),
      catchError(error => {
        console.error('Create order error:', error);
        return throwError(() => new Error(error.message || 'Failed to create order'));
      })
    );
  }

  getOrderStats(): Observable<OrderStats> {
    const statsPromise = Promise.all([
      this.getStatusCount('pending'),
      this.getStatusCount('confirmed'),
      this.getStatusCount('processing'),
      this.getStatusCount('shipped'),
      this.getStatusCount('delivered'),
      this.getStatusCount('canceled')
    ]).then(async ([pending, confirmed, processing, shipped, delivered, canceled]) => {
      // Get recent orders
      const recentOrdersQuery = query(
        collection(firestore, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(recentOrdersQuery);
      const recentOrders: Order[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as Omit<Order, '_id'>;
        recentOrders.push({
          _id: doc.id,
          ...data
        } as Order);
      });

      // Calculate total revenue
      const allOrdersQuery = query(
        collection(firestore, this.COLLECTION_NAME),
        where('paymentStatus', '==', 'paid')
      );

      const allOrdersSnapshot = await getDocs(allOrdersQuery);
      let totalRevenue = 0;

      allOrdersSnapshot.forEach(doc => {
        const orderData = doc.data();
        totalRevenue += orderData['totalAmount'] || 0;
      });

      return {
        totalOrders: pending + confirmed + processing + shipped + delivered + canceled,
        statusCounts: {
          pending,
          confirmed,
          processing,
          shipped,
          delivered,
          canceled
        },
        recentOrders,
        totalRevenue
      };
    });

    return from(statsPromise).pipe(
      catchError(error => {
        console.error('Get order stats error:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch order stats'));
      })
    );
  }

  // Helper methods
  private async getFilteredOrdersCount(queryConstraints: QueryConstraint[]): Promise<number> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        ...queryConstraints
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting orders count:', error);
      return 0;
    }
  }

  private async getStatusCount(status: OrderStatus): Promise<number> {
    try {
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('status', '==', status)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Error getting ${status} count:`, error);
      return 0;
    }
  }

  private addToStatusHistory(status: OrderStatus) {
    return {
      status,
      date: new Date(),
      note: `Order marked as ${status}`
    };
  }
} 
