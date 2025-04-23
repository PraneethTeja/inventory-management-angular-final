export interface Product {
  _id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  inStock: boolean;
  productCode: string;
  imageUrl: string;
  imageUrls?: string[];
  stockQuantity: number;
  details?: ProductDetails;
  featured?: boolean;
  discount?: ProductDiscount;
  tags?: string[];
  relatedProducts?: string[];
  customProperties?: Record<string, any>;
}

export type ProductCategory = 'chain' | 'pendant' | 'combination';

export interface ProductDetails {
  material?: string;
  weight?: string;
  dimensions?: string;
  features?: string[];
}

export interface ProductDiscount {
  percentage: number;
  validUntil?: Date;
}

export interface ProductComponent {
  chain?: Product;
  pendant?: Product;
}

// Interface for API responses
export interface ProductResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
} 
