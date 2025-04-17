import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
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

  constructor() { }

  ngOnInit(): void {
    // In a real app, these would be loaded from services
    this.loadMockData();
  }

  private loadMockData(): void {
    // Mock stats
    this.stats = {
      orders: {
        total: 156,
        pending: 23,
        delivered: 120,
        revenue: 15680
      },
      products: {
        total: 48,
        lowStock: 5
      },
      customers: {
        total: 89,
        new: 12
      }
    };

    // Mock recent orders
    this.recentOrders = [
      { id: 'ORD-001', customer: 'John Doe', date: new Date(), amount: 126.50, status: 'Delivered' },
      { id: 'ORD-002', customer: 'Jane Smith', date: new Date(), amount: 89.99, status: 'Processing' },
      { id: 'ORD-003', customer: 'Robert Brown', date: new Date(), amount: 210.75, status: 'Pending' },
      { id: 'ORD-004', customer: 'Emma Wilson', date: new Date(), amount: 54.25, status: 'Delivered' },
      { id: 'ORD-005', customer: 'Michael Davis', date: new Date(), amount: 175.00, status: 'Delivered' }
    ];
  }
} 
