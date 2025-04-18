import { Injectable } from '@angular/core';

// Update the Product interface to be more flexible
export interface Product {
  _id: string;
  name: string;
  price: number;
  category?: string;
  [key: string]: any; // Allow any additional properties
}

export type SortOption = 'featured' | 'price-low-high' | 'price-high-low' | 'newest' | 'priceLowHigh' | 'priceHighLow' | 'nameAZ' | 'nameZA' | string;

@Injectable({
  providedIn: 'root'
})
export class ProductSorterService {

  constructor() { }

  sortProducts(products: Product[], sortOption: SortOption = 'featured'): Product[] {
    const sorted = [...products];

    switch (sortOption) {
      case 'price-low-high':
      case 'priceLowHigh':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
      case 'priceHighLow':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // In a real app, you'd sort by date created
        // Here we'll just use product ID as a proxy for recency
        sorted.sort((a, b) => b._id.localeCompare(a._id));
        break;
      case 'nameAZ':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'nameZA':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default: // 'featured'
        // No sorting needed for featured as it's the default order
        break;
    }

    return sorted;
  }
}
