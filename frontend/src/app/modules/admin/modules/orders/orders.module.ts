import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

// Temporary Orders List component
@Component({
  selector: 'app-orders-list',
  template: `
    <div class="container">
      <h2>Manage Orders</h2>
      <p>View and manage all customer orders here.</p>
      <div class="alert alert-info">
        Order management functionality is coming soon.
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class OrdersListComponent { }

// Import our new CreateOrderComponent
import { CreateOrderComponent } from './create-order.component';

const routes: Routes = [
  { path: '', component: OrdersListComponent },
  { path: 'create', component: CreateOrderComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    OrdersListComponent,
    CreateOrderComponent
  ]
})
export class OrdersModule { } 
