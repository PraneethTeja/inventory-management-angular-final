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
  limit,
  addDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '../../../../app.config';

// Add a new interface for pendants with quantity
interface PendantWithQuantity extends Product {
  quantity: number;
}

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
      email: ['', [Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      address: ['', [Validators.required]]
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
    // Find if the pendant is already in the selection
    const index = this.selectedPendants.findIndex(p => p._id === pendant._id);

    if (index >= 0) {
      // Instead of removing it, increment its quantity
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

  isPendantSelected(pendant: Product): boolean {
    return this.selectedPendants.some(p => p._id === pendant._id);
  }

  // Add a new method to get the pendant quantity
  getPendantQuantity(pendant: Product): number {
    const found = this.selectedPendants.find(p => p._id === pendant._id);
    return found?.quantity || 0;
  }

  // Method to decrease pendant quantity
  decreasePendantQuantity(pendant: Product, event: Event): void {
    // Stop click event from propagating to parent (which would add quantity)
    if (event) {
      event.stopPropagation();
    }

    const index = this.selectedPendants.findIndex(p => p._id === pendant._id);
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

  // Calculate the price based on the fixed price structure
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

  addComboToOrder(): void {
    // Only check for chain layer if chain type is 'Chain', otherwise it's not needed
    const isChainLayerRequired = this.selectedChainType === 'Chain';
    if (this.selectedPendants.length === 0 || !this.selectedChain || !this.selectedChainType || !this.selectedChainSize ||
      (isChainLayerRequired && !this.selectedChainLayer)) {
      return;
    }

    // Calculate base price - this is now just the jewelry price without additional charges
    const basePrice = this.calculateCombinationPrice();

    // Create pendant names string with quantities
    const pendantsList = this.selectedPendants.map(pendant => {
      return pendant.quantity > 1 ? `${pendant.name} (x${pendant.quantity})` : pendant.name;
    });

    const firstPendantName = pendantsList[0];
    const pendantCount = this.selectedPendants.reduce((count, pendant) => {
      return count + pendant.quantity;
    }, 0);

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

    // Count the pendants for price description
    const pendantTotal = this.selectedPendants.reduce((total, pendant) => total + pendant.quantity, 0);

    // Create description with price breakdown
    let priceDescription = '';

    if (this.selectedChainType === 'Chain') {
      priceDescription = `${this.selectedChainLayer} layered chain with ${pendantTotal} pendant${pendantTotal > 1 ? 's' : ''}`;
    } else {
      priceDescription = `${this.selectedChainType} with ${pendantTotal} pendant${pendantTotal > 1 ? 's' : ''}`;
    }

    priceDescription += ` (Price: ₹${basePrice})`;

    // Create a virtual product for the combo
    const comboProduct: Product = {
      _id: `combo-${Date.now()}`,
      name: comboName,
      category: 'combination',
      price: basePrice,
      description: priceDescription,
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

    // Create chain details object
    const chainDetails: any = {
      product: this.selectedChain,
      type: this.selectedChainType,
      size: this.selectedChainSize
    };

    // Only add layer info if it's a Chain type
    if (this.selectedChainType === 'Chain') {
      chainDetails.layer = this.selectedChainLayer;
    }

    this.orderItems.push({
      product: comboProduct,
      quantity: 1,
      isCombo: true,
      pendantProducts: [...this.selectedPendants],
      chainProduct: this.selectedChain,
      chainType: this.selectedChainType,
      chainSize: this.selectedChainSize,
      chainLayer: this.selectedChainLayer,
      pendantCount: pendantTotal,
      basePrice: basePrice
    });

    this.closeComboModal();
    this.updateOrderSummary();
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

  // Add this method to calculate items total
  calculateItemsTotal(): number {
    return this.orderItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }

  updateOrderSummary(): void {
    // Calculate subtotal (just the items)
    const itemsTotal = this.calculateItemsTotal();

    // Add fixed packing and delivery charges to get the total
    // Only add these charges if there are items in the order
    if (this.orderItems.length > 0) {
      // Add one-time packing charge (₹15) for the entire order
      const packingCharge = 15;

      // Add one-time delivery charge (₹40) for the entire order
      const deliveryCharge = 40;

      // Total is just items + packing + delivery (no tax)
      this.total = itemsTotal + packingCharge + deliveryCharge;
    } else {
      this.total = 0;
    }

    // Keep subtotal for order data tracking
    this.subtotal = itemsTotal;
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

    // Calculate packing and delivery charges separately
    const packingCharge = 15;
    const deliveryCharge = 40;

    // Calculate the product subtotal (without packing and delivery charges)
    const productSubtotal = this.calculateItemsTotal();

    // Generate a user-friendly order ID: ORD-[timestamp in milliseconds]
    const friendlyOrderId = `ORD-${Date.now().toString().slice(-6)}`;

    const orderData = {
      _id: friendlyOrderId, // User-friendly order ID
      customer: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address // Add address to order data
      },
      items: formattedItems,
      status: 'confirmed' as OrderStatus,
      subtotal: productSubtotal,
      packingCharge: packingCharge,
      deliveryCharge: deliveryCharge,
      totalAmount: this.total,
      shippingCost: 0,
      discount: 0,
      paymentMethod: 'cash' as PaymentMethod,
      paymentStatus: 'paid' as PaymentStatus,
      whatsapp: {
        messageSent: false
      },
      notes: notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Save order to Firestore
    this.saveOrderToFirestore(orderData)
      .then(orderId => {
        console.log('Order created in Firestore:', orderId);
        this.success = `Order #${friendlyOrderId} created successfully!`;
        this.isLoading = false;

        // Store the order ID
        this.createdOrderId = friendlyOrderId;

        // Show WhatsApp option
        this.showWhatsAppButton = true;

        // Clear order items
        this.orderItems = [];
        this.updateOrderSummary();
      })
      .catch(error => {
        this.error = 'Failed to create order. Please try again.';
        this.isLoading = false;
        console.error('Error creating order in Firestore:', error);
      });
  }

  // Function to save order to Firestore
  async saveOrderToFirestore(orderData: any): Promise<string> {
    try {
      // Get the 'orders' collection reference
      const ordersCollectionRef = collection(firestore, 'orders');

      // Add the document to the collection (Firebase will generate a unique ID)
      const orderDocRef = await addDoc(ordersCollectionRef, orderData);

      // Additionally, set a document with the friendly order ID
      await setDoc(doc(firestore, 'orders', orderData._id), orderData);

      return orderData._id;
    } catch (error) {
      console.error('Error saving order to Firestore:', error);
      throw error;
    }
  }

  sendToWhatsApp(orderId: string): void {
    this.sendingToWhatsApp = true;

    // Generate WhatsApp message with order details
    const message = this.generateWhatsAppMessage();

    // Get customer phone from the form
    const customerPhone = this.customerForm.get('phone')?.value;
    if (!customerPhone) {
      this.sendingToWhatsApp = false;
      this.error = 'Customer phone number is missing. Cannot send to WhatsApp.';
      return;
    }

    // Format phone number for WhatsApp (add country code if not present)
    const formattedPhone = customerPhone.startsWith('91') ? customerPhone : `91${customerPhone}`;

    // Create WhatsApp URL (web and app compatible)
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');

    this.sendingToWhatsApp = false;

    // Update success message
    this.success += ' Order details opened in WhatsApp.';
  }

  private generateWhatsAppMessage(): string {
    const customerData = this.customerForm.value;

    // Simple confirmation message
    let message = '🛍️ *Order Confirmation - Jewelry Shop* 🛍️\n\n';

    // Add greeting with customer name
    message += `Dear ${customerData.name},\n\n`;

    // Add order confirmation
    message += `Thank you for your order! We're pleased to confirm that your order #${this.createdOrderId} has been received and is being processed.\n\n`;

    // Add order total
    message += `*Order Total:* ₹${this.total.toFixed(2)}\n\n`;

    // Add next steps
    message += `Your order will be packed soon and we'll update you on the shipping details.\n\n`;

    // Add closing
    message += `If you have any questions about your order, please don't hesitate to contact us.\n\n`;

    // Add thank you note
    message += `Thank you for shopping with us!\n`;
    message += `Jewelry Shop Team`;

    return message;
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
