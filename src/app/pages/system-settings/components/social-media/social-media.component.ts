import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-social-media',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './social-media.component.html'
})
export class SocialMediaComponent {
  @Input() form!: FormGroup;
}
