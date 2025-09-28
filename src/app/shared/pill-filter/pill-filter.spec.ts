import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PillFilter } from './pill-filter';

describe('PillFilter', () => {
  let component: PillFilter;
  let fixture: ComponentFixture<PillFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PillFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PillFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
