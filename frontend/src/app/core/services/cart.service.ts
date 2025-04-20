import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, from, of, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { map, switchMap } from 'rxjs/operators';

import { Cart, CartItem, WhatsAppRedirect } from '../models/cart.model';
import { Product } from '../models/product.model';
import { auth, firestore } from '../../app.config';

// No duplicate interface needed

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartCountSubject = new BehaviorSubject<number>(0);
  private readonly COLLECTION_NAME = 'orders';

  constructor() {
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

  // Send order to WhatsApp using Firebase Cloud Functions
  sendToWhatsApp(phoneNumber: string): Observable<any> {
    const currentUser = auth.currentUser;

    if (!currentUser && this.cartItems.length === 0) {
      return throwError(() => new Error('No items in cart or user not authenticated'));
    }

    const cartData = {
      items: this.cartItems,
      userId: currentUser?.uid || 'anonymous',
      phoneNumber,
      createdAt: new Date(),
      status: 'pending'
    };

    return from(addDoc(collection(firestore, 'whatsapp_orders'), cartData)).pipe(
      catchError(error => {
        console.error('Send to WhatsApp error:', error);
        return throwError(() => new Error(error.message || 'Failed to send WhatsApp message'));
      })
    );
  }

  // Send existing order to WhatsApp
  sendOrderToWhatsApp(orderId: string): Observable<{ success: boolean, message: string, conversationId: string, whatsappLink: string }> {
    return from(getDoc(doc(firestore, this.COLLECTION_NAME, orderId))).pipe(
      switchMap(orderDoc => {
        if (!orderDoc.exists()) {
          return throwError(() => new Error('Order not found'));
        }

        const orderData = orderDoc.data();
        const whatsappLink = `https://wa.me/${orderData['customer']?.phone}?text=${encodeURIComponent(this.generateOrderWhatsAppMessage(orderData))}`;
        const conversationId = uuidv4();

        // Update order in firestore with WhatsApp info
        return from(updateDoc(doc(firestore, this.COLLECTION_NAME, orderId), {
          'whatsapp': {
            messageSent: true,
            conversationId: conversationId,
            lastMessageTimestamp: new Date()
          }
        })).pipe(
          map(() => ({
            success: true,
            message: 'WhatsApp message link generated',
            conversationId: conversationId,
            whatsappLink
          }))
        );
      }),
      catchError(error => {
        console.error('Send order to WhatsApp error:', error);
        return throwError(() => new Error(error.message || 'Failed to send WhatsApp message'));
      })
    );
  }

  // Private method to update cart in localStorage and notify subscribers
  private updateCart(): void {
    this.logOperation('updateCart', { count: this.getCurrentCartCount(), items: this.cartItems.length });
    localStorage.setItem('cart', JSON.stringify(this.cartItems));
    this.cartItemsSubject.next([...this.cartItems]);
    this.cartCountSubject.next(this.getCurrentCartCount());

    // If user is authenticated, save cart to Firestore
    const currentUser = auth.currentUser;
    if (currentUser) {
      this.saveCartToFirestore(currentUser.uid);
    }
  }

  // Private method to load cart from localStorage
  private loadCart(): void {
    // First try to load from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        this.cartItems = JSON.parse(savedCart);
        this.cartItemsSubject.next([...this.cartItems]);
        this.cartCountSubject.next(this.getCurrentCartCount());
      } catch (e) {
        console.error('Error loading cart from localStorage', e);
        this.cartItems = [];
      }
    }

    // If user is authenticated, try to merge with their Firestore cart
    const currentUser = auth.currentUser;
    if (currentUser) {
      this.loadCartFromFirestore(currentUser.uid);
    }
  }

  // Save cart to Firestore
  private async saveCartToFirestore(userId: string): Promise<void> {
    try {
      await setDoc(doc(firestore, 'carts', userId), {
        items: this.cartItems,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving cart to Firestore:', error);
    }
  }

  // Load cart from Firestore
  private async loadCartFromFirestore(userId: string): Promise<void> {
    try {
      const cartDoc = await getDoc(doc(firestore, 'carts', userId));

      if (cartDoc.exists()) {
        const firestoreCart = cartDoc.data() as { items: CartItem[] };

        // Merge with local cart (add items that don't exist locally)
        const localProductIds = this.cartItems.map(item => item.product?._id);

        firestoreCart.items.forEach(firestoreItem => {
          if (firestoreItem.product && !localProductIds.includes(firestoreItem.product._id)) {
            this.cartItems.push(firestoreItem);
          }
        });

        this.updateCart();
      }
    } catch (error) {
      console.error('Error loading cart from Firestore:', error);
    }
  }

  getWhatsAppRedirectUrl(orderId: string): Observable<WhatsAppRedirect> {
    return from(getDoc(doc(firestore, 'whatsapp_orders', orderId))).pipe(
      catchError(error => {
        console.error('Get WhatsApp redirect error:', error);
        return throwError(() => new Error(error.message || 'Failed to generate WhatsApp link'));
      }),
      map(docSnap => {
        if (!docSnap.exists()) {
          throw new Error('Order not found');
        }

        const data = docSnap.data();
        return {
          redirectUrl: `https://wa.me/${data['phoneNumber']}?text=${encodeURIComponent(this.generateWhatsAppMessage(data['items']))}`,
          orderId: docSnap.id,
          customerName: data['customerName'] || 'Customer'
        };
      })
    );
  }

  // Helper method to generate WhatsApp message
  private generateWhatsAppMessage(items: CartItem[]): string {
    const cartContent = items.map(item =>
      `${item.product?.name} x ${item.quantity} - ₹${((item.product?.price || 0) * item.quantity).toFixed(2)}`
    ).join('\n');

    const totalAmount = items.reduce((total, item) =>
      total + ((item.product?.price || 0) * item.quantity), 0
    );

    return `New Order:\n${cartContent}\n\nTotal: ₹${totalAmount.toFixed(2)}`;
  }

  // Helper method to generate WhatsApp message for an order
  private generateOrderWhatsAppMessage(orderData: any): string {
    const items = orderData['items'] || [];
    const customer = orderData['customer'] || {};

    let message = `*New Order #${orderData['_id'] || ''}*\n\n`;
    message += `*Customer:* ${customer.name || 'N/A'}\n`;
    message += `*Phone:* ${customer.phone || 'N/A'}\n\n`;
    message += `*Items:*\n`;

    items.forEach((item: any) => {
      message += `- ${item.name || 'Product'} x ${item.quantity || 1} - ₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}\n`;
    });

    message += `\n*Total:* ₹${orderData['totalAmount']?.toFixed(2) || '0.00'}\n`;
    message += `*Status:* ${orderData['status'] || 'pending'}\n`;

    return message;
  }
} 
