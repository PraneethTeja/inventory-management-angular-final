import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product as CoreProduct, ProductCategory } from '../../core/models/product.model';
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

// Ensure Product type has _id property for template type checking
interface Product extends CoreProduct {
  _id: string;
}

// Add a new interface for pendants with quantity
interface PendantWithQuantity extends Product {
  quantity: number;
}

@Component({
  selector: 'app-create-combination',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './create-combination-redesign.html',
  styleUrls: ['./create-combination-unified.scss']
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
  selectedPendants: PendantWithQuantity[] = [];
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
  proceedToPendants = false; // Flag to control proceeding to pendants selection

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

  selectPendant(pendant: Product | null | undefined): void {
    if (!pendant || !pendant._id) return;

    const index = this.selectedPendants.findIndex(p => p._id && pendant._id && p._id === pendant._id);

    if (index >= 0) {
      // If pendant is already selected, increment its quantity
      this.selectedPendants[index].quantity++;
    } else {
      // Add the pendant with quantity 1
      const pendantWithQuantity: PendantWithQuantity = {
        ...pendant,
        quantity: 1
      };
      this.selectedPendants.push(pendantWithQuantity);
    }
  }

  // Method to decrease pendant quantity
  decreasePendantQuantity(pendant: Product | null | undefined, event: Event): void {
    if (!pendant || !pendant._id) return;

    // Stop click event from propagating to parent (which would add quantity)
    event.stopPropagation();

    const index = this.selectedPendants.findIndex(p => p._id && pendant._id && p._id === pendant._id);
    if (index >= 0) {
      // If quantity is greater than 1, decrease it
      if (this.selectedPendants[index].quantity > 1) {
        this.selectedPendants[index].quantity--;
      } else {
        // If quantity is 1, remove the pendant from selection
        this.selectedPendants.splice(index, 1);
      }
    }
  }

  // Method to increment pendant quantity
  incrementPendantQuantity(pendant: Product | null | undefined, event: Event): void {
    if (!pendant || !pendant._id) return;

    // Stop click event from propagating to parent
    event.stopPropagation();

    const index = this.selectedPendants.findIndex(p => p._id && pendant._id && p._id === pendant._id);
    if (index >= 0) {
      // Increment the quantity (consider adding a max limit if needed)
      this.selectedPendants[index].quantity++;
    } else {
      // This shouldn't happen as the + button is only shown for selected pendants,
      // but handled for safety
      const pendantWithQuantity: PendantWithQuantity = {
        ...pendant,
        quantity: 1
      };
      this.selectedPendants.push(pendantWithQuantity);
    }
  }

  // Add a method to get the pendant quantity
  getPendantQuantity(pendant: Product | null | undefined): number {
    if (!pendant || !pendant._id) return 0;
    const found = this.selectedPendants.find(p => p._id && pendant._id && p._id === pendant._id);
    return found?.quantity || 0;
  }

  isPendantSelected(pendant: Product | null | undefined): boolean {
    if (!pendant || !pendant._id) return false;
    return this.selectedPendants.some(p => p._id && pendant._id && p._id === pendant._id);
  }

  selectChain(chain: Product | null | undefined): void {
    if (!chain || !chain._id) return;

    if (this.selectedChain && this.selectedChain._id && chain._id && this.selectedChain._id === chain._id) {
      // If same chain is clicked again, deselect it
      this.selectedChain = null;
      this.selectedChainSize = '';
      this.selectedChainType = '';
      this.selectedChainLayer = '';
      this.proceedToPendants = false;
    } else {
      this.selectedChain = chain;
      this.proceedToPendants = false; // Reset flag when selecting new chain

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

  // Add this method to calculate the fixed price structure
  calculateCombinationPrice(): number {
    // Count the total number of pendants (including quantities)
    const pendantCount = this.selectedPendants.reduce((total, pendant) => {
      return total + pendant.quantity;
    }, 0);

    // Base price determined by type, layer, and pendant count
    let basePrice = 0;

    if (this.selectedChainType === 'Chain') {
      // Chain pricing based on layer
      if (this.selectedChainLayer === 'Single') {
        // Single layered chain: Base price 100 for up to 1 pendant
        basePrice = 100;

        // For each additional pendant beyond 1, add 50
        if (pendantCount > 1) {
          basePrice += (pendantCount - 1) * 50;
        }
      } else if (this.selectedChainLayer === 'Double') {
        // Double layered chain: Base price 200 for up to 2 pendants
        basePrice = 200;

        // For each additional pendant beyond 2, add 50
        if (pendantCount > 2) {
          basePrice += (pendantCount - 2) * 50;
        }
      } else if (this.selectedChainLayer === 'Triple') {
        // Triple layered chain: Base price 300 for up to 3 pendants
        basePrice = 300;

        // For each additional pendant beyond 3, add 50
        if (pendantCount > 3) {
          basePrice += (pendantCount - 3) * 50;
        }
      }
    } else if (this.selectedChainType === 'Bracelet' || this.selectedChainType === 'Anklet') {
      // Bracelet or Anklet pricing - base price 100 for 1 pendant
      basePrice = 100;

      // Add 50 for each additional pendant beyond 1
      if (pendantCount > 1) {
        basePrice += (pendantCount - 1) * 50;
      }
    }

    return basePrice;
  }

  addToCart(): void {
    // Only check for chain layer if chain type is 'Chain', otherwise it's not needed
    const isChainLayerRequired = this.selectedChainType === 'Chain';
    if (this.selectedPendants.length === 0 || !this.selectedChain || !this.selectedChainType || !this.selectedChainSize ||
      (isChainLayerRequired && !this.selectedChainLayer)) {
      return;
    }

    try {
      console.log('Adding combination to cart...');

      // Calculate the combo price using our fixed pricing model
      const comboPrice = this.calculateCombinationPrice();

      // Create pendant names string with quantities
      const pendantsList = this.selectedPendants.map(pendant => {
        return pendant.quantity > 1 ? `${pendant.name} (x${pendant.quantity})` : pendant.name;
      });

      // Calculate total pendant count including quantities
      const pendantCount = this.selectedPendants.reduce((count, pendant) => count + pendant.quantity, 0);
      const firstPendantName = pendantsList[0];

      // Create pendant names display string
      const pendantNames = pendantsList.length === 1
        ? firstPendantName
        : `${firstPendantName} + ${pendantCount - 1} more`;

      // Create a more concise name to avoid overflow
      let comboName = '';
      if (this.selectedChainType === 'Chain') {
        comboName = `${this.selectedChainType} (${this.selectedChainSize}, ${this.selectedChainLayer} Layered): ${this.selectedChain.name} with ${pendantNames}`;
      } else {
        comboName = `${this.selectedChainType} (${this.selectedChainSize}): ${this.selectedChain.name} with ${pendantNames}`;
      }

      // Choose an image (prefer the first pendant's image if available)
      const comboImage = this.selectedPendants[0]?.imageUrl || this.selectedChain.imageUrl;

      console.log('Creating combo product with name:', comboName);

      // Since we're using SimpleCartService, we need to adapt our item format
      const comboProductId = `combo-${Date.now()}`;

      // Create pendant details array with full information including quantities
      const pendantDetails = this.selectedPendants.map(pendant => ({
        name: pendant.name,
        productCode: pendant.productCode || 'N/A',
        quantity: pendant.quantity,
        price: pendant.price
      }));

      // Add to cart using SimpleCartService format with detailed combination information
      const chainDetails: any = {
        name: this.selectedChain.name,
        productCode: this.selectedChain.productCode || 'N/A',
        price: this.selectedChain.price,
        type: this.selectedChainType,
        size: this.selectedChainSize
      };

      // Only add layer info if it's a Chain type
      if (this.selectedChainType === 'Chain') {
        chainDetails.layer = this.selectedChainLayer;
      }

      // Add pricing structure information
      const pricingDetails = {
        basePrice: comboPrice,
        // Store the price breakdown
        priceDescription: this.getPriceDescription(pendantCount)
      };

      this.cartService.addToCart({
        productId: comboProductId,
        name: comboName,
        price: comboPrice, // Using our fixed pricing model
        quantity: 1,
        imageUrl: comboImage,
        type: 'combination',
        productCode: comboProductId,
        chainDetails: chainDetails,
        pendantDetails: pendantDetails,
        pricingDetails: pricingDetails
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
      this.proceedToPendants = false; // Reset proceed flag

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

  clearPendantSearch(event: Event): void {
    event.preventDefault();
    this.pendantSearchTerm = '';
    this.filteredPendants = this.pendants;
  }

  filterChains(): void {
    const searchTerm = this.chainSearchTerm.toLowerCase();
    this.filteredChains = this.chains.filter(chain =>
      chain.name.toLowerCase().includes(searchTerm) ||
      chain.productCode.toLowerCase().includes(searchTerm)
    );
  }

  clearChainSearch(event: Event): void {
    event.preventDefault();
    this.chainSearchTerm = '';
    this.filteredChains = this.chains;
  }

  navigateToCart(): void {
    this.router.navigate(['/cart']);
  }

  // Helper methods for calculations
  getTotalPendantPrice(): number {
    // This now uses the pricing model instead of actual pendant prices
    return 0; // This is not used in our new pricing model
  }

  getTotalPrice(): number {
    // Use our fixed pricing model instead of adding chain and pendant prices
    if (!this.selectedChain || !this.selectedChainType || this.selectedPendants.length === 0 ||
      (this.selectedChainType === 'Chain' && !this.selectedChainLayer)) {
      return 0;
    }

    // The price is now based on our fixed pricing structure
    const basePrice = this.calculateCombinationPrice();

    // Add packing and delivery charges (will be added once at cart level)
    // const packingCharge = 15;
    // const deliveryCharge = 40;

    // Return just the base price (packing & delivery added when checking out)
    return basePrice;
  }

  // Add method to handle chain type changes
  onChainTypeChange(type: string): void {
    this.selectedChainType = type;

    // Reset chain layer if not Chain type
    if (type !== 'Chain') {
      this.selectedChainLayer = '';
    } else if (!this.selectedChainLayer) {
      // Set default layer if it's Chain type and no layer is selected
      this.selectedChainLayer = this.chainLayers[0];
    }
  }

  // Helper method to generate price description
  getPriceDescription(pendantCount: number): string {
    let description = '';

    if (this.selectedChainType === 'Chain') {
      description = `${this.selectedChainLayer} layered chain with ${pendantCount} pendant${pendantCount > 1 ? 's' : ''}`;
    } else {
      description = `${this.selectedChainType} with ${pendantCount} pendant${pendantCount > 1 ? 's' : ''}`;
    }

    return description;
  }

  // Helper methods to avoid lambda expressions in template
  getTotalPendantCount(): number {
    return this.selectedPendants.reduce((total, pendant) => total + pendant.quantity, 0);
  }

  getPendantSuffix(): string {
    return this.getTotalPendantCount() > 1 ? 's' : '';
  }
} 
