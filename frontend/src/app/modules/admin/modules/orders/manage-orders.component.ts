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
  QueryConstraint,
  serverTimestamp,
  getDoc
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
  showSendMessageModal: boolean = false;
  selectedOrder: any = null;
  editedOrder: any = null;
  previousOrderStatus: string = '';

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
    // Store the previous status to compare after save
    this.previousOrderStatus = order.status;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedOrder = null;
    this.editedOrder = null;
    this.previousOrderStatus = '';
  }

  async saveOrderChanges(): Promise<void> {
    try {
      this.isLoading = true;

      // Update Firestore document
      const orderRef = doc(firestore, this.COLLECTION_NAME, this.editedOrder.id);

      // Prepare data for update, omitting id field which is not stored in document
      const { id, ...updateData } = this.editedOrder;

      // Ensure updatedAt is set
      updateData.updatedAt = serverTimestamp();

      await updateDoc(orderRef, updateData);

      // Check if order status has changed
      const statusChanged = this.previousOrderStatus !== this.editedOrder.status;

      // If status changed, trigger WhatsApp notification
      if (statusChanged && this.editedOrder.customer && this.editedOrder.customer.phone) {
        this.sendStatusUpdateToWhatsApp(this.editedOrder);
      }

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

  // WhatsApp notification for status update
  sendStatusUpdateToWhatsApp(order: any): void {
    try {
      // Generate WhatsApp message with status update
      const message = this.generateStatusUpdateMessage(order);

      // Get customer phone
      const customerPhone = order.customer.phone;
      if (!customerPhone) {
        console.error('Customer phone number is missing');
        return;
      }

      // Format phone number for WhatsApp (add country code if not present)
      const formattedPhone = customerPhone.startsWith('91') ? customerPhone : `91${customerPhone}`;

      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');

      // Update WhatsApp status in Firestore
      this.updateWhatsAppStatusInFirestore(order.id);
    } catch (error) {
      console.error('Error sending WhatsApp status update:', error);
    }
  }

  // Update WhatsApp status in Firestore
  private async updateWhatsAppStatusInFirestore(orderId: string): Promise<void> {
    try {
      const orderRef = doc(firestore, this.COLLECTION_NAME, orderId);
      await updateDoc(orderRef, {
        'whatsapp.messageSent': true,
        'whatsapp.lastMessageTimestamp': serverTimestamp()
      });
      console.log('WhatsApp status updated in Firestore');
    } catch (error) {
      console.error('Error updating WhatsApp status:', error);
    }
  }

  // Generate message for status update
  private generateStatusUpdateMessage(order: any): string {
    const customerName = order.customer.name || 'Valued Customer';
    const orderId = order.id || order._id;
    const orderStatus = order.status;

    // Start with greeting
    let message = `🛍️ *Order Update - Jewelry Shop* 🛍️\n\n`;

    // Add greeting with customer name
    message += `Dear ${customerName},\n\n`;

    // Add status update based on the new status
    switch (orderStatus) {
      case 'confirmed':
        message += `Great news! Your order #${orderId} has been confirmed and is being prepared for processing.\n\n`;
        break;
      case 'processing':
        message += `Your order #${orderId} is now being processed. We're preparing your items with care.\n\n`;
        break;
      case 'shipped':
        message += `Your order #${orderId} has been shipped! Your beautiful jewelry is on its way to you.\n\n`;
        // Add shipping details if available
        if (order.shippingDetails) {
          message += `*Shipping Details:*\n`;
          if (order.shippingDetails.trackingNumber) {
            message += `Tracking Number: ${order.shippingDetails.trackingNumber}\n`;
          }
          if (order.shippingDetails.carrier) {
            message += `Carrier: ${order.shippingDetails.carrier}\n`;
          }
          message += `\n`;
        }
        break;
      case 'delivered':
        message += `Your order #${orderId} has been delivered! We hope you love your new jewelry.\n\n`;
        message += `If you have any questions or concerns about your purchase, please don't hesitate to contact us.\n\n`;
        message += `We'd love to see how you style your new pieces! Tag us on social media.\n\n`;
        break;
      case 'canceled':
        message += `We're sorry to inform you that your order #${orderId} has been cancelled.\n\n`;
        message += `If you have any questions about this cancellation or would like to place a new order, please contact our customer service team.\n\n`;
        break;
      default:
        message += `This is an update regarding your order #${orderId}. The status of your order is now: ${orderStatus}.\n\n`;
    }

    // Add order total
    if (order.totalAmount) {
      message += `*Order Total:* ₹${order.totalAmount.toFixed(2)}\n\n`;
    }

    // Add closing
    message += `Thank you for shopping with us!\n`;
    message += `Jewelry Shop Team`;

    return message;
  }

  // Function to manually send a status update for any order
  sendManualStatusUpdate(order: any): void {
    this.sendStatusUpdateToWhatsApp(order);
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
