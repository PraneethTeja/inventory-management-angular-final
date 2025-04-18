import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { Product, ProductCategory, ProductDiscount } from '../../core/models/product.model';
import { ViewportScroller } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent]
})
export class ProductListComponent implements OnInit, OnDestroy {
  products$: Observable<Product[]>;
  filteredProducts$: Observable<Product[]>;
  allProducts: Product[] = [];
  loading = true;
  loadingMore = false;
  selectedCategory: ProductCategory | null = null;
  pageTitle = 'All Products';
  searchTerm = '';
  cartItemCount = 0;
  mobileMenuOpen = false;
  currentPage = 1;
  itemsPerPage = 12;
  hasMoreProducts = true;

  // Mock data
  mockProducts: Product[] = [
    {
      _id: '1',
      name: 'Gold Chain Necklace',
      category: 'chain',
      price: 12999,
      description: 'Elegant gold chain with modern design',
      inStock: true,
      imageUrl: 'assets/images/product-1.jpg',
      discount: { percentage: 10 },
      tags: ['gold', 'chain', 'bestseller'],
      productCode: 'GCN001',
      stockQuantity: 15
    },
    {
      _id: '2',
      name: 'Silver Pendant',
      category: 'pendant',
      price: 4999,
      description: 'Beautiful silver pendant with floral design',
      inStock: true,
      imageUrl: 'assets/images/product-2.jpg',
      tags: ['silver', 'pendant'],
      productCode: 'SP001',
      stockQuantity: 8
    },
    {
      _id: '3',
      name: 'Diamond Pendant',
      category: 'pendant',
      price: 19999,
      description: 'Exquisite diamond pendant with 18k gold setting',
      inStock: true,
      imageUrl: 'assets/images/product-3.jpg',
      discount: { percentage: 5 },
      tags: ['diamond', 'pendant', 'luxury'],
      productCode: 'DP001',
      stockQuantity: 3
    },
    {
      _id: '4',
      name: 'Rose Gold Chain',
      category: 'chain',
      price: 8999,
      description: 'Delicate rose gold chain, perfect for layering',
      inStock: true,
      imageUrl: 'assets/images/product-4.jpg',
      tags: ['rose gold', 'chain'],
      productCode: 'RGC001',
      stockQuantity: 10
    },
    {
      _id: '5',
      name: 'Pearl Pendant Set',
      category: 'accessory',
      price: 15999,
      description: 'Luxurious pearl pendant with matching earrings',
      inStock: true,
      imageUrl: 'assets/images/product-5.jpg',
      discount: { percentage: 15 },
      tags: ['pearl', 'set', 'pendant'],
      productCode: 'PPS001',
      stockQuantity: 5
    },
    {
      _id: '6',
      name: 'Platinum Chain',
      category: 'chain',
      price: 22999,
      description: 'Premium platinum chain with secure clasp',
      inStock: false,
      imageUrl: 'assets/images/product-6.jpg',
      tags: ['platinum', 'chain', 'premium'],
      productCode: 'PC001',
      stockQuantity: 0
    },
    {
      _id: '7',
      name: 'Ruby Pendant',
      category: 'pendant',
      price: 17999,
      description: 'Striking ruby pendant with diamond accents',
      inStock: true,
      imageUrl: 'assets/images/product-7.jpg',
      tags: ['ruby', 'pendant', 'gemstone'],
      productCode: 'RP001',
      stockQuantity: 4
    },
    {
      _id: '8',
      name: 'Gold and Diamond Set',
      category: 'accessory',
      price: 29999,
      description: 'Elegant gold and diamond jewelry set including necklace, earrings, and bracelet',
      inStock: true,
      imageUrl: 'assets/images/product-8.jpg',
      discount: { percentage: 8 },
      tags: ['gold', 'diamond', 'set', 'luxury'],
      productCode: 'GDS001',
      stockQuantity: 2
    },
    {
      _id: '9',
      name: 'Silver Chain',
      category: 'chain',
      price: 3999,
      description: 'Versatile silver chain suitable for everyday wear',
      inStock: true,
      imageUrl: 'assets/images/product-9.jpg',
      tags: ['silver', 'chain', 'everyday'],
      productCode: 'SC001',
      stockQuantity: 25
    },
    {
      _id: '10',
      name: 'Sapphire Pendant',
      category: 'pendant',
      price: 13999,
      description: 'Stunning blue sapphire pendant with white gold setting',
      inStock: true,
      imageUrl: 'assets/images/product-10.jpg',
      discount: { percentage: 12 },
      tags: ['sapphire', 'pendant', 'gemstone'],
      productCode: 'SP002',
      stockQuantity: 6
    },
    {
      _id: '11',
      name: 'Emerald Set',
      category: 'accessory',
      price: 24999,
      description: 'Luxurious emerald jewelry set with matching pieces',
      inStock: true,
      imageUrl: 'assets/images/product-11.jpg',
      tags: ['emerald', 'set', 'gemstone', 'luxury'],
      productCode: 'ES001',
      stockQuantity: 3
    },
    {
      _id: '12',
      name: 'Gold Rope Chain',
      category: 'chain',
      price: 18999,
      description: 'Classic gold rope chain with intricate design',
      inStock: true,
      imageUrl: 'assets/images/product-12.jpg',
      discount: { percentage: 7 },
      tags: ['gold', 'chain', 'classic'],
      productCode: 'GRC001',
      stockQuantity: 8
    },
    {
      _id: '13',
      name: 'Opal Pendant',
      category: 'pendant',
      price: 9999,
      description: 'Colorful opal pendant with unique pattern',
      inStock: true,
      imageUrl: 'assets/images/product-13.jpg',
      tags: ['opal', 'pendant', 'colorful'],
      productCode: 'OP001',
      stockQuantity: 7
    },
    {
      _id: '14',
      name: 'Pearl and Silver Set',
      category: 'accessory',
      price: 12999,
      description: 'Elegant pearl and silver jewelry set for special occasions',
      inStock: true,
      imageUrl: 'assets/images/product-14.jpg',
      discount: { percentage: 10 },
      tags: ['pearl', 'silver', 'set', 'elegant'],
      productCode: 'PSS001',
      stockQuantity: 5
    },
    {
      _id: '15',
      name: 'Twisted Gold Chain',
      category: 'chain',
      price: 14999,
      description: 'Modern twisted gold chain with contemporary design',
      inStock: true,
      imageUrl: 'assets/images/product-15.jpg',
      tags: ['gold', 'chain', 'modern'],
      productCode: 'TGC001',
      stockQuantity: 9
    },
    {
      _id: '16',
      name: 'Heart Pendant',
      category: 'pendant',
      price: 6999,
      description: 'Romantic heart-shaped pendant with diamond accent',
      inStock: true,
      imageUrl: 'assets/images/product-16.jpg',
      discount: { percentage: 15 },
      tags: ['heart', 'pendant', 'romantic'],
      productCode: 'HP001',
      stockQuantity: 12
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private viewportScroller: ViewportScroller
  ) {
    // Initialize with mock products
    this.allProducts = this.mockProducts;
    this.products$ = of(this.mockProducts);
    this.filteredProducts$ = this.products$;
  }

  ngOnInit(): void {
    // Simulate cart item count for demo purposes
    this.cartItemCount = Math.floor(Math.random() * 4);

    // Get category from query params
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['search'] || '';
      this.selectedCategory = params['category'] as ProductCategory || null;
      this.loadProducts();

      // Update page title based on category
      if (this.selectedCategory) {
        this.pageTitle = this.formatCategoryTitle(this.selectedCategory);
      } else {
        this.pageTitle = 'All Products';
      }
    });

