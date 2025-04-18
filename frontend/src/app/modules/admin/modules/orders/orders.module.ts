import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Import our components
import { CreateOrderComponent } from './create-order.component';
import { ManageOrdersComponent } from './manage-orders.component';

const routes: Routes = [
  { path: '', component: ManageOrdersComponent },
  { path: 'create', component: CreateOrderComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ManageOrdersComponent,
    CreateOrderComponent
  ]
})
export class OrdersModule { } 
