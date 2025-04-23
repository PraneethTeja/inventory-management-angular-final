import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { firestore } from '../../../../../app/app.config';
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
  categories: string[] = ['All', 'chain', 'pendant'];
  selectedCategory: string = 'All';
  searchTerm: string = '';

  isLoading: boolean = true;
  error: string = '';
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  currentProduct: Product | null = null;

  productForm: FormGroup;
  private readonly COLLECTION_NAME = 'products';

  constructor(
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

    console.log('Attempting to load products from Firebase...');
    console.log('Selected category:', this.selectedCategory);

    this.fetchProductsFromFirestore()
      .then(products => {
        this.products = products;
        this.filterProducts();
        this.setLoadingState(false);
      })
      .catch(error => {
        console.error('Error loading products:', error);

        // Check if this is a missing index error
        if (error.code === 'failed-precondition' && error.message && error.message.includes('index')) {
          console.log('Detected missing index error, trying fallback query');
          // Fallback to a simpler query without compound conditions
          this.fetchProductsWithFallback()
            .then(products => {
              this.products = products;
              this.filterProducts();
              this.setLoadingState(false);
            })
            .catch(fallbackError => {
              console.error('Even fallback query failed:', fallbackError);
              this.error = 'Failed to load products. Please try again.';
              this.products = [];
              this.filterProducts();
              this.setLoadingState(false);
            });
        } else {
          this.error = 'Failed to load products. Please try again.';
          this.products = [];
          this.filterProducts();
          this.setLoadingState(false);
        }
      });
  }

  async fetchProductsFromFirestore(): Promise<Product[]> {
    try {
      let productsQuery;

      // Build query based on category filter
      if (this.selectedCategory !== 'All') {
        console.log('Filtering by category:', this.selectedCategory);
        try {
          // Try with compound query that requires index
          productsQuery = query(
            collection(firestore, this.COLLECTION_NAME),
            where('category', '==', this.selectedCategory),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
        } catch (indexError) {
          console.error('Index error, falling back to simpler query:', indexError);
          // Fallback to a query without orderBy if there's an index error
          productsQuery = query(
            collection(firestore, this.COLLECTION_NAME),
            where('category', '==', this.selectedCategory),
            limit(50)
          );
        }
      } else {
        console.log('Loading all products');
        productsQuery = query(
          collection(firestore, this.COLLECTION_NAME),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      console.log('Executing Firestore query');
      const querySnapshot = await getDocs(productsQuery);
      console.log('Got results:', querySnapshot.size);
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

  // Fallback method that gets all products and filters in memory
  async fetchProductsWithFallback(): Promise<Product[]> {
    try {
      // Get all products without filtering by category
      const productsQuery = query(
        collection(firestore, this.COLLECTION_NAME),
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

      // Filter by category in memory if needed
      if (this.selectedCategory !== 'All') {
        return products.filter(p => p.category === this.selectedCategory);
      }

      return products;
    } catch (error) {
      console.error('Error in fallback product fetch:', error);
      throw error;
    }
  }

  filterProducts(): void {
    // First apply category filter
    let result = this.selectedCategory === 'All'
      ? [...this.products]
      : this.products.filter(p => p.category === this.selectedCategory);

    // Then apply search filter if there's a search term
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const search = this.searchTerm.toLowerCase().trim();
      result = result.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.productCode.toLowerCase().includes(search)
      );
    }

    this.filteredProducts = result;
  }

  applySearch(): void {
    this.filterProducts();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterProducts();
  }

  onCategoryChange(category: string): void {
    console.log(`Changing category from ${this.selectedCategory} to ${category}`);
    this.selectedCategory = category;
    this.error = ''; // Clear any previous errors
    this.loadProducts(); // Reload products with the new filter
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

    // Ensure discount object is properly initialized
    const discount = product.discount || { percentage: 0, validUntil: null };

    // Set values with proper null/default handling
    this.productForm.patchValue({
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      productCode: product.productCode,
      imageUrl: product.imageUrl || '',
      stockQuantity: product.stockQuantity || 0,
      details: {
        material: product.details?.material || '',
        weight: product.details?.weight || '',
        dimensions: product.details?.dimensions || '',
        features: featuresString
      },
      featured: product.featured || false,
      discount: {
        percentage: discount.percentage || 0,
        validUntil: discount.validUntil || null
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

  async submitProduct(): Promise<void> {
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

    try {
      if (this.showAddModal) {
        // Add timestamp fields and other defaults
        const newProduct = {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
          inStock: formData.stockQuantity > 0,
          imageUrls: formData.imageUrls || []
        };

        // Create new product in Firestore
        await addDoc(collection(firestore, this.COLLECTION_NAME), newProduct);
        console.log('Product created successfully');
      } else if (this.showEditModal && this.currentProduct) {
        // Update existing product in Firestore
        const updatedProduct = {
          ...formData,
          updatedAt: new Date(),
          inStock: formData.stockQuantity > 0
        };

        await updateDoc(doc(firestore, this.COLLECTION_NAME, this.currentProduct._id), updatedProduct);
        console.log('Product updated successfully');
      }

      // Reload products and close modal
      this.loadProducts();
      this.closeModal();
    } catch (error) {
      console.error('Error saving product:', error);
      this.error = 'Failed to save product. Please try again.';
      this.isLoading = false;
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.isLoading = true;

      try {
        // Delete product from Firestore
        await deleteDoc(doc(firestore, this.COLLECTION_NAME, product._id));
        console.log('Product deleted successfully');

        // Remove from local array and update filtered products
        this.products = this.products.filter(p => p._id !== product._id);
        this.filterProducts();
        this.isLoading = false;
      } catch (error) {
        console.error('Error deleting product:', error);
        this.error = 'Failed to delete product. Please try again.';
        this.isLoading = false;
      }
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
