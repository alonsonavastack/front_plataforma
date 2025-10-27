import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CountryCode {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

@Component({
  selector: 'app-country-code-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="toggleDropdown()"
        class="w-full bg-slate-900/70 border border-slate-700 text-white text-base rounded-lg focus:ring-lime-500 focus:border-lime-500 block p-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors"
        [class.border-lime-500]="isOpen()"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">{{ selectedCountry().flag }}</span>
          <span class="font-medium">{{ selectedCountry().dialCode }}</span>
        </div>
        <svg
          class="w-4 h-4 transition-transform duration-200"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      @if (isOpen()) {
        <div class="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          <div class="p-2">
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (input)="filterCountries()"
              placeholder="Buscar país..."
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 mb-2 focus:ring-lime-500 focus:border-lime-500"
            />
            <div class="space-y-1">
              @for (country of filteredCountries(); track country.code) {
                <button
                  type="button"
                  (click)="selectCountry(country)"
                  class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <span class="text-lg">{{ country.flag }}</span>
                  <span class="text-white text-sm flex-1">{{ country.name }}</span>
                  <span class="text-lime-400 font-medium">{{ country.dialCode }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .scrollbar-thin {
      scrollbar-width: thin;
    }
    .scrollbar-thin::-webkit-scrollbar {
      width: 6px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: rgb(30 41 59 / 0.5);
      border-radius: 3px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: rgb(100 116 139 / 0.5);
      border-radius: 3px;
    }
  `]
})
export class CountryCodeSelectorComponent implements OnInit {
  @Input() selectedDialCode = '+52';
  @Output() countrySelected = new EventEmitter<CountryCode>();

  isOpen = signal(false);
  searchTerm = '';
  selectedCountry = signal<CountryCode>(this.getCountryByDialCode(this.selectedDialCode));

  countries: CountryCode[] = [
    { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dialCode: '+1' },
    { code: 'CA', name: 'Canadá', flag: '🇨🇦', dialCode: '+1' },
    { code: 'ES', name: 'España', flag: '🇪🇸', dialCode: '+34' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪', dialCode: '+51' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dialCode: '+502' },
    { code: 'CU', name: 'Cuba', flag: '🇨🇺', dialCode: '+53' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591' },
    { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', dialCode: '+1' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳', dialCode: '+504' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dialCode: '+503' },
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dialCode: '+505' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506' },
    { code: 'PA', name: 'Panamá', flag: '🇵🇦', dialCode: '+507' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷', dialCode: '+55' },
    { code: 'FR', name: 'Francia', flag: '🇫🇷', dialCode: '+33' },
    { code: 'DE', name: 'Alemania', flag: '🇩🇪', dialCode: '+49' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹', dialCode: '+39' },
    { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', dialCode: '+44' },
    { code: 'JP', name: 'Japón', flag: '🇯🇵', dialCode: '+81' },
    { code: 'CN', name: 'China', flag: '🇨🇳', dialCode: '+86' },
    { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  ];

  filteredCountries = signal<CountryCode[]>(this.countries);

  ngOnInit() {
    // Asegurar que countries esté inicializado antes de usarlo
    if (this.countries && this.countries.length > 0) {
      this.selectedCountry.set(this.getCountryByDialCode(this.selectedDialCode));
    } else {
      this.selectedCountry.set({ code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52' });
    }
  }

  toggleDropdown() {
    this.isOpen.update(open => !open);
  }

  selectCountry(country: CountryCode) {
    this.selectedCountry.set(country);
    this.isOpen.set(false);
    this.searchTerm = '';
    this.filteredCountries.set(this.countries);
    this.countrySelected.emit(country);
  }

  filterCountries() {
    const filtered = this.countries.filter(country =>
      country.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      country.dialCode.includes(this.searchTerm)
    );
    this.filteredCountries.set(filtered);
  }

  private getCountryByDialCode(dialCode: string): CountryCode {
    if (!this.countries || this.countries.length === 0) {
      return { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52' };
    }
    return this.countries.find(country => country.dialCode === dialCode) || this.countries[0];
  }
}
