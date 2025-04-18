import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ProductSorterService } from './product-sorter.service';
import { SimpleCartService } from '../../core/services/simple-cart.service';
import { Product as CoreProduct, ProductCategory as CoreProductCategory } from '../../core/models/product.model';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  inStock: boolean;
  stock?: number;
  imageUrl: string;
  discount?: { percentage: number };
  discountPercentage?: number;
  discountedPrice?: number;
  tags: string[];
  productCode: string;
  stockQuantity: number;
  details?: string[];
  featured?: boolean;
}

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

type ProductCategory = 'all' | 'pendant' | 'chain';
type SortOption = 'featured' | 'price-low-high' | 'price-high-low' | 'newest';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent]
})
export class ProductListComponent implements OnInit, OnDestroy {
  // Page state
  pageTitle = 'Our Products';
  loading = true;
  loadingMore = false;
  hasMoreProducts = true;
  currentPage = 1;
  itemsPerPage = 8;

  // Add subscriptions property
  private subscriptions: Subscription[] = [];

  // Filter state
  selectedCategory: ProductCategory = 'all';
  searchTerm = '';
  selectedSort: SortOption = 'featured';
  priceRange = { min: 0, max: 10000 };

  // Products
  allProducts: Product[] = [];
  products$ = of<Product[]>([]);
  filteredProducts$ = of<Product[]>([]);
  selectedProduct: Product | null = null;
  showProductModal = false;

  // Added variables needed by template
  cartItemCount = 0;
  searchQuery = '';
  activeCategory = 'all';
  sortBy = 'default';
  isLoading = false;
  isLoadingMore = false;
  filteredProducts: Product[] = [];

