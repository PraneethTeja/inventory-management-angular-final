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
  selectedPendant: Product | null = null;

  // Form groups
  customerForm: FormGroup;
  orderNotesForm: FormGroup;

  // Order summary
  subtotal = 0;
  tax = 0;
  total = 0;

  // UI state
  activeTab = 'chains';
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
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = '';

    try {
      // Use mock data directly instead of API call
      this.products = this.getMockProducts();

      // Filter products by category
      this.pendants = this.products.filter((p: Product) => p.category === 'pendant');
      this.chains = this.products.filter((p: Product) => p.category === 'chain');

      this.isLoading = false;
      console.log('Products loaded from mock data:', this.products);
    } catch (err) {
      this.error = 'Failed to load products. Please try again.';
      this.isLoading = false;
      console.error('Error loading products:', err);
    }
  }

  // Mock data for development purposes
  getMockProducts(): Product[] {
    return [
      {
        _id: '1',
        name: 'Golden Chain Necklace',
        category: 'chain',
        price: 1200,
        description: 'Beautiful gold-plated chain necklace, perfect for casual and formal wear.',
        inStock: true,
        productCode: 'JW-C001',
        imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
        imageUrls: [],
        stockQuantity: 15,
        details: {
          material: 'Gold-plated brass',
          weight: '8g',
          dimensions: '18 inches',
          features: ['Tarnish-resistant', 'Hypoallergenic']
        },
        featured: true,
        discount: {
          percentage: 10,
          validUntil: new Date('2023-12-31')
        },
        tags: ['gold', 'chain', 'necklace']
      },
      {
        _id: '2',
        name: 'Silver Pendant - Heart',
        category: 'pendant',
        price: 850,
        description: 'Elegant heart-shaped pendant made of sterling silver.',
        inStock: true,
        productCode: 'JW-P001',
        imageUrl: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
        imageUrls: [],
        stockQuantity: 8,
        details: {
          material: 'Sterling Silver',
          weight: '5g',
          dimensions: '2cm x 2cm',
          features: ['Polished finish', 'Hypoallergenic']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['silver', 'pendant', 'heart']
      },
      {
        _id: '3',
        name: 'Rose Gold Chain with Pendant',
        category: 'combination',
        price: 1800,
        description: 'Beautiful rose gold chain with a matching flower pendant.',
        inStock: false,
        productCode: 'JW-CP001',
        imageUrl: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
        imageUrls: [],
        stockQuantity: 0,
        details: {
          material: 'Rose Gold Plated',
          weight: '12g',
          dimensions: '20 inches chain, 3cm pendant',
          features: ['Adjustable length', 'Gift box included']
        },
        featured: true,
        discount: {
          percentage: 15,
          validUntil: new Date('2023-11-30')
        },
        tags: ['rose gold', 'pendant', 'chain', 'combination']
      },
      {
        _id: '4',
        name: 'Pearl Earrings',
        category: 'accessory',
        price: 950,
        description: 'Elegant pearl earrings with silver studs.',
        inStock: true,
        productCode: 'JW-A001',
        imageUrl: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
        imageUrls: [],
        stockQuantity: 12,
        details: {
          material: 'Freshwater Pearl, Sterling Silver',
          weight: '4g',
          dimensions: '1cm diameter',
          features: ['Freshwater pearls', 'Push back closure']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['pearl', 'earrings', 'silver']
      },
      {
        _id: '5',
        name: 'Gold Bangle Set',
        category: 'accessory',
        price: 2400,
        description: 'Set of 3 elegant gold bangles with intricate designs.',
        inStock: true,
        productCode: 'JW-A002',
        imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 8,
        details: {
          material: '18K Gold Plated',
          weight: '30g',
          dimensions: '2.5 inch diameter',
          features: ['Set of 3', 'Traditional design']
        },
        featured: true,
        discount: {
          percentage: 10,
          validUntil: new Date('2023-12-15')
        },
        tags: ['gold', 'bangles', 'set']
      },
      {
        _id: '6',
        name: 'Silver Anklet',
        category: 'accessory',
        price: 850,
        description: 'Delicate silver anklet with small bell charms.',
        inStock: true,
        productCode: 'JW-A003',
        imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 15,
        details: {
          material: 'Sterling Silver',
          weight: '8g',
          dimensions: 'Adjustable 9-11 inches',
          features: ['Bell charms', 'Adjustable']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['silver', 'anklet', 'bells']
      },
      {
        _id: '7',
        name: 'Diamond Pendant',
        category: 'pendant',
        price: 3500,
        description: 'Elegant diamond pendant with white gold chain.',
        inStock: true,
        productCode: 'JW-P003',
        imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 5,
        details: {
          material: 'White Gold, Diamond',
          weight: '3g',
          dimensions: '1.5cm pendant, 18 inch chain',
          features: ['0.5 carat diamond', 'Gift box included']
        },
        featured: true,
        discount: {
          percentage: 5,
          validUntil: new Date('2023-12-25')
        },
        tags: ['diamond', 'pendant', 'white gold']
      },
      {
        _id: '8',
        name: 'Gold Chain Necklace',
        category: 'chain',
        price: 1200,
        description: 'Classic gold chain necklace with lobster clasp.',
        inStock: true,
        productCode: 'JW-C003',
        imageUrl: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 20,
        details: {
          material: '14K Gold Plated',
          weight: '10g',
          dimensions: '20 inches',
          features: ['Lobster clasp', 'Tarnish resistant']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['gold', 'chain', 'necklace']
      },
      {
        _id: '9',
        name: 'Ruby Pendant',
        category: 'pendant',
        price: 2800,
        description: 'Stunning ruby pendant with gold setting.',
        inStock: true,
        productCode: 'JW-P004',
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 7,
        details: {
          material: 'Gold, Ruby',
          weight: '4g',
          dimensions: '1.2cm pendant',
          features: ['Natural ruby', 'Handcrafted']
        },
        featured: true,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['ruby', 'pendant', 'gold']
      },
      {
        _id: '10',
        name: 'Silver Toe Ring Set',
        category: 'accessory',
        price: 550,
        description: 'Set of 5 silver toe rings with different designs.',
        inStock: true,
        productCode: 'JW-A004',
        imageUrl: 'https://images.unsplash.com/photo-1611591437280-5d8b169981a1?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 25,
        details: {
          material: 'Sterling Silver',
          weight: '5g',
          dimensions: 'Adjustable size',
          features: ['Set of 5', 'Traditional designs']
        },
        featured: false,
        discount: {
          percentage: 15,
          validUntil: new Date('2023-11-20')
        },
        tags: ['silver', 'toe ring', 'set']
      },
      {
        _id: '11',
        name: 'Pearl Pendant',
        category: 'pendant',
        price: 1500,
        description: 'Elegant pearl pendant with silver setting.',
        inStock: true,
        productCode: 'JW-P005',
        imageUrl: 'https://images.unsplash.com/photo-1602752250015-52934bc45613?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 10,
        details: {
          material: 'Sterling Silver, Freshwater Pearl',
          weight: '5g',
          dimensions: '1.5cm pendant',
          features: ['Freshwater pearl', 'Rhodium plated']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['pearl', 'pendant', 'silver']
      },
      {
        _id: '12',
        name: 'Platinum Chain',
        category: 'chain',
        price: 3200,
        description: 'Premium platinum chain with box link design.',
        inStock: true,
        productCode: 'JW-C004',
        imageUrl: 'https://images.unsplash.com/photo-1599643478539-a9e57b638d6d?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 5,
        details: {
          material: 'Platinum',
          weight: '15g',
          dimensions: '22 inches',
          features: ['Box link design', 'Hypoallergenic']
        },
        featured: true,
        discount: {
          percentage: 5,
          validUntil: new Date('2023-12-31')
        },
        tags: ['platinum', 'chain', 'premium']
      },
      {
        _id: '13',
        name: 'Emerald Earrings',
        category: 'accessory',
        price: 2700,
        description: 'Beautiful emerald stud earrings with gold setting.',
        inStock: true,
        productCode: 'JW-A005',
        imageUrl: 'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 8,
        details: {
          material: '18K Gold, Emerald',
          weight: '4g',
          dimensions: '0.8cm diameter',
          features: ['Natural emeralds', 'Butterfly backs']
        },
        featured: true,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['emerald', 'earrings', 'gold']
      },
      {
        _id: '14',
        name: 'Sapphire Pendant',
        category: 'pendant',
        price: 3100,
        description: 'Exquisite sapphire pendant with white gold setting.',
        inStock: true,
        productCode: 'JW-P006',
        imageUrl: 'https://images.unsplash.com/photo-1605100804746-b4888132db37?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 6,
        details: {
          material: 'White Gold, Sapphire',
          weight: '4g',
          dimensions: '1.2cm pendant',
          features: ['Natural sapphire', 'Handcrafted']
        },
        featured: false,
        discount: {
          percentage: 10,
          validUntil: new Date('2023-11-15')
        },
        tags: ['sapphire', 'pendant', 'white gold']
      },
      {
        _id: '15',
        name: 'Silver Link Bracelet',
        category: 'accessory',
        price: 980,
        description: 'Stylish silver link bracelet with toggle clasp.',
        inStock: true,
        productCode: 'JW-A006',
        imageUrl: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 15,
        details: {
          material: 'Sterling Silver',
          weight: '12g',
          dimensions: '7.5 inches',
          features: ['Toggle clasp', 'Polished finish']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['silver', 'bracelet', 'link']
      },
      {
        _id: '16',
        name: 'Rose Gold Hoop Earrings',
        category: 'accessory',
        price: 1100,
        description: 'Elegant rose gold hoop earrings with click closure.',
        inStock: true,
        productCode: 'JW-A007',
        imageUrl: 'https://images.unsplash.com/photo-1630019852942-7a3592373ed2?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 12,
        details: {
          material: 'Rose Gold Plated',
          weight: '6g',
          dimensions: '3cm diameter',
          features: ['Click closure', 'Lightweight']
        },
        featured: true,
        discount: {
          percentage: 5,
          validUntil: new Date('2023-12-10')
        },
        tags: ['rose gold', 'earrings', 'hoop']
      },
      {
        _id: '17',
        name: 'Twisted Gold Chain',
        category: 'chain',
        price: 1800,
        description: 'Elegant twisted gold chain with secure clasp.',
        inStock: true,
        productCode: 'JW-C005',
        imageUrl: 'https://images.unsplash.com/photo-1599643478467-8c97e94e3d22?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 10,
        details: {
          material: '18K Gold Plated',
          weight: '14g',
          dimensions: '18 inches',
          features: ['Twisted design', 'Lobster clasp']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['gold', 'chain', 'twisted']
      },
      {
        _id: '18',
        name: 'Heart Pendant',
        category: 'pendant',
        price: 1300,
        description: 'Lovely heart-shaped pendant with cubic zirconia.',
        inStock: true,
        productCode: 'JW-P007',
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 18,
        details: {
          material: 'Sterling Silver, Cubic Zirconia',
          weight: '3g',
          dimensions: '1.5cm heart',
          features: ['Heart shape', 'Sparkly finish']
        },
        featured: true,
        discount: {
          percentage: 15,
          validUntil: new Date('2023-11-25')
        },
        tags: ['heart', 'pendant', 'silver']
      },
      {
        _id: '19',
        name: 'Gold Nose Pin',
        category: 'accessory',
        price: 650,
        description: 'Delicate gold nose pin with small diamond.',
        inStock: true,
        productCode: 'JW-A008',
        imageUrl: 'https://images.unsplash.com/photo-1611591437280-5d8b169981a1?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 25,
        details: {
          material: '14K Gold, Diamond',
          weight: '0.5g',
          dimensions: '0.3cm diameter',
          features: ['Small diamond', 'Screw back']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['gold', 'nose pin', 'diamond']
      },
      {
        _id: '20',
        name: 'Silver Snake Chain',
        category: 'chain',
        price: 950,
        description: 'Sleek silver snake chain with secure clasp.',
        inStock: true,
        productCode: 'JW-C006',
        imageUrl: 'https://images.unsplash.com/photo-1599643478539-a9e57b638d6d?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 15,
        details: {
          material: 'Sterling Silver',
          weight: '8g',
          dimensions: '20 inches',
          features: ['Snake design', 'Lobster clasp']
        },
        featured: false,
        discount: {
          percentage: 5,
          validUntil: new Date('2023-12-05')
        },
        tags: ['silver', 'chain', 'snake']
      },
      {
        _id: '21',
        name: 'Turquoise Pendant',
        category: 'pendant',
        price: 1200,
        description: 'Beautiful turquoise pendant with silver setting.',
        inStock: true,
        productCode: 'JW-P008',
        imageUrl: 'https://images.unsplash.com/photo-1602752250015-52934bc45613?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 10,
        details: {
          material: 'Sterling Silver, Turquoise',
          weight: '5g',
          dimensions: '2cm pendant',
          features: ['Natural turquoise', 'Boho style']
        },
        featured: true,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['turquoise', 'pendant', 'silver']
      },
      {
        _id: '22',
        name: 'Gold Tennis Bracelet',
        category: 'accessory',
        price: 2500,
        description: 'Elegant gold tennis bracelet with cubic zirconia.',
        inStock: true,
        productCode: 'JW-A009',
        imageUrl: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 8,
        details: {
          material: '18K Gold Plated, Cubic Zirconia',
          weight: '15g',
          dimensions: '7 inches',
          features: ['Tennis style', 'Safety clasp']
        },
        featured: true,
        discount: {
          percentage: 10,
          validUntil: new Date('2023-11-30')
        },
        tags: ['gold', 'bracelet', 'tennis']
      },
      {
        _id: '23',
        name: 'Amethyst Pendant',
        category: 'pendant',
        price: 1700,
        description: 'Stunning amethyst pendant with silver setting.',
        inStock: true,
        productCode: 'JW-P009',
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 7,
        details: {
          material: 'Sterling Silver, Amethyst',
          weight: '4g',
          dimensions: '1.5cm pendant',
          features: ['Natural amethyst', 'Handcrafted']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['amethyst', 'pendant', 'silver']
      },
      {
        _id: '24',
        name: 'Rope Gold Chain',
        category: 'chain',
        price: 2100,
        description: 'Classic rope design gold chain with secure clasp.',
        inStock: true,
        productCode: 'JW-C007',
        imageUrl: 'https://images.unsplash.com/photo-1599643478467-8c97e94e3d22?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 10,
        details: {
          material: '14K Gold Plated',
          weight: '18g',
          dimensions: '22 inches',
          features: ['Rope design', 'Lobster clasp']
        },
        featured: true,
        discount: {
          percentage: 5,
          validUntil: new Date('2023-12-15')
        },
        tags: ['gold', 'chain', 'rope']
      },
      {
        _id: '25',
        name: 'Silver Charm Bracelet',
        category: 'accessory',
        price: 1100,
        description: 'Stylish silver charm bracelet with 5 charms included.',
        inStock: true,
        productCode: 'JW-A010',
        imageUrl: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 12,
        details: {
          material: 'Sterling Silver',
          weight: '14g',
          dimensions: '7.5 inches',
          features: ['5 charms included', 'Toggle clasp']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['silver', 'bracelet', 'charm']
      },
      {
        _id: '26',
        name: 'Opal Pendant',
        category: 'pendant',
        price: 1900,
        description: 'Beautiful opal pendant with gold setting.',
        inStock: true,
        productCode: 'JW-P010',
        imageUrl: 'https://images.unsplash.com/photo-1602752250015-52934bc45613?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 6,
        details: {
          material: '14K Gold, Opal',
          weight: '3g',
          dimensions: '1.2cm pendant',
          features: ['Natural opal', 'Iridescent']
        },
        featured: true,
        discount: {
          percentage: 10,
          validUntil: new Date('2023-11-20')
        },
        tags: ['opal', 'pendant', 'gold']
      },
      {
        _id: '27',
        name: 'Diamond Stud Earrings',
        category: 'accessory',
        price: 3200,
        description: 'Classic diamond stud earrings with white gold setting.',
        inStock: true,
        productCode: 'JW-A011',
        imageUrl: 'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 5,
        details: {
          material: 'White Gold, Diamond',
          weight: '2g',
          dimensions: '0.5cm diameter',
          features: ['0.25 carat each', 'Screw backs']
        },
        featured: true,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['diamond', 'earrings', 'white gold']
      },
      {
        _id: '28',
        name: 'Box Chain Silver',
        category: 'chain',
        price: 850,
        description: 'Sleek box chain design in sterling silver.',
        inStock: true,
        productCode: 'JW-C008',
        imageUrl: 'https://images.unsplash.com/photo-1599643478539-a9e57b638d6d?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 20,
        details: {
          material: 'Sterling Silver',
          weight: '10g',
          dimensions: '20 inches',
          features: ['Box design', 'Spring ring clasp']
        },
        featured: false,
        discount: {
          percentage: 5,
          validUntil: new Date('2023-12-01')
        },
        tags: ['silver', 'chain', 'box']
      },
      {
        _id: '29',
        name: 'Citrine Pendant',
        category: 'pendant',
        price: 1400,
        description: 'Vibrant citrine pendant with gold setting.',
        inStock: true,
        productCode: 'JW-P011',
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 8,
        details: {
          material: '14K Gold, Citrine',
          weight: '4g',
          dimensions: '1.3cm pendant',
          features: ['Natural citrine', 'Handcrafted']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['citrine', 'pendant', 'gold']
      },
      {
        _id: '30',
        name: 'Pearl Necklace',
        category: 'accessory',
        price: 2200,
        description: 'Elegant freshwater pearl necklace with silver clasp.',
        inStock: true,
        productCode: 'JW-A012',
        imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 7,
        details: {
          material: 'Freshwater Pearl, Sterling Silver',
          weight: '25g',
          dimensions: '18 inches',
          features: ['Graduated pearls', 'Silver clasp']
        },
        featured: true,
        discount: {
          percentage: 10,
          validUntil: new Date('2023-11-15')
        },
        tags: ['pearl', 'necklace', 'silver']
      },
      {
        _id: '31',
        name: 'Figaro Gold Chain',
        category: 'chain',
        price: 1700,
        description: 'Classic figaro link gold chain with secure clasp.',
        inStock: true,
        productCode: 'JW-C009',
        imageUrl: 'https://images.unsplash.com/photo-1599643478467-8c97e94e3d22?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 12,
        details: {
          material: '18K Gold Plated',
          weight: '16g',
          dimensions: '24 inches',
          features: ['Figaro link', 'Lobster clasp']
        },
        featured: false,
        discount: {
          percentage: 0,
          validUntil: undefined
        },
        tags: ['gold', 'chain', 'figaro']
      },
      {
        _id: '32',
        name: 'Garnet Pendant',
        category: 'pendant',
        price: 1600,
        description: 'Rich red garnet pendant with silver setting.',
        inStock: true,
        productCode: 'JW-P012',
        imageUrl: 'https://images.unsplash.com/photo-1602752250015-52934bc45613?ixlib=rb-4.0.3',
        imageUrls: [],
        stockQuantity: 9,
        details: {
          material: 'Sterling Silver, Garnet',
          weight: '4g',
          dimensions: '1.4cm pendant',
          features: ['Natural garnet', 'Deep red color']
        },
        featured: true,
        discount: {
          percentage: 5,
          validUntil: new Date('2023-12-10')
        },
        tags: ['garnet', 'pendant', 'silver']
      }
    ];
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  addItemToOrder(product: Product): void {
    // Check if product is already in order
    const existingItem = this.orderItems.find(item =>
      item.product._id === product._id && !item.isCombo);

    if (existingItem) {
      // Increase quantity
      existingItem.quantity += 1;
    } else {
      // Add new item
      this.orderItems.push({
        product: product,
        quantity: 1,
        isCombo: false
      });
    }

    this.updateOrderSummary();
  }

  openComboModal(): void {
    this.selectedPendants = [];
    this.selectedChain = null;
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
    } else {
      this.selectedChain = chain;
    }
  }

  addComboToOrder(): void {
    if (this.selectedPendants.length > 0 && this.selectedChain) {
      // Calculate total pendant price
      const totalPendantPrice = this.selectedPendants.reduce((sum, pendant) => sum + pendant.price, 0);
      const comboPrice = this.selectedChain.price + totalPendantPrice;

      // Create pendant names string
      const pendantNames = this.selectedPendants.map(p => p.name).join(', ');
      const comboName = `${this.selectedChain.name} with ${pendantNames}`;

      // Choose an image (prefer the first pendant's image if available)
      const comboImage = this.selectedPendants[0]?.imageUrl || this.selectedChain.imageUrl;

      // Create a virtual product for the combo
      const comboProduct: Product = {
        _id: `combo-${Date.now()}`,
        name: comboName,
        category: 'combination',
        price: comboPrice,
        description: `Combination of ${this.selectedChain.name} and ${pendantNames}`,
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
        chainProduct: this.selectedChain
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

        // Add the chain info
        if (item.chainProduct) {
          orderItem.combinationDetails.chainInfo = {
            id: item.chainProduct._id,
            name: item.chainProduct.name,
            price: item.chainProduct.price
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
} 
