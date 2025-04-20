import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription, map } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { CommonModule, NgFor, NgIf, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SimpleCartService } from '../../core/services/simple-cart.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, NgFor, NgIf, AsyncPipe, NavbarComponent]
})
export class HomeComponent implements OnInit, OnDestroy {
  featuredProducts$: Observable<Product[]>;
  loading = true;
  cartItemCount = 0;
  private subscription = new Subscription();

  // Carousel properties
  currentSlide = 0;
  slidesToShow = 3; // Number of slides to show at once
  totalSlides = 0;

  constructor(
    private productService: ProductService,
    private cartService: SimpleCartService
  ) {
    this.featuredProducts$ = this.productService.getFeaturedProducts().pipe(
      map(products => {
        this.totalSlides = products.length;
        return products;
      })
    );
  }

  ngOnInit(): void {
    this.loading = false;
    this.createAssetsIfNeeded();

    // Get cart count from service
    this.subscription.add(
      this.cartService.getCartCount().subscribe(count => {
        this.cartItemCount = count;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Carousel navigation methods
  nextSlide(): void {
    if (this.totalSlides <= this.slidesToShow) {
      return; // No need to slide if all products fit in view
    }

    if (this.currentSlide < this.totalSlides - this.slidesToShow) {
      this.currentSlide++;
    } else {
      this.currentSlide = 0; // Loop back to beginning
    }
  }

  prevSlide(): void {
    if (this.totalSlides <= this.slidesToShow) {
      return; // No need to slide if all products fit in view
    }

    if (this.currentSlide > 0) {
      this.currentSlide--;
    } else {
      this.currentSlide = Math.max(0, this.totalSlides - this.slidesToShow); // Loop to end
    }
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.totalSlides) {
      this.currentSlide = index;
    }
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