    // Simulate loading
    setTimeout(() => {
      this.loading = false;
    }, 800);

    // Fix scrolling issues
    this.enableScrolling();
  }

  loadProducts(): void {
    this.loading = true;
    this.currentPage = 1;

    // Filter by category
    let filtered = [...this.mockProducts];
    if (this.selectedCategory) {
      filtered = filtered.filter(product => product.category === this.selectedCategory);
    }

    this.allProducts = filtered;
    this.applyFilters();

    // Simulate loading delay for better UX
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  onSearchChange(): void {
    this.applyFilters();

    // Update URL with search params for bookmarking/sharing
    const queryParams: any = {};
    if (this.searchTerm) queryParams.search = this.searchTerm;
    if (this.selectedCategory) queryParams.category = this.selectedCategory;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  applyFilters(): void {
    let filtered = [...this.allProducts];

    // Apply search filter if there's a search term
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search) ||
        product.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Get only the first page of results
    const paginatedResults = this.paginateResults(filtered, this.currentPage);
    this.hasMoreProducts = filtered.length > this.currentPage * this.itemsPerPage;

    this.filteredProducts$ = of(paginatedResults);
  }

  paginateResults(products: Product[], page: number): Product[] {
    const startIndex = 0;
    const endIndex = page * this.itemsPerPage;
    return products.slice(startIndex, endIndex);
  }

  loadMoreProducts(): void {
    this.loadingMore = true;
    this.currentPage++;

    // Simulate network delay
    setTimeout(() => {
      this.applyFilters();
      this.loadingMore = false;
    }, 500);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.router.navigate(['/products']);
  }

  addToCart(product: Product): void {
    // Implement add to cart functionality
    console.log('Adding to cart:', product);

    // Increment cart count (for demo purposes)
    this.cartItemCount++;

    // Show feedback to user instead of alert
    const name = product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name;
    // For real implementation, use a toast/notification service
    alert(`Added ${name} to cart!`);
  }

  calculateDiscountedPrice(product: Product): number {
    if (!product.discount) return product.price;
    const discountAmount = (product.price * Number(product.discount.percentage)) / 100;
    return Math.round((product.price - discountAmount) * 100) / 100;
  }

  formatCategoryTitle(category: ProductCategory): string {
    // Convert 'pendant' to 'Pendants', etc.
    const formatted = category.charAt(0).toUpperCase() + category.slice(1);
    return formatted + 's';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  ngOnDestroy(): void {
    // Don't set overflow styles on destroy as it might affect other components
  }

  // Add a method to enable scrolling
  private enableScrolling(): void {
    // Make sure scrolling is enabled
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.height = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.position = 'static';
    document.documentElement.style.position = 'static';

    // Fix iOS Safari issues
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Use type assertion to avoid TypeScript error
      (document.body.style as any).webkitOverflowScrolling = 'touch';
    }

    // Allow scrolling after a short delay (fixes some race conditions)
    setTimeout(() => {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    }, 100);
  }
} 
