// src/app/core/services/student.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed, resource } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service';

// ✅ Tipos locales para evitar import circular
interface SaleDetail {
  product_type: 'course' | 'project';
  product?: any;
  price_unit?: number;
}

interface StudentSale {
  _id: string;
  status: 'Pendiente' | 'Pagado' | 'Anulado';
  detail: SaleDetail[];
  total: number;
  createdAt: string;
}

export interface Student {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone?: string;
  profession?: string;
  description?: string;
  avatar?: string;
  state: boolean | number;
  sales?: StudentSale[]; // ✅ Array de ventas del estudiante
  purchased_courses_count?: number; // Computed desde sales
  purchased_projects_count?: number; // Computed desde sales
  created_at?: string;
}

// ✅ Interface para items de venta (ya no necesaria, usamos SaleDetail arriba)
// export interface SaleItem {
//   product_type: 'course' | 'project';
//   product?: any;
//   price_unit?: number;
// }

export interface StudentListResponse {
  students: Student[];
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private base = environment.url;

  // ✅ httpResource para auto-reload
  private studentsResource = resource({
    loader: async () => {
      try {
        const token = localStorage.getItem('token') || '';

        // 1️⃣ Obtener estudiantes
        const studentsResponse = await fetch(`${this.base}dashboard/students`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!studentsResponse.ok) throw new Error('Failed to fetch students');
        const data = await studentsResponse.json();


        // 2️⃣ Si no vienen sales, obtenerlas manualmente
        const enrichedStudents = await Promise.all(
          (data.students || []).map(async (student: any) => {
            try {
              // ⚠️ REMOVIDO: Siempre recalcular para asegurar consistencia y eliminar duplicados
              // if (student.purchased_courses_count > 0 || student.purchased_projects_count > 0) { ... }

              // Si no, obtener ventas del estudiante
              const salesResponse = await fetch(`${this.base}checkout/list?user=${student._id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (!salesResponse.ok) {
                return student;
              }

              const salesData = await salesResponse.json();
              const sales = salesData.sales || [];

              const uniqueCourses = new Set<string>();
              const uniqueProjects = new Set<string>();

              sales.forEach((sale: any) => {
                // 🔍 DEBUG: Ver todas las ventas y sus estados

                // Solo contar ventas pagadas (o tal vez GRATIS?)
                if (sale.status === 'Pagado' && sale.detail) {
                  sale.detail.forEach((item: SaleDetail) => {
                    // Obtener ID del producto (puede venir como objeto o string)
                    let productId = item.product && typeof item.product === 'object'
                      ? item.product._id
                      : item.product;

                    // ⚠️ FALLBACK: Si no hay producto (ej. eliminado o error de población), usar ID único basado en la venta
                    if (!productId) {
                      //
                      const index = sale.detail.indexOf(item);
                      productId = `missing-product-${sale._id}-${index}`;
                    }

                    const type = item.product_type ? item.product_type.toLowerCase() : '';

                    // 🔍 DEBUG ITEM

                    if (productId) {
                      if (type === 'course' || type === 'curso') { // Try Spanish too just in case
                        uniqueCourses.add(productId);
                      } else if (type === 'project' || type === 'proyecto') {
                        uniqueProjects.add(productId);
                      }
                    }
                  });
                }
              });
              const coursesCount = uniqueCourses.size;
              const projectsCount = uniqueProjects.size;

              // 🔥 HYBRID FIX:
              // - Cursos: Usar count del backend (student.purchased_courses_count) porque incluye cursos GRATIS que no generan venta.
              //   Si el backend devuelve 0 (bug) y nosotros encontramos pagados, usamos el nuestro.
              // - Proyectos: Usar nuestro count calculado (projectsCount) porque el backend infla los números con duplicados.

              const finalCoursesCount = (student.purchased_courses_count && student.purchased_courses_count > coursesCount)
                ? student.purchased_courses_count
                : coursesCount;


              return {
                ...student,
                sales,
                purchased_courses_count: finalCoursesCount,
                purchased_projects_count: projectsCount,
              };
            } catch (err) {
              return student;
            }
          })
        );

        return { students: enrichedStudents };
      } catch (error) {
        throw error;
      }
    },
  });

  // ✅ Signals públicos desde resource
  students = computed(() => this.studentsResource.value()?.students || []);
  isLoading = computed(() => this.studentsResource.isLoading());
  hasError = computed(() => this.studentsResource.status() === 'error');

  // ✅ Filter signals
  searchTerm = signal('');
  stateFilter = signal<boolean | number | ''>('');

  // ✅ Filtered students con logs mínimos
  filteredStudents = computed(() => {
    const allStudents = this.students();
    let filtered = [...allStudents];

    // Filter by search term
    const term = this.searchTerm();
    if (term) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(lowerTerm) ||
        s.surname.toLowerCase().includes(lowerTerm) ||
        s.email.toLowerCase().includes(lowerTerm)
      );
    }

    // Filter by state
    const stateFilter = this.stateFilter();
    if (stateFilter !== '') {
      filtered = filtered.filter(s => {
        const studentState = s.state === true || s.state === 1;
        const filterState = stateFilter === true || stateFilter === 1;
        return studentState === filterState;
      });
    }

    return filtered;
  });

  // ✅ Reload forzado
  reloadStudents() {
    this.studentsResource.reload();
  }

  updateStudentState(studentId: string, newState: boolean) {
    return this.http.put(`${this.base}users/update-state/${studentId}`, { state: newState }).pipe(
      tap(() => {
        this.toast.success(
          newState ? '✅ Estudiante Activado' : '❌ Estudiante Desactivado',
          'Estado actualizado correctamente'
        );
        // ✅ Auto-reload del resource
        this.studentsResource.reload();
      }),
      catchError(err => {
        this.toast.error('Error', 'No se pudo actualizar el estado');
        return throwError(() => err);
      })
    );
  }

  updateStudent(studentId: string, data: Partial<Student>) {
    const formData = new FormData();
    formData.append('_id', studentId);
    if (data.name) formData.append('name', data.name);
    if (data.surname) formData.append('surname', data.surname);
    if (data.email) formData.append('email', data.email);
    if (data.profession !== undefined) formData.append('profession', data.profession);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.state !== undefined) formData.append('state', data.state.toString());

    return this.http.post(`${this.base}users/update`, formData).pipe(
      tap(() => {
        this.toast.success('✅ Estudiante Actualizado', 'Los cambios se guardaron correctamente');
        // ✅ Auto-reload del resource
        this.studentsResource.reload();
      }),
      catchError(err => {
        this.toast.error('Error', 'No se pudo actualizar el estudiante');
        return throwError(() => err);
      })
    );
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  setStateFilter(state: boolean | number | '') {
    this.stateFilter.set(state);
  }

  // ✅ Stats computed optimizados
  private isActive(student: Student): boolean {
    return student.state === true || student.state === 1;
  }

  totalStudents = computed(() => this.students().length);
  activeStudents = computed(() => this.students().filter((s: Student) => this.isActive(s)).length);
  inactiveStudents = computed(() => this.students().filter((s: Student) => !this.isActive(s)).length);
  totalEnrollments = computed(() => {
    return this.students().reduce((sum: number, s: Student) => {
      // ✅ Prioridad: usar purchased_courses_count ya calculado
      const coursesCount = s.purchased_courses_count || 0;
      const projectsCount = s.purchased_projects_count || 0;
      return sum + coursesCount + projectsCount; // ✅ Sumar ambos
    }, 0);
  });
}