  // Mock data for development
  mockProducts: Product[] = [
    {
      _id: '1',
      name: 'Gold Chain Necklace',
      category: 'chain',
      price: 12999,
      description: 'Elegant gold chain with modern design',
      inStock: true,
      stock: 15,
      imageUrl: 'assets/images/product-1.jpg',
      discount: { percentage: 10 },
      discountPercentage: 10,
      discountedPrice: 11699,
      tags: ['gold', 'chain', 'bestseller'],
      productCode: 'GCN001',
      stockQuantity: 15,
      details: ['Elegant', 'Modern', 'Gold'],
      featured: true
    },
    {
      _id: '2',
      name: 'Silver Pendant',
      category: 'pendant',
      price: 4999,
      description: 'Beautiful silver pendant with floral design',
      inStock: true,
      stock: 8,
      imageUrl: 'assets/images/product-2.jpg',
      discount: { percentage: 5 },
      discountPercentage: 5,
      discountedPrice: 4749,
      tags: ['silver', 'pendant'],
      productCode: 'SP001',
      stockQuantity: 8,
      details: ['Silver', 'Floral', 'Elegant'],
      featured: true
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
      stockQuantity: 3,
      featured: true
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
      stockQuantity: 10,
      featured: true
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
      stockQuantity: 5,
      featured: true
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
      stockQuantity: 0,
      featured: true
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
      stockQuantity: 4,
      featured: true
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
      stockQuantity: 2,
      featured: true
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
      stockQuantity: 25,
      featured: true
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
      stockQuantity: 6,
      featured: true
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
      stockQuantity: 3,
      featured: true
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
      stockQuantity: 8,
      featured: true
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
      stockQuantity: 7,
      featured: true
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
      stockQuantity: 5,
      featured: true
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
      stockQuantity: 9,
      featured: true
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
      stockQuantity: 12,
      featured: true
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private viewportScroller: ViewportScroller,
    private productService: ProductService,
    private productSorterService: ProductSorterService,
    private simpleCartService: SimpleCartService
  ) {
    // Initialize with mock products
    this.loadProducts();

    // Fix scrolling issues
    this.enableScrolling();

    // Check for category in route params
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        if (params['category']) {
          this.selectedCategory = params['category'] as ProductCategory;
          this.loadProducts();
        }
      })
    );

    // Subscribe to cart count
    this.subscriptions.push(
      this.simpleCartService.getCartCount().subscribe(count => {
        this.cartItemCount = count;
      })
    );
  }

  ngOnInit(): void {
    // Scroll to top when component initializes
    this.viewportScroller.scrollToPosition([0, 0]);
  }

  loadProducts(): void {
    this.loading = true;
    this.isLoading = true;

    // In a real application, you would call your API with pagination
    // For this mock, we'll simulate loading products
    setTimeout(() => {
      this.allProducts = this.mockProducts;
      this.applyFilters();
      this.loading = false;
      this.isLoading = false;
      this.filteredProducts = [...this.allProducts];
    }, 800);
  }

  // For implementing infinite scroll or load more buttons
  loadMoreProducts(): void {
    if (this.loadingMore || this.isLoadingMore) return;
    this.loadingMore = true;
    this.isLoadingMore = true;
    this.currentPage++;

    setTimeout(() => {
      this.filteredProducts$ = of(this.paginateResults(this.allProducts, this.currentPage));
      this.hasMoreProducts = this.allProducts.length > this.currentPage * this.itemsPerPage;
      this.loadingMore = false;
      this.isLoadingMore = false;
    }, 500);
  }

  applyFilters(): void {
    // Filter products based on search term and category
    let filtered = this.mockProducts.slice();

    // Handle both selectedCategory and activeCategory
    const category = this.activeCategory !== 'all' ? this.activeCategory : this.selectedCategory;
    if (category && category !== 'all') {
      filtered = filtered.filter(product => product.category === category);
    }

    // Handle both searchTerm and searchQuery
    const term = (this.searchTerm || this.searchQuery || '').toLowerCase();
    if (term) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.tags?.some((tag: string) => tag.toLowerCase().includes(term)) ||
        product.productCode.toLowerCase().includes(term)
      );
    }

    // Apply sorting using the ProductSorterService with type assertion
    const sort = this.sortBy !== 'default' ? this.sortBy : this.selectedSort;
    if (sort) {
      filtered = this.productSorterService.sortProducts(filtered, sort) as Product[];
    }

    this.allProducts = filtered;
    this.products$ = of(filtered);
    this.filteredProducts$ = of(this.paginateResults(filtered, this.currentPage));
    this.filteredProducts = this.paginateResults(filtered, this.currentPage);
    this.hasMoreProducts = filtered.length > this.currentPage * this.itemsPerPage;
  }

  sortProducts(): void {
    this.applyFilters();
  }

  paginateResults(products: Product[], page: number): Product[] {
    const start = 0;
    const end = page * this.itemsPerPage;
    return products.slice(start, end);
  }

  // Enable scrolling when modal is closed
  enableScrolling(): void {
    document.body.style.overflow = 'auto';
  }

  // Disable scrolling when modal is open
  disableScrolling(): void {
    document.body.style.overflow = 'hidden';
  }

  openProductModal(product: Product): void {
    this.selectedProduct = product;
    this.showProductModal = true;
    this.disableScrolling();
  }

  closeProductModal(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showProductModal = false;
    this.selectedProduct = null;
    this.enableScrolling();
  }

  // Add a debugging method for cart operations
  private logCartOperation(method: string, product?: any, result?: any): void {
    console.group(`ProductListComponent - ${method}`);
    if (product) console.log('Product:', product._id, product.name);
    if (result !== undefined) console.log('Result:', result);
    console.groupEnd();
  }

  // Update isInCart method with debugging
  isInCart(product: Product): boolean {
    if (!product || !product._id) {
      console.error('Invalid product in isInCart:', product);
      return false;
    }

    const result = this.simpleCartService.isInCart(product._id);
    this.logCartOperation('isInCart', product, result);
    return result;
  }

  // Update getCartItemQuantity method with debugging
  getCartItemQuantity(product: Product): number {
    if (!product || !product._id) {
      console.error('Invalid product in getCartItemQuantity:', product);
      return 0;
    }

    const result = this.simpleCartService.getQuantity(product._id);
    this.logCartOperation('getCartItemQuantity', product, result);
    return result;
  }

  // Update add to cart with debugging
  addToCart(product: Product): void {
    if (!product || !product._id) {
      console.error('Invalid product in addToCart:', product);
      return;
    }

    this.logCartOperation('addToCart', product);
    this.simpleCartService.addToCart(product);
  }

  // Update decreaseQuantity with debugging
  decreaseQuantity(product: Product): void {
    if (!product || !product._id) {
      console.error('Invalid product in decreaseQuantity:', product);
      return;
    }

    this.logCartOperation('decreaseQuantity', product);
    this.simpleCartService.decreaseQuantity(product._id);
  }

  // Template required methods
  filterByCategory(category: string): void {
    this.activeCategory = category;
    this.applyFilters();
  }

  viewProductDetails(product: Product): void {
    this.openProductModal(product);
  }

  resetFilters(): void {
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'default';
    this.applyFilters();
  }

  loadMore(): void {
    this.loadMoreProducts();
  }

  increaseQuantity(product: Product): void {
    // Add one more of this product to cart
    this.addToCart(product);
  }

  ngOnDestroy(): void {
    // Don't set overflow styles on destroy as it might affect other components
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Add helper method for getting product stock
  getProductStock(product: Product): number {
    // If stock is directly available, use it
    if (product.stock !== undefined) {
      return product.stock;
    }
    // Otherwise fallback to stockQuantity
    return product.stockQuantity;
  }
} 
