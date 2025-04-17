import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { environment } from '../../../environments/environment';
import { Cart, CartItem, WhatsAppRedirect } from '../models/cart.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;
  private cartSubject = new BehaviorSubject<Cart>({
    items: [],
    subtotal: 0,
    tax: 0,
    totalAmount: 0
  });

  cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCartFromStorage();
  }

  getCart(): Cart {
    return this.cartSubject.value;
  }

  addToCart(product: Product, quantity: number = 1, isCombo: boolean = false, pendantProduct?: Product, chainProduct?: Product): void {
    const cart = this.getCart();
    let cartId: string;

    // For combination products
    if (isCombo && pendantProduct && chainProduct) {
      cartId = uuidv4();
      const newItem: CartItem = {
        id: cartId,
        product,
        quantity,
        isCombo,
        pendantProduct,
        chainProduct
      };
      cart.items.push(newItem);
    } else {
      // Check if product is already in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.product._id === product._id && !item.isCombo
      );

      if (existingItemIndex >= 0) {
        // Increase quantity of existing item
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        cartId = uuidv4();
        const newItem: CartItem = {
          id: cartId,
          product,
          quantity,
          isCombo: false
        };
        cart.items.push(newItem);
      }
    }

    this.updateCartTotals(cart);
    this.cartSubject.next(cart);
    this.saveCartToStorage();
  }

  updateItemQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(itemId);
      return;
    }

    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(item => item.id === itemId);

    if (itemIndex >= 0) {
      cart.items[itemIndex].quantity = quantity;
      this.updateCartTotals(cart);
      this.cartSubject.next(cart);
      this.saveCartToStorage();
    }
  }

  removeFromCart(itemId: string): void {
    const cart = this.getCart();
    cart.items = cart.items.filter(item => item.id !== itemId);
    this.updateCartTotals(cart);
    this.cartSubject.next(cart);
    this.saveCartToStorage();
  }

  clearCart(): void {
    const emptyCart: Cart = {
      items: [],
      subtotal: 0,
      tax: 0,
      totalAmount: 0
    };
    this.cartSubject.next(emptyCart);
    localStorage.removeItem('cart');
  }

  updateCartCheckout(checkoutDetails: {
    name: string;
    email: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    }
  }): void {
    const cart = this.getCart();
    cart.checkout = checkoutDetails;
    this.cartSubject.next(cart);
    this.saveCartToStorage();
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

  private updateCartTotals(cart: Cart): void {
    // Calculate subtotal
    cart.subtotal = cart.items.reduce((total, item) => {
      if (item.isCombo) {
        // For combination items, sum the prices of pendant and chain
        const pendantPrice = item.pendantProduct ? item.pendantProduct.price : 0;
        const chainPrice = item.chainProduct ? item.chainProduct.price : 0;
        return total + ((pendantPrice + chainPrice) * item.quantity);
      } else {
        return total + (item.product.price * item.quantity);
      }
    }, 0);

    // Calculate tax (18% GST for India)
    cart.tax = cart.subtotal * 0.18;

    // Calculate total amount
    cart.totalAmount = cart.subtotal + cart.tax;
  }

  private saveCartToStorage(): void {
    localStorage.setItem('cart', JSON.stringify(this.cartSubject.value));
  }

  private loadCartFromStorage(): void {
    try {
      const cartJson = localStorage.getItem('cart');
      if (cartJson) {
        const cart: Cart = JSON.parse(cartJson);
        this.cartSubject.next(cart);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      localStorage.removeItem('cart');
    }
  }
} 
