import { Product } from './product.model';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  isCombo: boolean;
  pendantProduct?: Product;
  chainProduct?: Product;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  checkout?: {
    email: string;
    name: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    }
  };
}

export interface WhatsAppRedirect {
  redirectUrl: string;
  orderId: string;
  customerName: string;
} 
