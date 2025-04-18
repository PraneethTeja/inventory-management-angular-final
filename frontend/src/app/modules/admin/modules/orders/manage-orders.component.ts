import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderStatus, PaymentStatus } from '../../../../core/models/order.model';

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

  isLoading: boolean = false;
  error: string = '';
  success: string = '';

  // Ordering
  sortBy: string = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Modal properties
  showViewModal: boolean = false;
  showEditModal: boolean = false;
  selectedOrder: any = null;
  editedOrder: any = null;

  // Status and payment options
  statusOptions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled'];
  paymentStatusOptions = ['paid', 'pending', 'failed', 'refunded'];
  paymentMethodOptions = ['cash', 'card', 'upi', 'bank_transfer'];

  constructor() { }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;

    // In a real app, this would be a service call
    setTimeout(() => {
      this.orders = this.getMockOrders();
      this.applyFilters();
      this.isLoading = false;
    }, 500);
  }

  applyFilters(): void {
    let result = [...this.orders];

    // Apply status filter
    if (this.statusFilter !== 'all') {
      result = result.filter(order => order.status.toLowerCase() === this.statusFilter);
    }

    // Apply date filter
    if (this.dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (this.dateFilter === 'today') {
        result = result.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= today;
        });
      } else if (this.dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        result = result.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= weekAgo;
        });
      } else if (this.dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        result = result.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= monthAgo;
        });
      }
    }

    // Apply search
    if (this.searchTerm.trim() !== '') {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(order =>
        order.id.toLowerCase().includes(search) ||
        order.customer.name.toLowerCase().includes(search) ||
        order.customer.email.toLowerCase().includes(search) ||
        order.customer.phone.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;

      if (this.sortBy === 'date') {
        valueA = new Date(a.date).getTime();
        valueB = new Date(b.date).getTime();
      } else if (this.sortBy === 'totalAmount') {
        valueA = a.totalAmount;
        valueB = b.totalAmount;
      } else if (this.sortBy === 'id') {
        valueA = a.id;
        valueB = b.id;
      } else {
        valueA = a[this.sortBy];
        valueB = b[this.sortBy];
      }

      const compareResult = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      return this.sortDirection === 'asc' ? compareResult : -compareResult;
    });

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
    this.applyFilters();
  }

  get paginatedOrders(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOrders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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

  saveOrderChanges(): void {
    // In a real app, this would be a service call to update the order in the backend
    const index = this.orders.findIndex(order => order.id === this.editedOrder.id);
    if (index !== -1) {
      this.orders[index] = this.editedOrder;
      this.applyFilters();
      this.success = `Order ${this.editedOrder.id} has been updated successfully!`;
      setTimeout(() => {
        this.success = '';
      }, 3000);
    }
    this.closeEditModal();
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

  // Mock data for development
  getMockOrders(): any[] {
    const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Canceled'];
    const paymentMethods = ['Cash', 'Card', 'UPI', 'Bank Transfer'];
    const paymentStatuses = ['Paid', 'Pending', 'Failed', 'Refunded'];

    return Array.from({ length: 50 }, (_, i) => {
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60)); // Random date within last 60 days

      const orderItems = Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
        product: `PROD-${Math.floor(Math.random() * 1000)}`,
        name: `Product ${j + 1}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.floor(Math.random() * 5000) + 500,
        category: Math.random() > 0.5 ? 'pendant' : 'chain'
      }));

      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.18;
      const totalAmount = subtotal + tax;

      return {
        id: `ORD-${1000 + i}`,
        customer: {
          name: `Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`,
          phone: `98765${43210 + i}`
        },
        items: orderItems,
        date: orderDate.toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        subtotal,
        tax,
        totalAmount,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)]
      };
    });
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
