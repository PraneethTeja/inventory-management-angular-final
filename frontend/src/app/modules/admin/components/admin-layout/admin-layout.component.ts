import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
  user$!: Observable<any>;
  sidebarExpanded = false;

  // Sidebar navigation items
  navItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
    { label: 'Manage Products', icon: 'inventory_2', route: '/admin/products' },
    { label: 'Create Order', icon: 'add_shopping_cart', route: '/admin/orders/create' },
    { label: 'Manage Orders', icon: 'shopping_cart', route: '/admin/orders' }
  ];

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.user$ = this.authService.user$;
  }

  expandSidebar() {
    this.sidebarExpanded = true;
  }

  collapseSidebar() {
    this.sidebarExpanded = false;
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      window.location.href = '/auth/login';
    });
  }
} 
