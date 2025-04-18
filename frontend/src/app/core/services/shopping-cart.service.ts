import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Simplified cart item interface
export interface ShoppingCartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShoppingCartService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;
  private cartItems: ShoppingCartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<ShoppingCartItem[]>([]);
  private cartCountSubject = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {
    // Try to load cart from localStorage on init
    this.loadCart();
  }

  // Get cart items as observable
  getCartItems(): Observable<ShoppingCartItem[]> {
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
  addItem(item: ShoppingCartItem): void {
    const existingItem = this.cartItems.find(cartItem => cartItem._id === item._id);

    if (existingItem) {
      existingItem.quantity += item.quantity || 1;
    } else {
      // Ensure quantity is at least 1
      const newItem = { ...item, quantity: item.quantity || 1 };
      this.cartItems.push(newItem);
    }

    this.updateCart();
  }

  // Check if item is in cart
  isInCart(productId: string): boolean {
    return this.cartItems.some(item => item._id === productId);
  }

  // Get quantity of an item in cart
  getQuantity(productId: string): number {
    const cartItem = this.cartItems.find(item => item._id === productId);
    return cartItem ? cartItem.quantity : 0;
  }

  // Add to cart with quantity 1
  addToCart(item: ShoppingCartItem): void {
    this.addItem({ ...item, quantity: 1 });
  }

  // Remove an item from cart
  removeItem(productId: string): void {
    this.cartItems = this.cartItems.filter(item => item._id !== productId);
    this.updateCart();
  }

  // Decrease quantity of an item in cart
  decreaseQuantity(productId: string): void {
    const cartItem = this.cartItems.find(item => item._id === productId);

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
      `${item.name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const totalAmount = this.cartItems.reduce((total, item) =>
      total + (item.price * item.quantity), 0
    );

    const message = `New Order:\n${cartContent}\n\nTotal: ₹${totalAmount.toFixed(2)}`;

    return this.http.post<any>(`${this.apiUrl}/send`, {
      phoneNumber,
      message
    });
  }

  // Private method to update cart in localStorage and notify subscribers
  private updateCart(): void {
    localStorage.setItem('shopping-cart', JSON.stringify(this.cartItems));
    this.cartItemsSubject.next([...this.cartItems]);
    this.cartCountSubject.next(this.getCurrentCartCount());
  }

  // Private method to load cart from localStorage
  private loadCart(): void {
    const savedCart = localStorage.getItem('shopping-cart');
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
} 
