import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../layout/header/header';
import { FooterComponent } from '../../layout/footer/footer';

@Component({
    selector: 'app-terms-conditions',
    standalone: true,
    imports: [CommonModule, HeaderComponent, FooterComponent],
    templateUrl: './terms-conditions.component.html'
})
export class TermsConditionsComponent {
    currentDate = new Date();
}
