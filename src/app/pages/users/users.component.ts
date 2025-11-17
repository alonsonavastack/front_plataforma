// src/app/pages/users/users.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService, AllUser } from '../../core/services/users.service';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { UserModalComponent, ModalMode } from './components/user-modal.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UserModalComponent],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  usersService = inject(UsersService);
  private toast = inject(ToastService)
  // Exponer Math para usarlo en el template
  Math = Math;

  // Signals del servicio
  users = this.usersService.filteredUsers;
  isLoading = this.usersService.isLoading;

  // Filtros
  searchTerm = signal('');
  roleFilter = signal<string>('');
  stateFilter = signal<string>('');

  // Stats
  totalUsers = computed(() => this.users().length);
  totalStudents = computed(() => this.users().filter(u => u.rol === 'cliente').length);
  totalInstructors = computed(() => this.users().filter(u => u.rol === 'instructor').length);
  totalAdmins = computed(() => this.users().filter(u => u.rol === 'admin').length);
  activeUsers = computed(() => this.users().filter(u => this.isUserActive(u)).length);

  // Modal states
  modalMode = signal<ModalMode>('closed');
  isRoleModalOpen = signal(false);
  currentUser = signal<AllUser | null>(null);

  // --- INICIO: Lógica de paginación ---

  currentPage = signal(1);
  itemsPerPage = signal(10); // Valor inicial

  paginatedUsers = computed(() => {
    const users = this.users();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return users.slice(start, end);
  });

  totalPages = computed(() => {
    const totalUsers = this.users()?.length || 0;
    return Math.ceil(totalUsers / this.itemsPerPage());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const current = this.currentPage();
    const pages: (number | string)[] = [1];

    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');

    pages.push(total);
    return pages;
  });

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  previousPage(): void {
    this.changePage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.changePage(this.currentPage() + 1);
  }

  changePerPage(perPage: number): void {
    this.itemsPerPage.set(perPage);
    this.currentPage.set(1);
  }

  // Formularios
  roleForm = new FormGroup({
    rol: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.loadAllUsers().subscribe();
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1);
    this.usersService.setSearchTerm(value);
  }

  onRoleFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.roleFilter.set(value);
    this.currentPage.set(1);
    this.usersService.setRoleFilter(value);
  }

  onStateFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.stateFilter.set(value);
    this.currentPage.set(1);
    this.usersService.setStateFilter(value === '' ? '' : value === 'true');
  }

  // Modal de cambio de rol
  openRoleModal(user: AllUser): void {
    this.currentUser.set(user);
    this.roleForm.patchValue({
      rol: user.rol,
    });
    this.isRoleModalOpen.set(true);
  }

  closeRoleModal(): void {
    this.isRoleModalOpen.set(false);
    this.currentUser.set(null);
    this.roleForm.reset();
  }

  saveRole(): void {
    if (this.roleForm.invalid) return;

    const user = this.currentUser();
    if (!user) return;

    const newRole = this.roleForm.value.rol!;

    const confirmChange = confirm(`¿Estás seguro de cambiar el rol de ${user.name} ${user.surname} a ${this.getRoleLabel(newRole)}?`);
    if (!confirmChange) return;

    this.usersService.updateUserRole(user._id, newRole).subscribe({
      next: () => {
        this.toast.success('Rol actualizado exitosamente');
        this.closeRoleModal();
        this.loadUsers();
      },
      error: (error) => {
        this.toast.error(error.error?.message_text || 'Error al actualizar el rol del usuario');
      }
    });
  }

  // --- Métodos para el nuevo UserModalComponent ---

  openEditModal(user: AllUser): void {
    this.currentUser.set(user);
    this.modalMode.set('edit');
  }

  openCreateModal(): void {
    this.currentUser.set(null);
    this.modalMode.set('create');
  }

  openViewModal(user: AllUser): void {
    this.currentUser.set(user);
    this.modalMode.set('view');
  }

  closeUserModal(): void {
    this.modalMode.set('closed');
    this.currentUser.set(null);
  }

  handleSaveUser(event: { data: any; file: File | null }): void {
    const { data, file } = event;
    const mode = this.modalMode();

    if (mode === 'create') {
      const formData = this.createFormData(data, file);
      this.usersService.createUser(formData).subscribe({
        next: () => {
          this.toast.success('Usuario creado exitosamente');
          this.closeUserModal();
          this.loadUsers();
        },
        error: (error) => this.toast.error(error.error?.message_text || 'Error al crear el usuario'),
      });
    } else if (mode === 'edit' && data._id) {
      if (file) {
        const formData = this.createFormData(data, file);
        this.usersService.updateUserWithFile(data._id, formData).subscribe({
          next: () => {
            this.toast.success('Usuario actualizado exitosamente');
            this.closeUserModal();
            this.loadUsers();
          },
          error: (error) => this.toast.error(error.error?.message_text || 'Error al actualizar el usuario'),
        });
      } else {
        this.usersService.updateUser(data._id, data).subscribe({
          next: () => {
            this.toast.success('Usuario actualizado exitosamente');
            this.closeUserModal();
            this.loadUsers();
          },
          error: (error) => this.toast.error(error.error?.message_text || 'Error al actualizar el usuario'),
        });
      }
    }
  }

  private createFormData(data: any, file: File | null): FormData {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key !== '_id' && data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });
      if (file) {
        formData.append('avatar', file);
      }
      return formData;
  }

  // Toggle de estado
  toggleUserState(user: AllUser): void {
    const currentState = this.isUserActive(user);
    const newState = !currentState;
    const action = newState ? 'activar' : 'desactivar';

    const confirmChange = confirm(`¿Estás seguro de ${action} a ${user.name} ${user.surname}?`);
    if (!confirmChange) return;

    this.usersService.updateUserState(user._id, newState).subscribe({
      next: () => {
        this.toast.success(`Usuario ${action === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
        this.loadUsers();
      },
      error: (error) => {
        this.toast.error(error.error?.message_text || 'Error al cambiar el estado del usuario');
      }
    });
  }

  // Eliminar usuario
  deleteUser(user: AllUser): void {
    const confirmDelete = confirm(
      `¿Estás seguro de eliminar a ${user.name} ${user.surname}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;


    this.usersService.deleteUser(user._id).subscribe({
      next: (response: any) => {
        this.toast.success('Usuario eliminado exitosamente');
        this.loadUsers();
      },
      error: (error) => {

        // Obtener el mensaje de error del backend
        const errorMessage = error.error?.message_text || error.error?.message || 'Error al eliminar el usuario';
        const blockedBy = error.error?.blockedBy;
        const count = error.error?.count;

        // Mostrar toast con el mensaje específico del backend
        if (error.status === 403) {
          // Error de validación (usuario tiene datos relacionados)
          this.toast.error(errorMessage);
        } else if (error.status === 404) {
          // Usuario no encontrado
          this.toast.error('El usuario no existe');
        } else {
          // Otros errores
          this.toast.error('Error al eliminar el usuario. Intenta de nuevo.');
        }
      }
    });
  }

  // Helpers
  getAvatarUrl(avatar?: string): string {
    if (!avatar) {
      return 'https://ui-avatars.com/api/?name=Usuario&background=random';
    }
    return `${environment.url}users/imagen-usuario/${avatar}`;
  }

  isUserActive(user: AllUser): boolean {
    return typeof user.state === 'boolean' ? user.state : user.state === 1;
  }

  getRoleBadgeClass(rol: string): string {
    switch (rol) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'instructor':
        return 'bg-lime-500/20 text-lime-400 border border-lime-500/30';
      case 'cliente':
        return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  }

  getRoleLabel(rol: string): string {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'instructor': return 'Instructor';
      case 'cliente': return 'Estudiante';
      default: return rol;
    }
  }

  getStateBadgeClass(user: AllUser): string {
    const isActive = this.isUserActive(user);
    return isActive
      ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
      : 'bg-red-500/20 text-red-400 border border-red-500/30';
  }

  getStateText(user: AllUser): string {
    const isActive = this.isUserActive(user);
    return isActive ? 'Activo' : 'Inactivo';
  }
}
