import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contactForm: FormGroup;
  cartItemCount = 0;
  messageSent = false;

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\d{10}$/)]],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  submitForm(): void {
    if (this.contactForm.valid) {
      console.log('Form submitted:', this.contactForm.value);
      this.messageSent = true;
      this.contactForm.reset();
    } else {
      // Mark all fields as touched to trigger validation visibility
      Object.keys(this.contactForm.controls).forEach(key => {
        const control = this.contactForm.get(key);
        control?.markAsTouched();
      });
    }
  }
} 
