import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { CommonModule, NgFor, NgIf, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, NgFor, NgIf, AsyncPipe, NavbarComponent]
})
export class HomeComponent implements OnInit {
  featuredProducts$: Observable<Product[]>;
  loading = true;
  cartItemCount = 0;

  constructor(private productService: ProductService) {
    this.featuredProducts$ = this.productService.getFeaturedProducts();
  }

  ngOnInit(): void {
    this.loading = false;

    this.createAssetsIfNeeded();

    // Simulate cart item count for demo purposes
    this.cartItemCount = Math.floor(Math.random() * 4);
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
