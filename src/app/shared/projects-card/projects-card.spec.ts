import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsCard } from './projects-card';

describe('ProjectsCard', () => {
  let component: ProjectsCard;
  let fixture: ComponentFixture<ProjectsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectsCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
