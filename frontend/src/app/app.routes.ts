import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';
import { Component } from '@angular/core';
import { CartComponent } from './modules/cart/cart.component';

// Simple test component to see if routing works
@Component({
  selector: 'app-test',
  template: '<div style="padding: 20px; background-color: yellow;"><h1>Test Component Works!</h1></div>',
  standalone: true
})
export class TestComponent { }

console.log('Loading routes configuration');

export const routes: Routes = [
  // Add a direct route to the test component for debugging
  { path: 'test', component: TestComponent },

  {
    path: '',
    loadChildren: () => {
      console.log('Loading home module');
      return import('./modules/home/home.module').then(m => {
        console.log('Home module loaded:', m);
        return m.HomeModule;
      });
    }
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule),
    canActivate: [authGuard, adminGuard]
  },
  { path: 'products', loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule) },
  { path: 'cart', component: CartComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
