import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../layout/header/header';
import { FooterComponent } from '../../layout/footer/footer';

@Component({
    selector: 'app-privacy-policy',
    standalone: true,
    imports: [CommonModule, HeaderComponent, FooterComponent],
    templateUrl: './privacy-policy.component.html'
})
export class PrivacyPolicyComponent {
    currentDate = new Date();
}
