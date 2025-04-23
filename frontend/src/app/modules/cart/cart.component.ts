import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SimpleCartService, SimpleCartItem } from '../../core/services/simple-cart.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: SimpleCartItem[] = [];
  private subscription: Subscription = new Subscription();

  subtotal: number = 0;
  shipping: number = 0;
  tax: number = 0;
  total: number = 0;

  customerForm: FormGroup;

  private whatsappBusinessNumber: string = environment.whatsappBusinessNumber; // Format: country code (91) + phone number

  constructor(
    private cartService: SimpleCartService,
    private fb: FormBuilder
  ) {
    this.customerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],  // Email is optional but must be valid if provided
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address: ['', [Validators.required]]  // Address is required
    });
  }

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

    // Fixed packing and delivery charges
    const packingCharge = 15;
    const deliveryCharge = 40;
    this.shipping = packingCharge + deliveryCharge; // Combined packing and delivery charges

    // Remove tax calculation - no longer using tax
    this.tax = 0;

    // Calculate total
    this.total = this.subtotal + this.shipping;
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
    const item = this.cartItems.find(item => item.productId === productId);
    if (item) {
      if (item.quantity > 1) {
        // Decrease the quantity
        item.quantity -= 1;

        // Update cart
        this.cartService['cartItems'] = this.cartItems.map(cartItem =>
          cartItem.productId === productId ? { ...cartItem, quantity: cartItem.quantity } : cartItem
        );
        this.cartService['updateCart']();
      } else {
        // Remove the item if quantity would be 0
        this.removeItem(productId);
      }
    }
  }

  removeItem(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  proceedToWhatsAppCheckout(): void {
    if (this.customerForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.customerForm.controls).forEach(key => {
        this.customerForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Generate WhatsApp message with order details
    const message = this.generateWhatsAppMessage();

    // Create WhatsApp URL (web and app compatible)
    const whatsappUrl = `https://wa.me/${this.whatsappBusinessNumber}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
  }

  private generateWhatsAppMessage(): string {
    const customerInfo = this.customerForm.value;

    // Start with greeting and order intention
    let message = '🛍️ *Order Request - Jewelry Shop* 🛍️\n\n';

    // Add greeting and order intent
    message += `Hello, I'd like to place an order for jewelry items.\n\n`;

    // Add customer information
    message += '*My Information:*\n';
    message += `Name: ${customerInfo.name}\n`;
    message += `Email: ${customerInfo.email}\n`;
    message += `Phone: ${customerInfo.phone}\n`;
    message += `Address: ${customerInfo.address}\n\n`;

    // Organize items by type (chains and pendants)
    const chains = this.cartItems.filter(item => item.type === 'chain');
    const pendants = this.cartItems.filter(item => item.type === 'pendant');
    const combinations = this.cartItems.filter(item => item.type === 'combination');
    const otherItems = this.cartItems.filter(item => !item.type || (item.type !== 'chain' && item.type !== 'pendant' && item.type !== 'combination'));

    message += '*I would like to order the following items:*\n\n';

    // Format combinations section
    if (combinations.length > 0) {
      message += '*Combinations:*\n';
      combinations.forEach((combo, index) => {
        message += `${index + 1}. ${combo.name || 'Combination'} (Code: ${combo.productCode || 'N/A'}) - Qty: ${combo.quantity} - ₹${(combo.price * combo.quantity).toFixed(2)}\n`;

        // Add chain details if available
        if (combo.chainDetails) {
          message += `   a. Chain: ${combo.chainDetails.name || 'Chain'} - Code: ${combo.chainDetails.productCode || 'N/A'} - Type: ${combo.chainDetails.type || 'N/A'} - Size: ${combo.chainDetails.size || 'N/A'} - Layer: ${combo.chainDetails.layer || 'N/A'}\n`;
        }

        // Add pendants
        if (combo.pendantDetails && combo.pendantDetails.length > 0) {
          combo.pendantDetails.forEach((pendant, pIndex) => {
            const letterCode = String.fromCharCode(98 + pIndex); // 98 is ASCII for 'b'
            message += `   ${letterCode}. Pendant: ${pendant.name || 'Pendant'} - Code: ${pendant.productCode || 'N/A'} - Qty: ${pendant.quantity || 1}\n`;
          });
        }
      });
      message += '\n';
    }

    // Format regular items
    let itemNumber = 1;

    // Add chains
    if (chains.length > 0) {
      message += '*Chains:*\n';
      chains.forEach(chain => {
        message += `${itemNumber}. ${chain.name} - Code: ${chain.productCode || 'N/A'} - Qty: ${chain.quantity} - ₹${(chain.price * chain.quantity).toFixed(2)}\n`;
        itemNumber++;
      });
      message += '\n';
    }

    // Add pendants
    if (pendants.length > 0) {
      message += '*Pendants:*\n';
      pendants.forEach(pendant => {
        message += `${itemNumber}. ${pendant.name} - Code: ${pendant.productCode || 'N/A'} - Qty: ${pendant.quantity} - ₹${(pendant.price * pendant.quantity).toFixed(2)}\n`;
        itemNumber++;
      });
      message += '\n';
    }

    // Add other items
    if (otherItems.length > 0) {
      message += '*Other Items:*\n';
      otherItems.forEach(item => {
        message += `${itemNumber}. ${item.name} - Code: ${item.productCode || 'N/A'} - Qty: ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}\n`;
        itemNumber++;
      });
      message += '\n';
    }

    // Add order summary
    message += '*Order Summary:*\n';
    message += `Items Total: ₹${this.subtotal.toFixed(2)}\n`;
    message += `Packing Charge: ₹15.00\n`;
    message += `Delivery Charge: ₹40.00\n`;
    message += `*Total Amount: ₹${this.total.toFixed(2)}*\n\n`;

    // Add closing
    message += "I'd like to confirm this order. Please let me know the next steps for payment and delivery.\n\n";
    message += "Thank you!";

    return message;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
} 
