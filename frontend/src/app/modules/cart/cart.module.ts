import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

// Temporary cart component
@Component({
  selector: 'app-cart',
  template: `
    <div class="container mt-4">
      <h2>Your Shopping Cart</h2>
      <div class="alert alert-info">
        Cart Functionality Under Construction
      </div>
      <div class="mt-3">
        <button class="btn btn-primary">Proceed to WhatsApp Checkout</button>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CartComponent { }

const routes: Routes = [
  { path: '', component: CartComponent }
];

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    CartComponent
  ]
})
export class CartModule { } 
