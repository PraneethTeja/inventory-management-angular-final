import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductListComponent } from './product-list.component';

const routes: Routes = [
  { path: '', component: ProductListComponent }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    ProductListComponent
  ]
})
export class ProductsModule { } 
