import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginCliente } from './login-cliente';

describe('LoginCliente', () => {
  let component: LoginCliente;
  let fixture: ComponentFixture<LoginCliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginCliente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginCliente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
