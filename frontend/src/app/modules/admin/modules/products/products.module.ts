import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

// Temporary product list component
@Component({
  selector: 'app-product-list',
  template: `
    <div class="container">
      <h2>Manage Products</h2>
      <p>This is where you can manage your product inventory.</p>
      <div class="alert alert-info">
        Product management functionality is coming soon.
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class ProductListComponent { }

const routes: Routes = [
  { path: '', component: ProductListComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ProductListComponent
  ]
})
export class ProductsModule { } 
