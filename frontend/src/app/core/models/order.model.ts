import { User } from './user.model';
import { Product, ProductCategory } from './product.model';

export interface Order {
  _id: string;
  customer: Customer;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  whatsapp: WhatsAppDetails;
  trackingInfo?: TrackingInfo;
  notes?: string;
  createdBy?: string | User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  address?: Address;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
}

export interface OrderItem {
  product: string | Product;
  name: string;
  quantity: number;
  price: number;
  category: ProductCategory;
  imageUrl?: string;
  combinationDetails?: CombinationDetails;
}

export interface CombinationDetails {
  isCombo: boolean;
  pendantInfo?: {
    id: string;
    name: string;
    price: number;
  };
  chainInfo?: {
    id: string;
    name: string;
    price: number;
  };
}

export interface WhatsAppDetails {
  messageSent: boolean;
  conversationId?: string;
  lastMessageTimestamp?: Date;
}

export interface TrackingInfo {
  carrier?: string;
  trackingNumber?: string;
  expectedDelivery?: Date;
  url?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'canceled';
export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'upi' | 'wallet';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface OrderStats {
  totalOrders: number;
  statusCounts: {
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    canceled: number;
  };
  recentOrders: Order[];
  totalRevenue: number;
} 
