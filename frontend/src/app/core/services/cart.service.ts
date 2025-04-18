import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { environment } from '../../../environments/environment';
import { Cart, CartItem, WhatsAppRedirect } from '../models/cart.model';
import { Product } from '../models/product.model';

// No duplicate interface needed

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;
  private cartItems: CartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartCountSubject = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {
    console.log('CartService initialized');
    // Try to load cart from localStorage on init
    this.loadCart();
  }

  // Get cart items as observable
  getCartItems(): Observable<CartItem[]> {
    return this.cartItemsSubject.asObservable();
  }

  // Get cart count as observable
  getCartCount(): Observable<number> {
    return this.cartCountSubject.asObservable();
  }

  // Get current cart count
  getCurrentCartCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  // Add item to cart
  addItem(item: CartItem): void {
    const existingItem = this.cartItems.find(cartItem => cartItem.id === item.id);

    if (existingItem) {
      existingItem.quantity += item.quantity || 1;
    } else {
      // Ensure quantity is at least 1
      const newItem = { ...item, quantity: item.quantity || 1 };
      this.cartItems.push(newItem);
    }

    this.updateCart();
  }

  // Static utility to log cart operations for debugging
  private logOperation(operation: string, item?: any): void {
    console.log(`Cart operation: ${operation}`, item || '');
  }

  // Check if item is in cart
  isInCart(productId: string): boolean {
    const found = this.cartItems.some(item => item.product?._id === productId);
    this.logOperation(`isInCart(${productId}): ${found}`);
    return found;
  }

  // Get quantity of an item in cart
  getQuantity(productId: string): number {
    const cartItem = this.cartItems.find(item => item.product?._id === productId);
    const quantity = cartItem ? cartItem.quantity : 0;
    this.logOperation(`getQuantity(${productId}): ${quantity}`);
    return quantity;
  }

  // Add to cart with quantity 1
  addToCart(product: Product): void {
    this.logOperation('addToCart', product);

    const cartItem: CartItem = {
      id: uuidv4(),
      product,
      quantity: 1,
      isCombo: false
    };
    this.addItem(cartItem);
  }

  // Remove an item from cart
  removeItem(productId: string): void {
    this.cartItems = this.cartItems.filter(item => item.product?._id !== productId);
    this.updateCart();
  }

  // Decrease quantity of an item in cart
  decreaseQuantity(productId: string): void {
    const cartItem = this.cartItems.find(item => item.product?._id === productId);

    if (cartItem) {
      if (cartItem.quantity > 1) {
        cartItem.quantity--;
      } else {
        this.removeItem(productId);
        return;
      }

      this.updateCart();
    }
  }

  // Clear the cart
  clearCart(): void {
    this.cartItems = [];
    this.updateCart();
  }

  // Send order to WhatsApp
  sendToWhatsApp(phoneNumber: string): Observable<any> {
    const cartContent = this.cartItems.map(item =>
      `${item.product?.name} x ${item.quantity} - ₹${(item.product?.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const totalAmount = this.cartItems.reduce((total, item) =>
      total + ((item.product?.price || 0) * item.quantity), 0
    );

    const message = `New Order:\n${cartContent}\n\nTotal: ₹${totalAmount.toFixed(2)}`;

    return this.http.post<any>(`${this.apiUrl}/send`, {
      phoneNumber,
      message
    });
  }

  // Private method to update cart in localStorage and notify subscribers
  private updateCart(): void {
    this.logOperation('updateCart', { count: this.getCurrentCartCount(), items: this.cartItems.length });
    localStorage.setItem('cart', JSON.stringify(this.cartItems));
    this.cartItemsSubject.next([...this.cartItems]);
    this.cartCountSubject.next(this.getCurrentCartCount());
  }

  // Private method to load cart from localStorage
  private loadCart(): void {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        this.cartItems = JSON.parse(savedCart);
        this.cartItemsSubject.next([...this.cartItems]);
        this.cartCountSubject.next(this.getCurrentCartCount());
      } catch (e) {
        console.error('Error loading cart from localStorage', e);
        this.cartItems = [];
        this.updateCart();
      }
    }
  }

  getWhatsAppRedirectUrl(orderId: string): Observable<WhatsAppRedirect> {
    return this.http.get<WhatsAppRedirect>(`${this.apiUrl}/redirect/${orderId}`).pipe(
      catchError(error => {
        console.error('Get WhatsApp redirect error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to generate WhatsApp link'));
      })
    );
  }

  sendOrderToWhatsApp(orderId: string): Observable<{ success: boolean, message: string, conversationId: string, whatsappLink: string }> {
    return this.http.post<{ success: boolean, message: string, conversationId: string, whatsappLink: string }>(
      `${this.apiUrl}/send-order`,
      { orderId }
    ).pipe(
      catchError(error => {
        console.error('Send order to WhatsApp error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to send WhatsApp message'));
      })
    );
  }
} 
