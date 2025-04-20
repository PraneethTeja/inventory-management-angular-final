import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';
import { firestore } from '../../../../app.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = {
    orders: {
      total: 0,
      pending: 0,
      delivered: 0,
      revenue: 0
    },
    products: {
      total: 0,
      lowStock: 0
    },
    customers: {
      total: 0,
      new: 0
    }
  };

  recentOrders: any[] = [];
  isLoading: boolean = true;
  error: string = '';

  constructor(
    private orderService: OrderService,
    private productService: ProductService
  ) { }

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  public async fetchDashboardData(): Promise<void> {
    this.isLoading = true;

    try {
      // Load statistics and recent orders in parallel
      await Promise.all([
        this.fetchOrderStats(),
        this.fetchProductStats(),
        this.fetchRecentOrders()
      ]);

      this.isLoading = false;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.error = 'Failed to load dashboard data';
      this.isLoading = false;
    }
  }

  private async fetchOrderStats(): Promise<void> {
    try {
      // Get total order count
      const ordersRef = collection(firestore, 'orders');
      const totalSnapshot = await getCountFromServer(ordersRef);
      this.stats.orders.total = totalSnapshot.data().count;

      // Get pending orders count
      const pendingSnapshot = await getCountFromServer(
        query(ordersRef, where('status', '==', 'pending'))
      );
      this.stats.orders.pending = pendingSnapshot.data().count;

      // Get delivered orders count
      const deliveredSnapshot = await getCountFromServer(
        query(ordersRef, where('status', '==', 'delivered'))
      );
      this.stats.orders.delivered = deliveredSnapshot.data().count;

      // Calculate revenue from delivered orders
      const deliveredOrdersQuery = query(
        ordersRef,
        where('status', '==', 'delivered')
      );

      const deliveredOrdersSnapshot = await getDocs(deliveredOrdersQuery);
      let totalRevenue = 0;

      deliveredOrdersSnapshot.forEach(doc => {
        const data = doc.data();
        totalRevenue += data['totalAmount'] || 0;
      });

      this.stats.orders.revenue = totalRevenue;
    } catch (error) {
      console.error('Error fetching order statistics:', error);
      throw error;
    }
  }

  private async fetchProductStats(): Promise<void> {
    try {
      // Get total product count
      const productsRef = collection(firestore, 'products');
      const totalSnapshot = await getCountFromServer(productsRef);
      this.stats.products.total = totalSnapshot.data().count;

      // Get low stock products count (products with stock quantity less than 5)
      const lowStockSnapshot = await getCountFromServer(
        query(productsRef, where('stockQuantity', '<', 5))
      );
      this.stats.products.lowStock = lowStockSnapshot.data().count;
    } catch (error) {
      console.error('Error fetching product statistics:', error);
      throw error;
    }
  }

  private async fetchRecentOrders(): Promise<void> {
    try {
      const ordersRef = collection(firestore, 'orders');
      const recentOrdersQuery = query(
        ordersRef,
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const querySnapshot = await getDocs(recentOrdersQuery);
      const orders: any[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']);

        orders.push({
          id: doc.id,
          customer: data['customer']?.name || 'Unknown Customer',
          date: createdAt,
          amount: data['totalAmount'] || 0,
          status: data['status'].charAt(0).toUpperCase() + data['status'].slice(1) // Capitalize status
        });
      });

      this.recentOrders = orders;
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  }
} 
