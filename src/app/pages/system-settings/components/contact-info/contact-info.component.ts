import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-info',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-info.component.html'
})
export class ContactInfoComponent {
  @Input() form!: FormGroup;
}
