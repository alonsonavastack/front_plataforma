import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-info.component.html'
})
export class ContactInfoComponent {
  @Input() form!: FormGroup;
}
