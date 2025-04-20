import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SimpleCartService } from '../../core/services/simple-cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, OnDestroy {
  cartItemCount = 0;
  private subscription = new Subscription();

  constructor(private cartService: SimpleCartService) { }

  ngOnInit(): void {
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
} 
