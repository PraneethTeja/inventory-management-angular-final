import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product } from '../../core/models/product.model';
import { SimpleCartService } from '../../core/services/simple-cart.service';
import { ProductService } from '../../core/services/product.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit
} from 'firebase/firestore';
import { firestore } from '../../app.config';

@Component({
  selector: 'app-create-combination',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './create-combination.component.html',
  styleUrls: ['./create-combination.component.scss']
})
export class CreateCombinationComponent implements OnInit {
  // Products
  products: Product[] = [];
  pendants: Product[] = [];
  chains: Product[] = [];
  isLoading = false;
  error = '';
  success = '';

  // Selected products for combination
  selectedPendants: Product[] = [];
  selectedChain: Product | null = null;
  filteredChains: Product[] = [];
  filteredPendants: Product[] = [];
  chainSearchTerm = '';
  pendantSearchTerm = '';

  // Chain type and size options
  chainTypes = ['Chain', 'Bracelet', 'Anklet'];
  chainSizes = ['Small', 'Medium', 'Large'];
  chainLayers = ['Single', 'Double', 'Triple'];
  selectedChainType = '';
  selectedChainSize = '';
  selectedChainLayer = '';

  // UI state
  showAddComboModal = true; // Always show the combination UI
  cartItemCount = 0;

  constructor(
    private productService: ProductService,
    private cartService: SimpleCartService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('Firestore initialized:', !!firestore);
    this.loadProducts();
    this.updateCartCount();
  }

  updateCartCount(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.cartItemCount = items.length;
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = '';

    try {
      console.log('Starting to load products...');
      this.fetchProductsFromFirestore()
        .then(products => {
          console.log(`Successfully loaded ${products.length} products`);
          this.products = products;
          // Filter products by category
          this.pendants = this.products.filter((p: Product) => p.category === 'pendant');
          this.chains = this.products.filter((p: Product) => p.category === 'chain');

          console.log(`Found ${this.pendants.length} pendants and ${this.chains.length} chains`);

          this.filteredPendants = this.pendants;
          this.filteredChains = this.chains;

          this.isLoading = false;
        })
        .catch(err => {
          this.error = 'Failed to load products. Please try again.';
          this.isLoading = false;
          console.error('Error loading products:', err);
        });
    } catch (err) {
      this.error = 'Failed to load products. Please try again.';
      this.isLoading = false;
      console.error('Error in loadProducts method:', err);
    }
  }

