import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { CommonModule, NgFor, NgIf, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, NgFor, NgIf, AsyncPipe]
})
export class HomeComponent implements OnInit {
  featuredProducts$: Observable<Product[]>;
  loading = true;

  constructor(private productService: ProductService) {
    this.featuredProducts$ = this.productService.getFeaturedProducts();
  }

  ngOnInit(): void {
    this.loading = false;

    this.createAssetsIfNeeded();
  }

  private createAssetsIfNeeded(): void {
    console.log('Checking for required assets...');

    // The hero background and category images should be placed in:
    // /assets/images/hero-bg.jpg
    // /assets/images/chains.jpg
    // /assets/images/pendants.jpg
    // /assets/images/combinations.jpg
  }
} 
