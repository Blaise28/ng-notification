import { Component, AfterViewInit, ElementRef, viewChild, output, signal } from '@angular/core';

import intlTelInput from 'intl-tel-input';

@Component({
    selector: 'phone-number-field',
  imports: [],
  templateUrl: './phone-number-field.component.html',
  styleUrl: './phone-number-field.component.scss',
})
export class PhoneNumberFieldComponent implements AfterViewInit {
  readonly phoneInput =
    viewChild.required<ElementRef<HTMLInputElement>>('phoneInput');
  iti!: ReturnType<typeof intlTelInput>;

  readonly phoneNumberEvent = output<string | null>();
  phoneInvalid = signal(false);

  ngAfterViewInit(): void {
    const options = {
      initialCountry: 'bi',
      placeholderNumberType: 'MOBILE' as const,
      nationalMode: false,
      formatOnDisplay: true,
      strictMode: true,
      separateDialCode: true,
      autoPlaceholder: 'polite' as const,
      loadUtils: () => import('intl-tel-input/build/js/utils.js'),
    };

    const phoneInput = this.phoneInput().nativeElement;
    this.iti = intlTelInput(phoneInput, options);

    phoneInput.addEventListener('utilsLoaded', () => {
      this.iti.setCountry('bi');
    });
  }

  emitPhoneNumber() {
    const phoneInput = this.phoneInput();
    if (this.iti && phoneInput) {
      const number = this.iti.getNumber();
      if (this.iti.isValidNumber() && number) {
        this.phoneNumberEvent.emit(number);
        this.phoneInvalid.set(false);
      } else {
        this.phoneNumberEvent.emit(null);
        this.phoneInvalid.set(!!phoneInput.nativeElement.value);
      }
    }
  }

  reset() {
    const phoneInput = this.phoneInput();
    if (this.iti && phoneInput) {
      phoneInput.nativeElement.value = '';
      this.phoneInvalid.set(false);
      this.phoneNumberEvent.emit(null);
    }
  }
}
