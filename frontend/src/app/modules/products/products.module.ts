import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { Product, ProductCategory } from '../../core/models/product.model';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

// Create a proper product list component
@Component({
  selector: 'app-product-list',
  template: `
    <div class="product-list-container">
      <!-- Header with navigation - same as home page -->
      <header class="main-header">
        <div class="container">
          <div class="header-content">
            <nav class="nav-links">
              <a routerLink="/chains" class="nav-link">Chains</a>
              <a routerLink="/pendants" class="nav-link">Pendants</a>
              <a routerLink="/create-combination" class="nav-link">Create Combination</a>
            </nav>
            <div class="right-actions">
              <a routerLink="/cart" class="cart-icon">
                <i class="material-icons">shopping_cart</i>
              </a>
              <a routerLink="/auth/login" class="login-btn">Login</a>
            </div>
          </div>
        </div>
      </header>

      <div class="container">
        <h2 class="page-title">{{pageTitle}}</h2>
        
        <div class="category-filters">
          <a routerLink="/products" [class.active]="!selectedCategory" class="filter-item">All Products</a>
          <a routerLink="/products" [queryParams]="{category: 'pendant'}" [class.active]="selectedCategory === 'pendant'" class="filter-item">Pendants</a>
          <a routerLink="/products" [queryParams]="{category: 'chain'}" [class.active]="selectedCategory === 'chain'" class="filter-item">Chains</a>
          <a routerLink="/products" [queryParams]="{category: 'combination'}" [class.active]="selectedCategory === 'combination'" class="filter-item">Combinations</a>
          <a routerLink="/products" [queryParams]="{category: 'accessory'}" [class.active]="selectedCategory === 'accessory'" class="filter-item">Accessories</a>
        </div>

        <div *ngIf="loading" class="loading">
          <div class="loader"></div>
          <p>Loading products...</p>
        </div>
        
        <div *ngIf="!loading && (products$ | async)?.length === 0" class="no-products">
          <div class="info-icon">
            <i class="material-icons">info</i>
          </div>
          <p>No products found in this category.</p>
        </div>
        
        <div class="product-grid">
          <div *ngFor="let product of products$ | async" class="product-card">
            <div class="product-image">
              <img [src]="product.imageUrl || 'assets/images/product-placeholder.jpg'" [alt]="product.name">
            </div>
            <div class="product-info">
              <h3 class="product-title">{{ product.name }}</h3>
              <p class="product-category">{{ product.category }}</p>
              <p class="product-price">₹{{ product.price }}</p>
              <div class="product-actions">
                <a [routerLink]="['/products', product._id]" class="btn-view">View Details</a>
                <button (click)="addToCart(product)" class="btn-primary">Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Use the same header styles as home component */
    .main-header {
      background-color: white;
      padding: 15px 0;
      border-bottom: 1px solid #eee;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .nav-links {
      display: flex;
      gap: 30px;
    }
    
    .nav-link {
      color: #333;
      text-decoration: none;
      font-size: 16px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      
      &:hover {
        color: #666;
      }
    }
    
    .right-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .cart-icon {
      color: #333;
      text-decoration: none;
    }
    
    .login-btn {
      display: inline-block;
      padding: 8px 16px;
      background-color: #4a4a4a;
      color: white;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      transition: background-color 0.3s ease;
      
      &:hover {
        background-color: #333;
      }
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    .product-list-container {
      min-height: 100vh;
      padding-bottom: 60px;
    }
    
    .page-title {
      font-size: 32px;
      margin: 40px 0 20px;
      font-family: 'DM Sans', sans-serif;
      font-weight: 600;
    }
    
    .category-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 30px;
    }
    
    .filter-item {
      padding: 8px 16px;
      background-color: #f0f0f0;
      border-radius: 12px;
      text-decoration: none;
      color: #333;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.3s ease;
    }
    
    .filter-item.active {
      background-color: #4a4a4a;
      color: white;
    }
    
    .filter-item:hover:not(.active) {
      background-color: #e0e0e0;
    }
    
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 30px;
    }
    
    .product-card {
      border-radius: 16px;
      overflow: hidden;
      background-color: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      }
    }
    
    .product-image {
      width: 100%;
      height: 200px;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 16px 16px 0 0;
      }
    }
    
    .product-info {
      padding: 20px;
    }
    
    .product-title {
      font-size: 18px;
      margin-bottom: 5px;
      font-family: 'DM Sans', sans-serif;
      font-weight: 600;
    }
    
    .product-category {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
      text-transform: capitalize;
      font-family: 'DM Sans', sans-serif;
    }
    
    .product-price {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 15px;
      font-family: 'DM Sans', sans-serif;
    }
    
    .product-actions {
      display: flex;
      gap: 10px;
    }
    
    .btn-view {
      display: inline-block;
      padding: 8px 16px;
      background-color: #333;
      color: white;
      border-radius: 12px;
      text-decoration: none;
      text-align: center;
      transition: all 0.3s ease;
      font-family: 'DM Sans', sans-serif;
      
      &:hover {
        background-color: #555;
      }
    }
    
    .btn-primary {
      display: inline-block;
      padding: 8px 16px;
      background-color: #4a4a4a;
      color: white;
      border-radius: 12px;
      border: none;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: #333;
      }
    }
    
    .loading {
      text-align: center;
      padding: 60px 0;
      color: #666;
      font-family: 'DM Sans', sans-serif;
    }
    
    .loader {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #4a4a4a;
      border-radius: 50%;
      margin-bottom: 15px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .no-products {
      text-align: center;
      padding: 60px 0;
      color: #666;
      font-family: 'DM Sans', sans-serif;
    }
    
    .info-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 15px;
      
      i {
        font-size: 40px;
        color: #999;
      }
    }
    
    @media (max-width: 768px) {
      .product-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .category-filters {
        overflow-x: auto;
        padding-bottom: 10px;
        justify-content: flex-start;
        flex-wrap: nowrap;
      }
    }
    
    @media (max-width: 576px) {
      .product-grid {
        grid-template-columns: 1fr;
      }
      
      .product-actions {
        flex-direction: column;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, RouterModule, NgFor, NgIf, AsyncPipe]
})
export class ProductListComponent implements OnInit {
  products$: Observable<Product[]>;
  loading = true;
  selectedCategory: ProductCategory | null = null;
  pageTitle = 'All Products';

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute
  ) {
    // Initialize with all products
    this.products$ = this.productService.getAllProducts().pipe(
      map(response => response.products)
    );
  }

  ngOnInit(): void {
    // Get category from query params
    this.route.queryParams.subscribe(params => {
      this.selectedCategory = params['category'] as ProductCategory || null;
      this.loadProducts();

      // Update page title based on category
      if (this.selectedCategory) {
        this.pageTitle = this.formatCategoryTitle(this.selectedCategory);
      } else {
        this.pageTitle = 'All Products';
      }
    });
  }

  loadProducts(): void {
    this.loading = true;

    if (this.selectedCategory) {
      this.products$ = this.productService.getProductsByCategory(this.selectedCategory).pipe(
        map(response => response.products)
      );
    } else {
      this.products$ = this.productService.getAllProducts().pipe(
        map(response => response.products)
      );
    }

    // Simulate loading delay for better UX
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  addToCart(product: Product): void {
    // Implement add to cart functionality
    console.log('Adding to cart:', product);
    alert(`Added ${product.name} to cart!`);
  }

  formatCategoryTitle(category: ProductCategory): string {
    // Convert 'pendant' to 'Pendants', etc.
    const formatted = category.charAt(0).toUpperCase() + category.slice(1);
    return formatted + 's';
  }
}

const routes: Routes = [
  { path: '', component: ProductListComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ProductListComponent
  ]
})
export class ProductsModule { } 
