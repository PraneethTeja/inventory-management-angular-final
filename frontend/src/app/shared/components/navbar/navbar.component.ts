import { Component, OnInit, HostListener, Input } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @Input() activePage: string = 'home';
  @Input() cartItemCount: number = 0;

  isMobileMenuOpen = false;
  isScrolled = false;
  cartCount = 0;
  isLoggedIn = false;
  showMobileMenu = false;

  constructor(private router: Router) {
    // Track route changes to highlight active link
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects;
      // Close mobile menu on navigation
      this.isMobileMenuOpen = false;
    });
  }

  currentRoute = '';

  ngOnInit(): void {
    // For demo purposes - in a real app, this would come from a service
    this.cartCount = this.cartItemCount || 3;

    // Check login status - in a real app, this would come from an auth service
    this.checkLoginStatus();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Add scrolled class to header when page is scrolled
    this.isScrolled = window.scrollY > 30;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.showMobileMenu = !this.showMobileMenu;
    // Prevent body scrolling when mobile menu is open
    document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
  }

  closeMobileMenu() {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      this.showMobileMenu = false;
      document.body.style.overflow = '';
    }
  }

  private checkLoginStatus() {
    // This would typically come from an auth service
    this.isLoggedIn = false;
  }

  logout() {
    // This would typically call an auth service logout method
    this.isLoggedIn = false;
    // Maybe navigate to home page
    this.router.navigate(['/']);
    this.closeMobileMenu();
  }

  login() {
    console.log('Navigating to login page at /auth/login');
    this.router.navigate(['/auth/login']);
    this.closeMobileMenu();
  }

  navigateToCart() {
    this.router.navigate(['/cart']);
    this.closeMobileMenu();
  }

  isRouteActive(route: string): boolean {
    if (route === '/') {
      return this.currentRoute === '/';
    }
    return this.currentRoute.includes(route);
  }
} 
