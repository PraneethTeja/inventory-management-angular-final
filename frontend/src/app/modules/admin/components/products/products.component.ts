import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  inStock: boolean;
  productCode: string;
  imageUrl: string;
  imageUrls: string[];
  stockQuantity: number;
  details: {
    material: string;
    weight: string;
    dimensions: string;
    features: string[];
  };
  featured: boolean;
  discount: {
    percentage: number;
    validUntil: Date | null;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  discountedPrice?: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = ['All', 'chain', 'pendant', 'combination'];
  selectedCategory: string = 'All';

  isLoading: boolean = true;
  error: string = '';
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  currentProduct: Product | null = null;

  productForm: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private ngZone: NgZone
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      category: ['chain', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      description: ['', [Validators.required]],
      productCode: ['', [Validators.required]],
      imageUrl: [''],
      stockQuantity: [0, [Validators.required, Validators.min(0)]],
      details: this.fb.group({
        material: [''],
        weight: [''],
        dimensions: [''],
        features: ['']
      }),
      featured: [false],
      discount: this.fb.group({
        percentage: [0, [Validators.min(0), Validators.max(100)]],
        validUntil: [null]
      }),
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = '';

    console.log('Attempting to load products from API...');

    this.http.get<Product[]>(`${environment.apiUrl}/products`)
      .pipe(
        catchError(err => {
          console.error('Error loading products from API:', err);
          console.log('Falling back to mock data...');
          return of(this.getMockProducts());
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Response received, setting products data');
          // this.products = data;
          this.products = this.getMockProducts();
          this.filterProducts();
          this.setLoadingState(false);
          console.log('Loading state set to false, products loaded successfully:', this.products);
        },
        error: (err) => {
          console.error('Error in subscribe error handler:', err);
          this.error = 'Failed to load products. Using mock data instead.';
          this.products = this.getMockProducts();
          this.filterProducts();
          this.setLoadingState(false);
          console.log('Error handler: Loading state set to false, using mock data');
        },
        complete: () => {
          console.log('Observable completed, ensuring loading state is false');
          this.setLoadingState(false);
        }
      });
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
        tags: ['gold', 'chain', 'necklace'
        ],
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2023-01-15'),
        discountedPrice: 1080
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
          validUntil: null
        },
        tags: ['silver', 'pendant', 'heart'
        ],
        createdAt: new Date('2023-02-10'),
        updatedAt: new Date('2023-02-10'),
        discountedPrice: 850
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
        tags: ['rose gold', 'pendant', 'chain', 'combination'
        ],
        createdAt: new Date('2023-03-05'),
        updatedAt: new Date('2023-03-20'),
        discountedPrice: 1530
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
          validUntil: null
        },
        tags: ['pearl', 'earrings', 'silver'
        ],
        createdAt: new Date('2023-04-12'),
        updatedAt: new Date('2023-04-12'),
        discountedPrice: 950
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
        tags: ['gold', 'bangles', 'set'
        ],
        createdAt: new Date('2023-05-10'),
        updatedAt: new Date('2023-05-10'),
        discountedPrice: 2160
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
          validUntil: null
        },
        tags: ['silver', 'anklet', 'bells'
        ],
        createdAt: new Date('2023-05-15'),
        updatedAt: new Date('2023-05-15'),
        discountedPrice: 850
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
        tags: ['diamond', 'pendant', 'white gold'
        ],
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date('2023-06-01'),
        discountedPrice: 3325
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
          validUntil: null
        },
        tags: ['gold', 'chain', 'necklace'
        ],
        createdAt: new Date('2023-06-10'),
        updatedAt: new Date('2023-06-10'),
        discountedPrice: 1200
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
          validUntil: null
        },
        tags: ['ruby', 'pendant', 'gold'
        ],
        createdAt: new Date('2023-06-15'),
        updatedAt: new Date('2023-06-15'),
        discountedPrice: 2800
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
        tags: ['silver', 'toe ring', 'set'
        ],
        createdAt: new Date('2023-06-20'),
        updatedAt: new Date('2023-06-20'),
        discountedPrice: 467.5
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
          validUntil: null
        },
        tags: ['pearl', 'pendant', 'silver'
        ],
        createdAt: new Date('2023-06-25'),
        updatedAt: new Date('2023-06-25'),
        discountedPrice: 1500
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
        tags: ['platinum', 'chain', 'premium'
        ],
        createdAt: new Date('2023-07-01'),
        updatedAt: new Date('2023-07-01'),
        discountedPrice: 3040
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
          validUntil: null
        },
        tags: ['emerald', 'earrings', 'gold'
        ],
        createdAt: new Date('2023-07-05'),
        updatedAt: new Date('2023-07-05'),
        discountedPrice: 2700
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
        tags: ['sapphire', 'pendant', 'white gold'
        ],
        createdAt: new Date('2023-07-10'),
        updatedAt: new Date('2023-07-10'),
        discountedPrice: 2790
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
          validUntil: null
        },
        tags: ['silver', 'bracelet', 'link'
        ],
        createdAt: new Date('2023-07-15'),
        updatedAt: new Date('2023-07-15'),
        discountedPrice: 980
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
        tags: ['rose gold', 'earrings', 'hoop'
        ],
        createdAt: new Date('2023-07-20'),
        updatedAt: new Date('2023-07-20'),
        discountedPrice: 1045
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
          validUntil: null
        },
        tags: ['gold', 'chain', 'twisted'
        ],
        createdAt: new Date('2023-07-25'),
        updatedAt: new Date('2023-07-25'),
        discountedPrice: 1800
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
        tags: ['heart', 'pendant', 'silver'
        ],
        createdAt: new Date('2023-08-01'),
        updatedAt: new Date('2023-08-01'),
        discountedPrice: 1105
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
          validUntil: null
        },
        tags: ['gold', 'nose pin', 'diamond'
        ],
        createdAt: new Date('2023-08-05'),
        updatedAt: new Date('2023-08-05'),
        discountedPrice: 650
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
        tags: ['silver', 'chain', 'snake'
        ],
        createdAt: new Date('2023-08-10'),
        updatedAt: new Date('2023-08-10'),
        discountedPrice: 902.5
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
          validUntil: null
        },
        tags: ['turquoise', 'pendant', 'silver'
        ],
        createdAt: new Date('2023-08-15'),
        updatedAt: new Date('2023-08-15'),
        discountedPrice: 1200
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
        tags: ['gold', 'bracelet', 'tennis'
        ],
        createdAt: new Date('2023-08-20'),
        updatedAt: new Date('2023-08-20'),
        discountedPrice: 2250
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
          validUntil: null
        },
        tags: ['amethyst', 'pendant', 'silver'
        ],
        createdAt: new Date('2023-08-25'),
        updatedAt: new Date('2023-08-25'),
        discountedPrice: 1700
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
        tags: ['gold', 'chain', 'rope'
        ],
        createdAt: new Date('2023-09-01'),
        updatedAt: new Date('2023-09-01'),
        discountedPrice: 1995
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
          validUntil: null
        },
        tags: ['silver', 'bracelet', 'charm'
        ],
        createdAt: new Date('2023-09-05'),
        updatedAt: new Date('2023-09-05'),
        discountedPrice: 1100
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
        tags: ['opal', 'pendant', 'gold'
        ],
        createdAt: new Date('2023-09-10'),
        updatedAt: new Date('2023-09-10'),
        discountedPrice: 1710
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
          validUntil: null
        },
        tags: ['diamond', 'earrings', 'white gold'
        ],
        createdAt: new Date('2023-09-15'),
        updatedAt: new Date('2023-09-15'),
        discountedPrice: 3200
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
        tags: ['silver', 'chain', 'box'
        ],
        createdAt: new Date('2023-09-20'),
        updatedAt: new Date('2023-09-20'),
        discountedPrice: 807.5
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
          validUntil: null
        },
        tags: ['citrine', 'pendant', 'gold'
        ],
        createdAt: new Date('2023-09-25'),
        updatedAt: new Date('2023-09-25'),
        discountedPrice: 1400
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
        tags: ['pearl', 'necklace', 'silver'
        ],
        createdAt: new Date('2023-10-01'),
        updatedAt: new Date('2023-10-01'),
        discountedPrice: 1980
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
          validUntil: null
        },
        tags: ['gold', 'chain', 'figaro'
        ],
        createdAt: new Date('2023-10-05'),
        updatedAt: new Date('2023-10-05'),
        discountedPrice: 1700
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
        tags: ['garnet', 'pendant', 'silver'
        ],
        createdAt: new Date('2023-10-05'),
        updatedAt: new Date('2023-10-05'),
        discountedPrice: 1520
      }
    ];
  }

  filterProducts(): void {
    if (this.selectedCategory === 'All') {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(
        p => p.category === this.selectedCategory
      );
    }
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterProducts();
  }

  openAddModal(): void {
    this.productForm.reset({
      category: 'chain',
      price: 0,
      stockQuantity: 0,
      featured: false,
      discount: {
        percentage: 0,
        validUntil: null
      }
    });
    this.showAddModal = true;
  }

  openEditModal(product: Product): void {
    this.currentProduct = product;

    // Convert features array to comma-separated string for the form
    const featuresString = product.details.features ? product.details.features.join(', ') : '';
    const tagsString = product.tags ? product.tags.join(', ') : '';

    this.productForm.setValue({
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      productCode: product.productCode,
      imageUrl: product.imageUrl,
      stockQuantity: product.stockQuantity,
      details: {
        material: product.details.material || '',
        weight: product.details.weight || '',
        dimensions: product.details.dimensions || '',
        features: featuresString
      },
      featured: product.featured,
      discount: {
        percentage: product.discount.percentage,
        validUntil: product.discount.validUntil
      },
      tags: tagsString
    });

    this.showEditModal = true;
  }

  closeModal(): void {
    this.showAddModal = false;
    this.showEditModal = false;
    this.currentProduct = null;
    this.productForm.reset();
  }

  submitProduct(): void {
    if (this.productForm.invalid) {
      return;
    }

    const formData = this.productForm.value;

    // Convert comma-separated features to array
    if (formData.details && formData.details.features) {
      try {
        if (Array.isArray(formData.details.features)) {
          formData.details.features = formData.details.features.filter((feature: string) => feature);
        } else {
          formData.details.features = formData.details.features
            .split(',')
            .map((feature: string) => feature.trim())
            .filter((feature: string) => feature);
        }
      } catch (error) {
        console.error('Error processing features:', error);
        formData.details.features = [];
      }
    } else {
      if (!formData.details) formData.details = {};
      formData.details.features = [];
    }

    // Convert comma-separated tags to array
    if (formData.tags) {
      try {
        if (Array.isArray(formData.tags)) {
          formData.tags = formData.tags.filter((tag: string) => tag);
        } else {
          formData.tags = formData.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag);
        }
      } catch (error) {
        console.error('Error processing tags:', error);
        formData.tags = [];
      }
    } else {
      formData.tags = [];
    }

    this.isLoading = true;

    if (this.showAddModal) {
      // For mock mode, simply add to local array
      try {
        const newProduct: Product = {
          _id: Date.now().toString(),// Generate a mock ID
          ...formData,
          inStock: formData.stockQuantity > 0,
          imageUrls: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          discountedPrice: formData.discount.percentage > 0
            ? formData.price * (1 - formData.discount.percentage / 100)
            : formData.price
        };

        this.products.unshift(newProduct);
        this.filterProducts();
        this.closeModal();
        this.isLoading = false;
      } catch (err) {
        this.error = 'Failed to create product. Please try again.';
        this.isLoading = false;
        console.error('Error creating product:', err);
      }

      // In a real scenario, this would be an API call
      /*
      this.http.post(`${environment.apiUrl}/products`, formData)
        .subscribe({
          next: () => {
            this.loadProducts();
            this.closeModal();
            this.isLoading = false;
          },
          error: (err) => {
            this.error = 'Failed to create product. Please try again.';
            this.isLoading = false;
            console.error('Error creating product:', err);
          }
        });
      */
    } else if (this.showEditModal && this.currentProduct) {
      // For mock mode, update in the local array
      try {
        const index = this.products.findIndex(p => p._id === this.currentProduct?._id);
        if (index !== -1) {
          const updatedProduct: Product = {
            ...this.products[index],
            ...formData,
            inStock: formData.stockQuantity > 0,
            updatedAt: new Date(),
            discountedPrice: formData.discount.percentage > 0
              ? formData.price * (1 - formData.discount.percentage / 100)
              : formData.price
          };

          this.products[index] = updatedProduct;
          this.filterProducts();
          this.closeModal();
          this.isLoading = false;
        }
      } catch (err) {
        this.error = 'Failed to update product. Please try again.';
        this.isLoading = false;
        console.error('Error updating product:', err);
      }

      // In a real scenario, this would be an API call
      /*
      this.http.put(`${environment.apiUrl}/products/${this.currentProduct._id}`, formData)
        .subscribe({
          next: () => {
            this.loadProducts();
            this.closeModal();
            this.isLoading = false;
          },
          error: (err) => {
            this.error = 'Failed to update product. Please try again.';
            this.isLoading = false;
            console.error('Error updating product:', err);
          }
        });
      */
    }
  }

  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.isLoading = true;

      // For mock mode, remove from the local array
      try {
        this.products = this.products.filter(p => p._id !== product._id);
        this.filterProducts();
        this.isLoading = false;
      } catch (err) {
        this.error = 'Failed to delete product. Please try again.';
        this.isLoading = false;
        console.error('Error deleting product:', err);
      }

      // In a real scenario, this would be an API call
      /*
      this.http.delete(`${environment.apiUrl}/products/${product._id}`)
        .subscribe({
          next: () => {
            this.loadProducts();
            this.isLoading = false;
          },
          error: (err) => {
            this.error = 'Failed to delete product. Please try again.';
            this.isLoading = false;
            console.error('Error deleting product:', err);
          }
        });
      */
    }
  }

  // Helper methods for template
  getCategoryLabel(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  getDiscountBadge(product: Product): string {
    if (product.discount.percentage > 0) {
      return `-${product.discount.percentage}%`;
    }
    return '';
  }

  // Helper method to ensure loading state is updated properly
  private setLoadingState(state: boolean): void {
    this.isLoading = state;

    // Force additional change detection cycle
    this.ngZone.run(() => {
      setTimeout(() => {
        this.isLoading = state;
        console.log(`Loading state forced update to: ${state}`);
      }, 0);
    });
  }
} 