  async fetchProductsFromFirestore(): Promise<Product[]> {
    try {
      console.log('Starting to fetch products from Firestore');

      // Start with a simpler query to test basic connectivity
      const productsQuery = query(
        collection(firestore, 'products'),
        limit(100)
      );

      console.log('Query created, fetching documents');
      const querySnapshot = await getDocs(productsQuery);
      console.log(`Got ${querySnapshot.size} documents from Firestore`);

      if (querySnapshot.empty) {
        console.warn('No products found in Firestore');
      }

      const products: Product[] = [];

      querySnapshot.forEach((doc) => {
        console.log(`Processing document: ${doc.id}`);
        const data = doc.data() as any;

        try {
          // Calculate discounted price
          const price = data['price'] || 0;
          const discountPercentage = data['discount']?.percentage || 0;
          const discountedPrice = discountPercentage > 0
            ? price - (price * discountPercentage / 100)
            : price;

          // Safely convert Firebase timestamp to Date if needed
          let createdAt = new Date();
          let updatedAt = new Date();
          let validUntil = null;

          // Handle createdAt timestamp
          if (data['createdAt']) {
            if (typeof data['createdAt'].toDate === 'function') {
              createdAt = data['createdAt'].toDate();
            } else if (data['createdAt'] instanceof Date) {
              createdAt = data['createdAt'];
            } else {
              createdAt = new Date(data['createdAt']);
            }
          }

          // Handle updatedAt timestamp
          if (data['updatedAt']) {
            if (typeof data['updatedAt'].toDate === 'function') {
              updatedAt = data['updatedAt'].toDate();
            } else if (data['updatedAt'] instanceof Date) {
              updatedAt = data['updatedAt'];
            } else {
              updatedAt = new Date(data['updatedAt']);
            }
          }

          // Handle discount validUntil timestamp
          if (data['discount']?.validUntil) {
            if (typeof data['discount'].validUntil.toDate === 'function') {
              validUntil = data['discount'].validUntil.toDate();
            } else if (data['discount'].validUntil instanceof Date) {
              validUntil = data['discount'].validUntil;
            } else {
              validUntil = new Date(data['discount'].validUntil);
            }
          }

          // Create the product object with all required fields
          products.push({
            _id: doc.id,
            name: data['name'] || 'Unknown Product',
            category: data['category'] || 'chain',
            price: price,
            description: data['description'] || '',
            imageUrl: data['imageUrl'] || '',
            productCode: data['productCode'] || '',
            inStock: data['inStock'] !== undefined ? data['inStock'] : true,
            stockQuantity: data['stockQuantity'] || 0,
            imageUrls: data['imageUrls'] || [],
            details: data['details'] || {
              material: '',
              dimensions: '',
              weight: '',
              features: []
            },
            featured: data['featured'] || false,
            discount: {
              percentage: discountPercentage,
              validUntil
            },
            tags: data['tags'] || [],
            createdAt,
            updatedAt,
            discountedPrice
          } as Product);
        } catch (docError) {
          console.error(`Error processing document ${doc.id}:`, docError);
          // Continue processing other documents
        }
      });

      console.log(`Successfully processed ${products.length} products`);
      return products;
    } catch (error) {
      console.error('Detailed error fetching products:', error);
      // Log more details if available
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, message: ${error.message}`);
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  selectPendant(pendant: Product): void {
    const index = this.selectedPendants.findIndex(p => p._id === pendant._id);
    if (index >= 0) {
      // If pendant is already selected, remove it
      this.selectedPendants.splice(index, 1);
    } else {
      // Otherwise add it to selection
      this.selectedPendants.push(pendant);
    }
  }

  isPendantSelected(pendant: Product): boolean {
    return this.selectedPendants.some(p => p._id === pendant._id);
  }

  selectChain(chain: Product): void {
    if (this.selectedChain && this.selectedChain._id === chain._id) {
      // If same chain is clicked again, deselect it
      this.selectedChain = null;
      this.selectedChainSize = '';
      this.selectedChainType = '';
      this.selectedChainLayer = '';
    } else {
      this.selectedChain = chain;

      // Set defaults if not already selected
      if (!this.selectedChainSize) {
        this.selectedChainSize = this.chainSizes[0];
      }

      if (!this.selectedChainType) {
        this.selectedChainType = this.chainTypes[0];
      }

      if (!this.selectedChainLayer) {
        this.selectedChainLayer = this.chainLayers[0];
      }
    }
  }

  addToCart(): void {
    if (this.selectedPendants.length === 0 || !this.selectedChain || !this.selectedChainType || !this.selectedChainSize || !this.selectedChainLayer) {
      return;
    }

    try {
      console.log('Adding combination to cart...');

      // Calculate total pendant price
      const totalPendantPrice = this.selectedPendants.reduce((sum, pendant) => sum + pendant.price, 0);
      const comboPrice = this.selectedChain.price + totalPendantPrice;

      // Create pendant names string - limit to first pendant name + count for better display
      const pendantCount = this.selectedPendants.length;
      const firstPendantName = this.selectedPendants[0].name;
      const pendantNames = pendantCount === 1
        ? firstPendantName
        : `${firstPendantName} + ${pendantCount - 1} more`;

      // Create a more concise name to avoid overflow
      const comboName = `${this.selectedChainType} (${this.selectedChainSize}, ${this.selectedChainLayer} Layered): ${this.selectedChain.name} with ${pendantNames}`;

      // Choose an image (prefer the first pendant's image if available)
      const comboImage = this.selectedPendants[0]?.imageUrl || this.selectedChain.imageUrl;

      console.log('Creating combo product with name:', comboName);

      // Since we're using SimpleCartService, we need to adapt our item format
      const comboProductId = `combo-${Date.now()}`;

      // Create pendant details array with full information
      const pendantDetails = this.selectedPendants.map(pendant => ({
        name: pendant.name,
        productCode: pendant.productCode || 'N/A',
        quantity: 1,
        price: pendant.price
      }));

      // Add to cart using SimpleCartService format with detailed combination information
      this.cartService.addToCart({
        productId: comboProductId,
        name: comboName,
        price: comboPrice,
        quantity: 1,
        imageUrl: comboImage,
        type: 'combination',
        productCode: comboProductId,
        chainDetails: {
          name: this.selectedChain.name,
          productCode: this.selectedChain.productCode || 'N/A',
          price: this.selectedChain.price,
          type: this.selectedChainType,
          size: this.selectedChainSize,
          layer: this.selectedChainLayer
        },
        pendantDetails: pendantDetails
      });

      // Show success message and update cart count
      this.success = 'Custom combination added to cart!';
      console.log('Combination added to cart successfully');
      this.updateCartCount();

      // Reset selections
      this.selectedPendants = [];
      this.selectedChain = null;
      this.selectedChainType = '';
      this.selectedChainSize = '';
      this.selectedChainLayer = '';

      // Clear success message after delay
      setTimeout(() => {
        this.success = '';
      }, 3000);
    } catch (error) {
      console.error('Error adding combination to cart:', error);
      this.error = 'Failed to add combination to cart. Please try again.';

      // Clear error message after delay
      setTimeout(() => {
        this.error = '';
      }, 3000);
    }
  }

  filterPendants(): void {
    const searchTerm = this.pendantSearchTerm.toLowerCase();
    this.filteredPendants = this.pendants.filter(pendant =>
      pendant.name.toLowerCase().includes(searchTerm) ||
      pendant.productCode.toLowerCase().includes(searchTerm)
    );
  }

  filterChains(): void {
    const searchTerm = this.chainSearchTerm.toLowerCase();
    this.filteredChains = this.chains.filter(chain =>
      chain.name.toLowerCase().includes(searchTerm) ||
      chain.productCode.toLowerCase().includes(searchTerm)
    );
  }

  navigateToCart(): void {
    this.router.navigate(['/cart']);
  }

  // Helper methods for calculations
  getTotalPendantPrice(): number {
    return this.selectedPendants.reduce((sum, pendant) => sum + pendant.price, 0);
  }

  getTotalPrice(): number {
    const chainPrice = this.selectedChain?.price || 0;
    return chainPrice + this.getTotalPendantPrice();
  }
} 
