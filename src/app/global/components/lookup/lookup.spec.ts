import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Lookup } from './lookup';

describe('Lookup', () => {
  let component: Lookup;
  let fixture: ComponentFixture<Lookup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lookup],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Lookup);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('url', '/test/');
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('option', 'lookup');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
