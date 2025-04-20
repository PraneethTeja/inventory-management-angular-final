import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { Product } from '../../../../core/models/product.model';
import { OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '../../../../core/models/order.model';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { firestore } from '../../../../app.config';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './create-order.component.html',
  styleUrls: ['./create-order.component.scss']
})
export class CreateOrderComponent implements OnInit {
  // Main sections of our component
  products: Product[] = [];
  pendants: Product[] = [];
  chains: Product[] = [];
  orderItems: any[] = [];
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

  // Form groups
  customerForm: FormGroup;
  orderNotesForm: FormGroup;

  // Order summary
  subtotal = 0;
  tax = 0;
  total = 0;

  // UI state
  activeTab = 'combination'; // Default to combination tab only
  showAddComboModal = false;

  // WhatsApp integration
  whatsappLink = '';
  showWhatsAppButton = false;
  sendingToWhatsApp = false;
  createdOrderId = '';

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private cartService: CartService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.customerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });

    this.orderNotesForm = this.fb.group({
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.filteredPendants = this.pendants;
    this.filteredChains = this.chains;
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = '';

    try {
      this.fetchProductsFromFirestore()
        .then(products => {
          this.products = products;
          // Filter products by category
          this.pendants = this.products.filter((p: Product) => p.category === 'pendant');
          this.chains = this.products.filter((p: Product) => p.category === 'chain');

          this.filteredPendants = this.pendants;
          this.filteredChains = this.chains;

          this.isLoading = false;
          console.log('Products loaded from Firestore:', this.products);
        })
        .catch(err => {
          this.error = 'Failed to load products. Please try again.';
          this.isLoading = false;
          console.error('Error loading products:', err);
        });
    } catch (err) {
      this.error = 'Failed to load products. Please try again.';
      this.isLoading = false;
      console.error('Error loading products:', err);
    }
  }

  async fetchProductsFromFirestore(): Promise<Product[]> {
    try {
      const productsQuery = query(
        collection(firestore, 'products'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(productsQuery);
      const products: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;

        // Calculate discounted price
        const price = data['price'] || 0;
        const discountPercentage = data['discount']?.percentage || 0;
        const discountedPrice = discountPercentage > 0
          ? price - (price * discountPercentage / 100)
          : price;

        // Convert Firebase timestamp to Date if needed
        const createdAt = data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']);
        const updatedAt = data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']);
        let validUntil = null;
        if (data['discount']?.validUntil) {
          validUntil = data['discount'].validUntil?.toDate
            ? data['discount'].validUntil.toDate()
            : new Date(data['discount'].validUntil);
        }

        products.push({
          _id: doc.id,
          ...data,
          createdAt,
          updatedAt,
          discount: {
            ...data['discount'],
            validUntil
          },
          discountedPrice
        } as Product);
      });

      return products;
    } catch (error) {
      console.error('Error fetching products from Firestore:', error);
      throw error;
    }
  }

  openComboModal(): void {
    this.selectedPendants = [];
    this.selectedChain = null;
    this.selectedChainType = '';
    this.selectedChainSize = '';
    this.selectedChainLayer = '';
    this.showAddComboModal = true;
  }

  closeComboModal(): void {
    this.showAddComboModal = false;
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
      this.selectedChainType = '';
      this.selectedChainSize = '';
      this.selectedChainLayer = '';
    } else {
      this.selectedChain = chain;

      // Set defaults if not already selected
      if (!this.selectedChainType) {
        this.selectedChainType = this.chainTypes[0];
      }

      if (!this.selectedChainSize) {
        this.selectedChainSize = this.chainSizes[0];
      }

      if (!this.selectedChainLayer) {
        this.selectedChainLayer = this.chainLayers[0];
      }
    }
  }

  addComboToOrder(): void {
    if (this.selectedPendants.length > 0 && this.selectedChain && this.selectedChainType && this.selectedChainSize && this.selectedChainLayer) {
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

      // Create a virtual product for the combo
      const comboProduct: Product = {
        _id: `combo-${Date.now()}`,
        name: comboName,
        category: 'combination',
        price: comboPrice,
        description: `Combination of ${this.selectedChainType} (${this.selectedChainSize}, ${this.selectedChainLayer} Layered): ${this.selectedChain.name} and ${this.selectedPendants.map(p => p.name).join(', ')}`,
        imageUrl: comboImage,
        productCode: `COMBO-${Date.now()}`,
        inStock: true,
        stockQuantity: 1,
        imageUrls: [],
        details: {
          material: '',
          dimensions: '',
          weight: '',
          features: []
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: []
      };

      this.orderItems.push({
        product: comboProduct,
        quantity: 1,
        isCombo: true,
        pendantProducts: [...this.selectedPendants],
        chainProduct: this.selectedChain,
        chainType: this.selectedChainType,
        chainSize: this.selectedChainSize,
        chainLayer: this.selectedChainLayer
      });

      this.closeComboModal();
      this.updateOrderSummary();
    }
  }

  updateQuantity(index: number, amount: number): void {
    const newQuantity = this.orderItems[index].quantity + amount;

    if (newQuantity <= 0) {
      this.removeItem(index);
    } else {
      this.orderItems[index].quantity = newQuantity;
      this.updateOrderSummary();
    }
  }

  removeItem(index: number): void {
    this.orderItems.splice(index, 1);
    this.updateOrderSummary();
  }

  updateOrderSummary(): void {
    // Calculate subtotal
    this.subtotal = this.orderItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);

    // Calculate tax (18% GST for jewelry in India)
    this.tax = this.subtotal * 0.18;

    // Calculate total
    this.total = this.subtotal + this.tax;
  }

  createOrder(): void {
    if (this.customerForm.invalid || this.orderItems.length === 0) {
      return;
    }

    this.isLoading = true;
    this.error = '';

    const customerData = this.customerForm.value;
    const notes = this.orderNotesForm.value.notes;

    // Format the order items for the API
    const formattedItems: OrderItem[] = this.orderItems.map(item => {
      let orderItem: OrderItem = {
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        category: item.product.category,
        imageUrl: item.product.imageUrl
      };

      if (item.isCombo) {
        orderItem.combinationDetails = {
          isCombo: true
        };

        // Add the first pendant's info
        if (item.pendantProducts && item.pendantProducts.length > 0) {
          orderItem.combinationDetails.pendantInfo = {
            id: item.pendantProducts[0]._id,
            name: item.pendantProducts[0].name,
            price: item.pendantProducts[0].price
          };

          // If there are multiple pendants, add that info to the name
          if (item.pendantProducts.length > 1) {
            orderItem.name += ` (with ${item.pendantProducts.length} pendants)`;
          }
        }

        // Add the chain info with type and size
        if (item.chainProduct) {
          orderItem.combinationDetails.chainInfo = {
            id: item.chainProduct._id,
            name: item.chainProduct.name,
            price: item.chainProduct.price,
            type: item.chainType,
            size: item.chainSize,
            layer: item.chainLayer
          };
        }
      }

      return orderItem;
    });

    const orderData = {
      customer: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone
      },
      items: formattedItems,
      status: 'confirmed' as OrderStatus,
      subtotal: this.subtotal,
      tax: this.tax,
      totalAmount: this.total,
      shippingCost: 0,
      discount: 0,
      paymentMethod: 'cash' as PaymentMethod,
      paymentStatus: 'paid' as PaymentStatus,
      whatsapp: {
        messageSent: false
      },
      notes: notes
    };

    // Mock implementation - simulate API call with setTimeout
    setTimeout(() => {
      try {
        // Create a mock order response
        const mockOrderId = 'ORDER-' + Date.now();
        const mockOrderResponse = {
          _id: mockOrderId,
          ...orderData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log('Mock order created:', mockOrderResponse);
        this.success = `Order #${mockOrderResponse._id} created successfully!`;
        this.isLoading = false;

        // Store the order ID
        this.createdOrderId = mockOrderId;

        // Show WhatsApp option
        this.showWhatsAppButton = true;

        // Generate WhatsApp redirect link
        this.getWhatsAppLink(mockOrderResponse._id);

        // Clear order items
        this.orderItems = [];
        this.updateOrderSummary();
      } catch (err) {
        this.error = 'Failed to create order. Please try again.';
        this.isLoading = false;
        console.error('Error creating order:', err);
      }
    }, 800); // Simulate network delay

    // Comment out the actual API call
    /*
    this.orderService.createOrder(orderData).subscribe({
      next: (response) => {
        this.success = `Order #${response._id} created successfully!`;
        this.isLoading = false;
        
        // Store the order ID
        this.createdOrderId = response._id;
        
        // Show WhatsApp option
        this.showWhatsAppButton = true;
        
        // Generate WhatsApp redirect link
        this.getWhatsAppLink(response._id);
        
        // Clear order items
        this.orderItems = [];
        this.updateOrderSummary();
      },
      error: (err) => {
        this.error = 'Failed to create order. Please try again.';
        this.isLoading = false;
        console.error('Error creating order:', err);
      }
    });
    */
  }

  getWhatsAppLink(orderId: string): void {
    this.cartService.getWhatsAppRedirectUrl(orderId).subscribe({
      next: (response) => {
        this.whatsappLink = response.redirectUrl;
      },
      error: (err) => {
        console.error('Error generating WhatsApp link:', err);
        this.error = 'Failed to generate WhatsApp link. You can still view the order.';
      }
    });
  }

  sendToWhatsApp(orderId: string): void {
    this.sendingToWhatsApp = true;

    this.cartService.sendOrderToWhatsApp(orderId).subscribe({
      next: (response) => {
        this.sendingToWhatsApp = false;

        // If we have a direct link, open it in a new window
        if (response.whatsappLink) {
          window.open(response.whatsappLink, '_blank');
        }

        // Update success message
        this.success += ' Order details sent to WhatsApp.';

        // Navigate to orders page after a delay
        setTimeout(() => {
          this.router.navigate(['/admin/orders']);
        }, 2000);
      },
      error: (err) => {
        this.sendingToWhatsApp = false;
        console.error('Error sending to WhatsApp:', err);
        this.error = 'Failed to send order to WhatsApp. Please try again.';
      }
    });
  }

  navigateToOrders(): void {
    this.router.navigate(['/admin/orders']);
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
} 
