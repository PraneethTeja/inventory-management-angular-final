import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderStatus, PaymentStatus, Order, OrderResponse } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order.service';
import {
  collection,
  query,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  where,
  limit,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { firestore } from '../../../../app.config';

@Component({
  selector: 'app-manage-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-orders.component.html',
  styleUrls: ['./manage-orders.component.scss']
})
export class ManageOrdersComponent implements OnInit {
  orders: any[] = [];
  filteredOrders: any[] = [];

  // Filters
  statusFilter: string = 'all';
  dateFilter: string = 'all';
  searchTerm: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalCount: number = 0;

  isLoading: boolean = false;
  error: string = '';
  success: string = '';

  // Ordering
  sortBy: string = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Modal properties
  showViewModal: boolean = false;
  showEditModal: boolean = false;
  selectedOrder: any = null;
  editedOrder: any = null;

  // Status and payment options
  statusOptions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled'];
  paymentStatusOptions = ['paid', 'pending', 'failed', 'refunded'];
  paymentMethodOptions = ['cash', 'credit_card', 'upi', 'bank_transfer'];

  private readonly COLLECTION_NAME = 'orders';

  constructor(private orderService: OrderService) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = '';

    this.fetchOrdersFromFirestore()
      .then(ordersData => {
        this.orders = ordersData.orders;
        this.totalCount = ordersData.totalCount;
        this.applyFilters();
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error loading orders:', error);
        this.error = 'Failed to load orders. Please try again.';
        this.orders = [];
        this.applyFilters();
        this.isLoading = false;
      });
  }

  async fetchOrdersFromFirestore(): Promise<{ orders: any[], totalCount: number }> {
    try {
      const queryConstraints: QueryConstraint[] = [];

      // Apply status filter to Firestore query
      if (this.statusFilter !== 'all') {
        queryConstraints.push(where('status', '==', this.statusFilter));
      }

      // Apply date filter to Firestore query
      if (this.dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (this.dateFilter === 'today') {
          queryConstraints.push(where('createdAt', '>=', today));
        } else if (this.dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          queryConstraints.push(where('createdAt', '>=', weekAgo));
        } else if (this.dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          queryConstraints.push(where('createdAt', '>=', monthAgo));
        }
      }

      // Add sorting
      queryConstraints.push(orderBy(this.sortBy, this.sortDirection));

      // First, get total count for pagination
      const countQuery = query(
        collection(firestore, this.COLLECTION_NAME),
        ...queryConstraints
      );

      const countSnapshot = await getDocs(countQuery);
      const totalCount = countSnapshot.size;

      // Then get paginated data
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const paginatedQuery = query(
        collection(firestore, this.COLLECTION_NAME),
        ...queryConstraints,
        limit(this.itemsPerPage)
      );

      const querySnapshot = await getDocs(paginatedQuery);
      const orders: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Convert Firestore timestamps to Date objects
        const createdAt = data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']);
        const updatedAt = data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']);

        orders.push({
          id: doc.id,
          ...data,
          createdAt,
          updatedAt,
          date: createdAt // For backward compatibility with template
        });
      });

      return { orders, totalCount };
    } catch (error) {
      console.error('Error fetching orders from Firestore:', error);
      throw error;
    }
  }

  applyFilters(): void {
    // Client-side filtering is now minimized since we're doing most filtering in the Firestore query
    // We mainly handle search here which is not easily done on Firestore
    let result = [...this.orders];

    // Apply search (client-side filter)
    if (this.searchTerm.trim() !== '') {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(order =>
        order.id.toLowerCase().includes(search) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(search)) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(search)) ||
        (order.customer?.phone && order.customer.phone.toLowerCase().includes(search))
      );
    }

    this.filteredOrders = result;
  }

  changeSorting(sortBy: string): void {
    if (this.sortBy === sortBy) {
      // Toggle direction if same sort column is clicked
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'desc'; // Default to descending for new sort column
    }

    // Reload orders from Firestore with new sorting
    this.loadOrders();
  }

  get paginatedOrders(): any[] {
    return this.filteredOrders;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadOrders(); // Reload with new page
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages;

    if (totalPages <= 7) {
      // Return all page numbers if 7 or fewer pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // We need to handle pagination smartly
      const pages: number[] = [];

      // Always include the first and last page
      pages.push(1);

      // Add pages around the current page
      for (let i = Math.max(2, this.currentPage - 1); i <= Math.min(totalPages - 1, this.currentPage + 1); i++) {
        pages.push(i);
      }

      // Add the last page
      pages.push(totalPages);

      // Sort and ensure no duplicates
      return [...new Set(pages)].sort((a, b) => a - b);
    }
  }

  // View Order Functions
  viewOrder(order: any): void {
    this.selectedOrder = order;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedOrder = null;
  }

  // Edit Order Functions
  editOrder(order: any): void {
    // Create a deep copy to avoid modifying the original data
    this.selectedOrder = order;
    this.editedOrder = JSON.parse(JSON.stringify(order));
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedOrder = null;
    this.editedOrder = null;
  }

  async saveOrderChanges(): Promise<void> {
    try {
      this.isLoading = true;

      // Update Firestore document
      const orderRef = doc(firestore, this.COLLECTION_NAME, this.editedOrder.id);

      // Prepare data for update, omitting id field which is not stored in document
      const { id, ...updateData } = this.editedOrder;

      // Ensure updatedAt is set
      updateData.updatedAt = new Date();

      await updateDoc(orderRef, updateData);

      // Reload orders to reflect changes
      await this.loadOrders();

      this.success = `Order ${this.editedOrder.id} has been updated successfully!`;
      setTimeout(() => {
        this.success = '';
      }, 3000);

      this.closeEditModal();
      this.isLoading = false;
    } catch (error) {
      console.error('Error updating order:', error);
      this.error = 'Failed to update order. Please try again.';
      this.isLoading = false;
    }
  }

  // WhatsApp Functions
  sendToWhatsApp(order: any): void {
    // In a real app, this would connect to a WhatsApp API
    console.log(`Sending order ${order.id} to WhatsApp for customer ${order.customer.name}`);
    alert(`Order ${order.id} summary sent to customer via WhatsApp`);
  }

  // Calculate Order Total
  calculateTotal(order: any): number {
    return order.items.reduce((total: number, item: any) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered': return 'status-delivered';
      case 'shipped': return 'status-shipped';
      case 'processing': return 'status-processing';
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'canceled': return 'status-canceled';
      default: return '';
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid': return 'payment-paid';
      case 'pending': return 'payment-pending';
      case 'failed': return 'payment-failed';
      case 'refunded': return 'payment-refunded';
      default: return '';
    }
  }
} 
