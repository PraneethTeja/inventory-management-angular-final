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
import * as XLSX from 'xlsx-js-style';

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
  statusOptions = ['confirmed', 'processing', 'shipped', 'delivered', 'canceled'];
  paymentStatusOptions = ['paid', 'pending', 'failed', 'refunded'];
  paymentMethodOptions = ['upi'];

  // Export options
  showExportModal: boolean = false;
  exportPeriod: string = '1';

  private readonly COLLECTION_NAME = 'orders';

  constructor(private orderService: OrderService) {
    // Check if the Firestore collection exists
    this.checkFirestoreCollection();
  }

  private async checkFirestoreCollection(): Promise<void> {
    try {
      const colRef = collection(firestore, this.COLLECTION_NAME);
      const testQuery = query(colRef, limit(1));
      const snapshot = await getDocs(testQuery);

      console.log(`Firestore collection '${this.COLLECTION_NAME}' exists. Found ${snapshot.size} documents.`);

      // Log the first document to see its structure
      if (snapshot.size > 0) {
        const firstDoc = snapshot.docs[0];
        console.log('Example document:', { id: firstDoc.id, ...firstDoc.data() });
      }
    } catch (error) {
      console.error(`Error checking Firestore collection '${this.COLLECTION_NAME}':`, error);
    }
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = '';
    this.filteredOrders = []; // Clear previous results
    console.log('Loading orders with filters - Status:', this.statusFilter, 'Date:', this.dateFilter);

    this.fetchOrdersFromFirestore()
      .then(ordersData => {
        this.orders = ordersData.orders;
        console.log(`Successfully loaded ${this.orders.length} orders`);

        // Only update totalCount from Firestore if not filtering by search
        if (this.searchTerm.trim() === '') {
          this.totalCount = ordersData.totalCount;
        }

        this.applyFilters();
        // After filtering, totalCount should reflect filtered results
        this.totalCount = this.filteredOrders.length;
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error loading orders:', error);
        this.error = 'Failed to load orders. Please try again.';
        this.orders = [];
        this.filteredOrders = [];
        this.totalCount = 0;
        this.isLoading = false;

        // Log more details about the error for debugging
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
        }
      });
  }

  async fetchOrdersFromFirestore(): Promise<{ orders: any[], totalCount: number }> {
    try {
      const queryConstraints: QueryConstraint[] = [];
      let allOrders: any[] = [];

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
      if (!queryConstraints.some(qc => qc.toString().includes(this.sortBy))) {
        queryConstraints.push(orderBy(this.sortBy, this.sortDirection));
      }

      console.log('Base query constraints:', queryConstraints.map(c => c.toString()).join(', '));

      // Status filtering approach: If status filter is active, try different approaches
      if (this.statusFilter !== 'all') {
        console.log('Attempting status filtering with multiple approaches');

        // First try: Direct query with the status as-is
        const directQuery = query(
          collection(firestore, this.COLLECTION_NAME),
          ...queryConstraints,
          where('status', '==', this.statusFilter)
        );

        console.log('Executing direct status query...');
        const directResults = await getDocs(directQuery);

        if (directResults.size > 0) {
          console.log(`Direct status query successful with ${directResults.size} results`);
          directResults.forEach((doc) => {
            const data = doc.data();
            const createdAt = data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']);
            const updatedAt = data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']);

            allOrders.push({
              id: doc.id,
              ...data,
              createdAt,
              updatedAt,
              date: createdAt
            });
          });
        } else {
          console.log('Direct status query returned no results, trying lowercase status');

          // Second try: Lowercase status query
          const lowercaseQuery = query(
            collection(firestore, this.COLLECTION_NAME),
            ...queryConstraints,
            where('status', '==', this.statusFilter.toLowerCase())
          );

          const lowercaseResults = await getDocs(lowercaseQuery);

          if (lowercaseResults.size > 0) {
            console.log(`Lowercase status query successful with ${lowercaseResults.size} results`);
            lowercaseResults.forEach((doc) => {
              const data = doc.data();
              const createdAt = data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']);
              const updatedAt = data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']);

              allOrders.push({
                id: doc.id,
                ...data,
                createdAt,
                updatedAt,
                date: createdAt
              });
            });
          } else {
            console.log('Both status queries failed, fetching all orders and filtering client-side');

            // Fallback: Get all orders and filter client-side
            const baseQuery = query(
              collection(firestore, this.COLLECTION_NAME),
              ...queryConstraints
            );

            const baseResults = await getDocs(baseQuery);
            const tempAllOrders: any[] = [];

            baseResults.forEach((doc) => {
              const data = doc.data();
              const createdAt = data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']);
              const updatedAt = data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']);

              tempAllOrders.push({
                id: doc.id,
                ...data,
                createdAt,
                updatedAt,
                date: createdAt
              });
            });

            // Client-side case-insensitive status filtering
            allOrders = tempAllOrders.filter(order => {
              const orderStatus = (order.status || '').toLowerCase();
              const filterStatus = this.statusFilter.toLowerCase();
              return orderStatus === filterStatus;
            });

            console.log(`Client-side filtering found ${allOrders.length} matching orders`);
          }
        }
      } else {
        // No status filter, just get all orders with other constraints
        const allRecordsQuery = query(
          collection(firestore, this.COLLECTION_NAME),
          ...queryConstraints
        );

        console.log('Executing standard query without status filter...');
        const querySnapshot = await getDocs(allRecordsQuery);
        console.log(`Query returned ${querySnapshot.size} documents`);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']);
          const updatedAt = data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']);

          allOrders.push({
            id: doc.id,
            ...data,
            createdAt,
            updatedAt,
            date: createdAt
          });
        });
      }

      console.log(`Retrieved ${allOrders.length} orders total`);
      if (allOrders.length > 0) {
        console.log('Sample status values:', allOrders.slice(0, 3).map(o => o.status));
      }

      return { orders: allOrders, totalCount: allOrders.length };
    } catch (error) {
      console.error('Error fetching orders from Firestore:', error);
      this.error = 'Failed to load orders: ' + (error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  applyFilters(): void {
    let result = [...this.orders];
    console.log('Initial filter count:', result.length);

    // Apply search (client-side filter)
    if (this.searchTerm.trim() !== '') {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(order =>
        order.id.toLowerCase().includes(search) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(search)) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(search)) ||
        (order.customer?.phone && order.customer.phone.toLowerCase().includes(search))
      );

      // Reset to first page when filtering changes
      this.currentPage = 1;
      console.log('After search filter count:', result.length);
    }

    this.filteredOrders = result;
    this.totalCount = this.filteredOrders.length;

    // Log pagination values for debugging
    console.log('Filter applied - Total Count:', this.totalCount,
      'Items Per Page:', this.itemsPerPage,
      'Total Pages:', Math.ceil(this.totalCount / this.itemsPerPage),
      'Current Page:', this.currentPage);

    // Log status values to debug
    if (this.filteredOrders.length > 0) {
      const statuses = this.filteredOrders.map(order => order.status);
      const uniqueStatuses = [...new Set(statuses)];
      console.log('Status values in filtered results:', uniqueStatuses);
    }
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
    // For all scenarios (search, filter, or normal), we now need to paginate the filteredOrders
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredOrders.length);

    // Return the paginated subset of filtered orders
    return this.filteredOrders.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.totalCount === 0) return 1; // Always at least one page, even if empty
    return Math.ceil(this.totalCount / Math.max(1, this.itemsPerPage));
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // No need to reload from Firestore as we have all the data client-side now
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: number[] = [];
      pages.push(1); // Always include the first page

      for (let i = Math.max(2, this.currentPage - 1); i <= Math.min(totalPages - 1, this.currentPage + 1); i++) {
        pages.push(i);
      }

      pages.push(totalPages); // Always include the last page
      return [...new Set(pages)].sort((a, b) => a - b);
    }
  }

  // View Order Functions
  viewOrder(order: any): void {
    // Create a deep copy to avoid modifying the original data
    this.selectedOrder = JSON.parse(JSON.stringify(order));

    // Ensure charges are properly set for display
    if (!this.selectedOrder.packingCharges && this.selectedOrder.packingCharges !== 0) {
      this.selectedOrder.packingCharges = 15;
    }

    if (!this.selectedOrder.deliveryCharges && this.selectedOrder.deliveryCharges !== 0) {
      this.selectedOrder.deliveryCharges = 40;
    }

    // If there's no subtotal, calculate it from items
    if (!this.selectedOrder.subtotal) {
      this.selectedOrder.subtotal = this.calculateTotal(this.selectedOrder);
    }

    // Update total amount if needed
    if (!this.selectedOrder.tax && !this.selectedOrder.totalAmount) {
      // If we don't have tax or total, recalculate with new charges
      const subtotal = this.selectedOrder.subtotal || 0;
      const packingCharges = this.selectedOrder.packingCharges || 15;
      const deliveryCharges = this.selectedOrder.deliveryCharges || 40;
      this.selectedOrder.totalAmount = subtotal + packingCharges + deliveryCharges;
    }

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

    // Set default values for packing and delivery charges if not present
    if (!this.editedOrder.packingCharges && this.editedOrder.packingCharges !== 0) {
      this.editedOrder.packingCharges = 15;
    }

    if (!this.editedOrder.deliveryCharges && this.editedOrder.deliveryCharges !== 0) {
      this.editedOrder.deliveryCharges = 40;
    }

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

      // Calculate updated values
      const subtotal = Number(this.calculateTotal(this.editedOrder).toFixed(2));
      this.editedOrder.subtotal = subtotal;

      // Ensure packingCharges and deliveryCharges are numbers with default values and 2 decimal places
      this.editedOrder.packingCharges = this.editedOrder.packingCharges !== undefined ?
        Number(Number(this.editedOrder.packingCharges).toFixed(2)) : 15.00;

      this.editedOrder.deliveryCharges = this.editedOrder.deliveryCharges !== undefined ?
        Number(Number(this.editedOrder.deliveryCharges).toFixed(2)) : 40.00;

      // Set the new total amount with 2 decimal places
      const totalAmount = Number(this.calculateEditedOrderTotal().toFixed(2));
      this.editedOrder.totalAmount = totalAmount;

      // Remove tax field if it exists (migrating from old model)
      if ('tax' in this.editedOrder) {
        delete this.editedOrder.tax;
      }

      // Update Firestore document
      const orderRef = doc(firestore, this.COLLECTION_NAME, this.editedOrder.id);

      // Prepare data for update, omitting id field which is not stored in document
      const { id, ...updateData } = this.editedOrder;

      // Ensure status is lowercase for consistency in filtering
      if (updateData.status) {
        updateData.status = updateData.status.toLowerCase();
      }

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

    // Add order details
    message += `*Order Details:*\n`;

    // Add items if available
    if (order.items && order.items.length > 0) {
      message += `Items:\n`;
      order.items.forEach((item: any) => {
        const itemTotal = Number((item.price * item.quantity).toFixed(2));
        message += `- ${item.name} x${item.quantity}: ₹${itemTotal.toFixed(2)}\n`;
      });
      message += `\n`;
    }

    // Add price breakdown
    if (order.subtotal) {
      const subtotal = Number(order.subtotal.toFixed(2));
      message += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
    }

    // Use default values of 15 and 40 if not specified
    const packingCharges = order.packingCharges !== undefined ? Number(order.packingCharges.toFixed(2)) : 15.00;
    const deliveryCharges = order.deliveryCharges !== undefined ? Number(order.deliveryCharges.toFixed(2)) : 40.00;

    message += `Packing Charges: ₹${packingCharges.toFixed(2)}\n`;
    message += `Delivery Charges: ₹${deliveryCharges.toFixed(2)}\n`;

    // Add order total
    if (order.totalAmount) {
      const totalAmount = Number(order.totalAmount.toFixed(2));
      message += `*Order Total:* ₹${totalAmount.toFixed(2)}\n\n`;
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

  // Calculate total order value including packing and delivery charges
  calculateEditedOrderTotal(): number {
    if (!this.editedOrder) return 0;

    const subtotal = Number(this.calculateTotal(this.editedOrder).toFixed(2));
    const packingCharges = this.editedOrder.packingCharges !== undefined ?
      Number(Number(this.editedOrder.packingCharges).toFixed(2)) : 15.00;

    const deliveryCharges = this.editedOrder.deliveryCharges !== undefined ?
      Number(Number(this.editedOrder.deliveryCharges).toFixed(2)) : 40.00;

    return Number((subtotal + packingCharges + deliveryCharges).toFixed(2));
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered': return 'status-delivered';
      case 'shipped': return 'status-shipped';
      case 'processing': return 'status-processing';
      case 'confirmed': return 'status-confirmed';
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

  // Export functionality
  openExportModal(): void {
    this.showExportModal = true;
    this.exportPeriod = '1'; // Default to 1 month
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  async exportOrders(): Promise<void> {
    try {
      this.isLoading = true;

      // Get orders from the selected time period
      const exportOrders = await this.fetchOrdersForExport(this.exportPeriod);

      if (exportOrders.length === 0) {
        this.error = 'No orders found for the selected period.';
        setTimeout(() => {
          this.error = '';
        }, 3000);
        this.isLoading = false;
        this.closeExportModal();
        return;
      }

      // Define the headers separately with styling for bold
      const headers = [
        { v: 'Order ID', t: 's', s: { font: { bold: true } } },
        { v: 'Date', t: 's', s: { font: { bold: true } } },
        { v: 'Customer Name', t: 's', s: { font: { bold: true } } },
        { v: 'Customer Email', t: 's', s: { font: { bold: true } } },
        { v: 'Customer Phone', t: 's', s: { font: { bold: true } } },
        { v: 'Status', t: 's', s: { font: { bold: true } } },
        { v: 'Payment Status', t: 's', s: { font: { bold: true } } },
        { v: 'Payment Method', t: 's', s: { font: { bold: true } } },
        { v: 'Total Amount', t: 's', s: { font: { bold: true } } }
      ];

      // Format data for Excel
      const rows = exportOrders.map(order => [
        { v: order.id || '', t: 's' },
        { v: this.formatDate(order.createdAt), t: 's' },
        { v: order.customer?.name || '', t: 's' },
        { v: order.customer?.email || '', t: 's' },
        { v: order.customer?.phone || '', t: 's' },
        { v: order.status || '', t: 's' },
        { v: order.paymentStatus || '', t: 's' },
        { v: order.paymentMethod || '', t: 's' },
        { v: order.totalAmount?.toString() || '0', t: 's' }
      ]);

      // Create worksheet with data that includes headers first
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

      // Define column widths in characters
      const columnWidths = [
        { wch: 15 },  // Order ID
        { wch: 12 },  // Date
        { wch: 25 },  // Customer Name
        { wch: 30 },  // Customer Email
        { wch: 15 },  // Customer Phone
        { wch: 15 },  // Status
        { wch: 15 },  // Payment Status
        { wch: 15 },  // Payment Method
        { wch: 15 }   // Total Amount
      ];

      // Apply column widths
      worksheet['!cols'] = columnWidths;

      // Generate Excel file with proper options
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      });

      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders_export_${this.exportPeriod}_month${this.exportPeriod !== '1' ? 's' : ''}.xlsx`;
      link.click();

      this.success = `Successfully exported ${exportOrders.length} orders to Excel.`;
      setTimeout(() => {
        this.success = '';
      }, 3000);

      this.isLoading = false;
      this.closeExportModal();
    } catch (error) {
      console.error('Error exporting orders:', error);
      this.error = 'Failed to export orders. Please try again.';
      this.isLoading = false;
    }
  }

  private async fetchOrdersForExport(monthsPeriod: string): Promise<any[]> {
    try {
      // Calculate the date range
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthsAgo = new Date(today);
      monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(monthsPeriod));

      // Create the Firestore query
      const queryConstraints: QueryConstraint[] = [
        where('createdAt', '>=', monthsAgo),
        orderBy('createdAt', 'desc')
      ];

      const exportQuery = query(
        collection(firestore, this.COLLECTION_NAME),
        ...queryConstraints
      );

      const querySnapshot = await getDocs(exportQuery);
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
          date: createdAt
        });
      });

      return orders;
    } catch (error) {
      console.error('Error fetching orders for export:', error);
      throw error;
    }
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }

  // Helper function for debugging pagination
  // testPagination(): void {
  //   console.log({
  //     currentPage: this.currentPage,
  //     totalPages: this.totalPages,
  //     totalCount: this.totalCount,
  //     itemsPerPage: this.itemsPerPage,
  //     filteredOrdersLength: this.filteredOrders.length,
  //     paginatedOrdersLength: this.paginatedOrders.length,
  //     startIndex: (this.currentPage - 1) * this.itemsPerPage,
  //     endIndex: Math.min((this.currentPage - 1) * this.itemsPerPage + this.itemsPerPage, this.filteredOrders.length)
  //   });
  // }

  // Format charges to ensure they have two decimal places
  formatCharges(): void {
    if (this.editedOrder) {
      // Format packing charges to 2 decimal places
      if (this.editedOrder.packingCharges !== undefined) {
        this.editedOrder.packingCharges = Number(this.editedOrder.packingCharges.toFixed(2));
      }

      // Format delivery charges to 2 decimal places
      if (this.editedOrder.deliveryCharges !== undefined) {
        this.editedOrder.deliveryCharges = Number(this.editedOrder.deliveryCharges.toFixed(2));
      }

      // Update the total amount
      this.calculateEditedOrderTotal();
    }
  }
} 
