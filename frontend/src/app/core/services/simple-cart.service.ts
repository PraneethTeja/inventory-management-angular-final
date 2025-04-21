import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SimpleCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  type?: 'chain' | 'pendant' | 'combination' | string;
  productCode?: string;
  chainDetails?: {
    name: string;
    productCode?: string;
    price?: number;
    type?: string;
    size?: string;
    layer?: string;
  };
  pendantDetails?: Array<{
    name: string;
    productCode?: string;
    quantity: number;
    price?: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class SimpleCartService {
  private cartItems: SimpleCartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<SimpleCartItem[]>([]);
  private cartCountSubject = new BehaviorSubject<number>(0);

  constructor() {
    console.log('SimpleCartService initialized');
    this.loadCart();
  }

  getCartItems(): Observable<SimpleCartItem[]> {
    return this.cartItemsSubject.asObservable();
  }

  getCartCount(): Observable<number> {
    return this.cartCountSubject.asObservable();
  }

  getCurrentCartCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  addToCart(product: any): void {
    console.log('SimpleCartService.addToCart', product);

    const existingItem = this.cartItems.find(item => item.productId === product._id);

    if (existingItem) {
      existingItem.quantity += 1;
      console.log('Updated quantity for existing item', existingItem);
    } else {
      const newItem: SimpleCartItem = {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl || ''
      };
      this.cartItems.push(newItem);
      console.log('Added new item to cart', newItem);
    }

    this.updateCart();
  }

  isInCart(productId: string): boolean {
    const result = this.cartItems.some(item => item.productId === productId);
    console.log('SimpleCartService.isInCart', productId, result);
    return result;
  }

  getQuantity(productId: string): number {
    const item = this.cartItems.find(item => item.productId === productId);
    const quantity = item ? item.quantity : 0;
    console.log('SimpleCartService.getQuantity', productId, quantity);
    return quantity;
  }

  removeFromCart(productId: string): void {
    console.log('SimpleCartService.removeFromCart', productId);
    this.cartItems = this.cartItems.filter(item => item.productId !== productId);
    this.updateCart();
  }

  decreaseQuantity(productId: string): void {
    console.log('SimpleCartService.decreaseQuantity', productId);
    const item = this.cartItems.find(item => item.productId === productId);

    if (item) {
      if (item.quantity > 1) {
        item.quantity--;
        console.log('Decreased quantity', item);
      } else {
        this.removeFromCart(productId);
        return;
      }

      this.updateCart();
    }
  }

  clearCart(): void {
    console.log('SimpleCartService.clearCart');
    this.cartItems = [];
    this.updateCart();
  }

  private updateCart(): void {
    console.log('SimpleCartService.updateCart', {
      itemCount: this.cartItems.length,
      totalQuantity: this.getCurrentCartCount()
    });

    localStorage.setItem('simple-cart', JSON.stringify(this.cartItems));
    this.cartItemsSubject.next([...this.cartItems]);
    this.cartCountSubject.next(this.getCurrentCartCount());
  }

  private loadCart(): void {
    const savedCart = localStorage.getItem('simple-cart');
    if (savedCart) {
      try {
        this.cartItems = JSON.parse(savedCart);
        console.log('SimpleCartService.loadCart - Loaded from localStorage', this.cartItems);
        this.cartItemsSubject.next([...this.cartItems]);
        this.cartCountSubject.next(this.getCurrentCartCount());
      } catch (e) {
        console.error('Error loading cart from localStorage', e);
        this.cartItems = [];
        this.updateCart();
      }
    } else {
      console.log('SimpleCartService.loadCart - No saved cart found');
    }
  }
} 
