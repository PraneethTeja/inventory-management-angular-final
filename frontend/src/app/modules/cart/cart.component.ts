import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SimpleCartService, SimpleCartItem } from '../../core/services/simple-cart.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent],
  template: `
    <div class="cart-page-container">
      <app-navbar [activePage]="'cart'" [cartItemCount]="cartItems.length"></app-navbar>
      
      <div class="container">
        <div class="cart-header">
          <h1>Your Shopping Cart</h1>
          <p *ngIf="cartItems.length > 0">{{ cartItems.length }} {{ cartItems.length === 1 ? 'item' : 'items' }} in your cart</p>
        </div>
        
        <div *ngIf="cartItems.length === 0" class="empty-cart">
          <div class="empty-cart-icon">
            <i class="fas fa-shopping-cart"></i>
          </div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any items to your cart yet.</p>
          <button routerLink="/shop" class="btn-primary">Continue Shopping</button>
        </div>
        
        <div *ngIf="cartItems.length > 0" class="cart-content">
          <div class="cart-items">
            <div *ngFor="let item of cartItems" class="cart-item">
              <div class="item-image">
                <img [src]="item.imageUrl || 'assets/images/placeholder.jpg'" [alt]="item.name">
              </div>
              <div class="item-details">
                <h3>{{ item.name }}</h3>
                <p class="item-price">{{ item.price | currency:'INR' }}</p>
              </div>
              <div class="item-quantity">
                <button (click)="decreaseQuantity(item.productId)" class="qty-btn">
                  <i class="fas fa-minus"></i>
                </button>
                <span class="qty-value">{{ item.quantity }}</span>
                <button (click)="increaseQuantity(item.productId)" class="qty-btn">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
              <div class="item-total">
                {{ (item.price * item.quantity) | currency:'INR' }}
              </div>
              <button (click)="removeItem(item.productId)" class="remove-item">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div class="cart-summary">
            <h3>Order Summary</h3>
            <div class="summary-row">
              <span>Subtotal</span>
              <span>{{ subtotal | currency:'INR' }}</span>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <span>{{ shipping | currency:'INR' }}</span>
            </div>
            <div class="summary-row">
              <span>Tax (18%)</span>
              <span>{{ tax | currency:'INR' }}</span>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <span>{{ total | currency:'INR' }}</span>
            </div>
            <button class="checkout-btn">Proceed to Checkout</button>
            <button routerLink="/shop" class="continue-shopping">Continue Shopping</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cart-page-container {
      min-height: 100vh;
      background-color: var(--bg-secondary);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 90px 1rem 2rem;
    }
    
    .cart-header {
      margin-bottom: 2rem;
      text-align: center;
    }
    
    .cart-header h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: var(--primary);
    }
    
    .empty-cart {
      text-align: center;
      padding: 3rem 0;
    }
    
    .empty-cart-icon {
      font-size: 4rem;
      color: var(--text-light);
      margin-bottom: 1rem;
    }
    
    .empty-cart h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-dark);
    }
    
    .empty-cart p {
      margin-bottom: 2rem;
      color: var(--text-medium);
    }
    
    .cart-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }
    
    .cart-items {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .cart-item {
      display: grid;
      grid-template-columns: 100px 2fr 1fr 1fr auto;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #eee;
    }
    
    .item-image img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
    }
    
    .item-details h3 {
      font-size: 1rem;
      margin-bottom: 0.5rem;
      color: var(--text-dark);
    }
    
    .item-price {
      color: var(--text-medium);
    }
    
    .item-quantity {
      display: flex;
      align-items: center;
    }
    
    .qty-btn {
      width: 30px;
      height: 30px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .qty-btn:hover {
      background: var(--accent-light);
    }
    
    .qty-value {
      margin: 0 0.75rem;
      font-weight: 500;
      color: var(--text-dark);
    }
    
    .item-total {
      font-weight: 500;
      color: var(--primary);
    }
    
    .remove-item {
      background: none;
      border: none;
      color: var(--error);
      cursor: pointer;
      padding: 0.5rem;
    }
    
    .remove-item:hover {
      color: #ff0000;
    }
    
    .cart-summary {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 1.5rem;
      align-self: start;
    }
    
    .cart-summary h3 {
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #eee;
      color: var(--primary);
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      color: var(--text-medium);
    }
    
    .summary-row.total {
      font-weight: 700;
      font-size: 1.2rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      color: var(--text-dark);
    }
    
    .checkout-btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 1rem;
      border-radius: 4px;
      width: 100%;
      font-size: 1rem;
      font-weight: 500;
      margin-top: 1.5rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .checkout-btn:hover {
      background: var(--primary-dark);
    }
    
    .continue-shopping {
      background: none;
      border: 1px solid var(--accent);
      color: var(--accent-dark);
      padding: 0.75rem;
      border-radius: 4px;
      width: 100%;
      font-size: 0.9rem;
      margin-top: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .continue-shopping:hover {
      background: var(--accent-light);
      color: var(--accent-dark);
    }
    
    @media (max-width: 768px) {
      .cart-content {
        grid-template-columns: 1fr;
      }
      
      .cart-item {
        grid-template-columns: 80px 1fr;
        grid-template-rows: auto auto auto;
        gap: 0.5rem;
      }
      
      .item-image {
        grid-row: 1 / 4;
        align-self: center;
      }
      
      .item-details {
        grid-column: 2;
        grid-row: 1;
      }
      
      .item-quantity {
        grid-column: 2;
        grid-row: 2;
      }
      
      .item-total {
        grid-column: 2;
        grid-row: 3;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .remove-item {
        grid-column: 2;
        grid-row: 3;
        justify-self: end;
      }
    }
  `]
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: SimpleCartItem[] = [];
  private subscription: Subscription = new Subscription();

  subtotal: number = 0;
  shipping: number = 0;
  tax: number = 0;
  total: number = 0;

  constructor(private cartService: SimpleCartService) { }

  ngOnInit(): void {
    console.log('CartComponent initialized');

    // Subscribe to cart items
    this.subscription.add(
      this.cartService.getCartItems().subscribe(items => {
        console.log('Cart items updated:', items);
        this.cartItems = items;
        this.updateTotals();
      })
    );
  }

  updateTotals(): void {
    // Calculate subtotal
    this.subtotal = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate shipping (free for orders over 1000 INR)
    this.shipping = this.subtotal > 1000 ? 0 : 99;

    // Calculate tax (18% GST)
    this.tax = this.subtotal * 0.18;

    // Calculate total
    this.total = this.subtotal + this.shipping + this.tax;
  }

  increaseQuantity(productId: string): void {
    // Find the product in the cart
    const item = this.cartItems.find(item => item.productId === productId);
    if (item) {
      // Create a dummy product to pass to addToCart
      const product = {
        _id: productId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl
      };

      this.cartService.addToCart(product);
    }
  }

  decreaseQuantity(productId: string): void {
    this.cartService.decreaseQuantity(productId);
  }

  removeItem(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
} 
