import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-social-media',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './social-media.component.html'
})
export class SocialMediaComponent {
  @Input() form!: FormGroup;
}
