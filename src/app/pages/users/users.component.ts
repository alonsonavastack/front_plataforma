// src/app/pages/users/users.component.ts
import { Component, inject, OnInit, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService, AllUser } from '../../core/services/users.service';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../../layout/header/header';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  usersService = inject(UsersService);

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
  isRoleModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isCreateModalOpen = signal(false);
  isViewModalOpen = signal(false);
  currentUser = signal<AllUser | null>(null);

  // Avatar file
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

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

  // Template reference for modals
  @ViewChild('modals') modals!: TemplateRef<any>;

  // Formularios
  roleForm = new FormGroup({
    rol: new FormControl('', [Validators.required]),
  });

  editForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    surname: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    profession: new FormControl(''),
    phone: new FormControl(''),
    description: new FormControl(''),
    rol: new FormControl('', [Validators.required]),
    state: new FormControl(true),
  });

  createForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    rol: new FormControl('cliente', [Validators.required]),
    profession: new FormControl(''),
    phone: new FormControl(''),
    description: new FormControl(''),
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.loadAllUsers().subscribe({
      next: () => console.log('Usuarios cargados'),
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
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
        alert('Rol actualizado exitosamente');
        this.closeRoleModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al actualizar rol:', error);
        alert(error.error?.message_text || 'Error al actualizar el rol');
      }
    });
  }

  // Modal de edición
  openEditModal(user: AllUser): void {
    this.currentUser.set(user);

    const state = typeof user.state === 'boolean' ? user.state : user.state === 1;

    this.editForm.patchValue({
      name: user.name,
      surname: user.surname,
      email: user.email,
      profession: user.profession || '',
      phone: user.phone || '',
      description: user.description || '',
      state: state,
      rol: user.rol,
    });

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.currentUser.set(null);
    this.editForm.reset();
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  saveEdit(): void {
    if (this.editForm.invalid) {
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
      return;
    }

    const user = this.currentUser();
    if (!user) return;

    const formValue = this.editForm.value;

    // Si hay archivo, usar FormData
    if (this.selectedFile()) {
      const formData = new FormData();
      formData.append('name', formValue.name || '');
      formData.append('surname', formValue.surname || '');
      formData.append('email', formValue.email || '');
      formData.append('profession', formValue.profession || '');
      formData.append('phone', formValue.phone || '');
      formData.append('description', formValue.description || '');
      formData.append('rol', formValue.rol || '');
      formData.append('state', formValue.state ? '1' : '0');
      formData.append('avatar', this.selectedFile()!);

      this.usersService.updateUserWithFile(user._id, formData).subscribe({
        next: () => {
          alert('Usuario actualizado exitosamente');
          this.closeEditModal();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          alert(error.error?.message_text || 'Error al actualizar el usuario');
        }
      });
    } else {
      // Sin archivo, enviar JSON
      const data: Partial<AllUser> = {
        name: formValue.name || '',
        surname: formValue.surname || '',
        email: formValue.email || '',
        profession: formValue.profession || '',
        phone: formValue.phone || '',
        description: formValue.description || '',
        rol: (formValue.rol as AllUser['rol']) || 'cliente',
        state: formValue.state ?? true,
      };

      this.usersService.updateUser(user._id, data).subscribe({
        next: () => {
          alert('Usuario actualizado exitosamente');
          this.closeEditModal();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          alert(error.error?.message_text || 'Error al actualizar el usuario');
        }
      });
    }
  }

  // Modal de creación
  openCreateModal(): void {
    this.createForm.reset({
      rol: 'cliente',
    });
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.createForm.reset();
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  saveCreate(): void {
    if (this.createForm.invalid) {
      Object.keys(this.createForm.controls).forEach(key => {
        this.createForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.createForm.value;
    const formData = new FormData();

    formData.append('name', formValue.name || '');
    formData.append('surname', formValue.surname || '');
    formData.append('email', formValue.email || '');
    formData.append('password', formValue.password || '');
    formData.append('rol', formValue.rol || 'cliente');
    formData.append('profession', formValue.profession || '');
    formData.append('phone', formValue.phone || '');
    formData.append('description', formValue.description || '');

    if (this.selectedFile()) {
      formData.append('avatar', this.selectedFile()!);
    }

    this.usersService.createUser(formData).subscribe({
      next: () => {
        alert('Usuario creado exitosamente');
        this.closeCreateModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al crear usuario:', error);
        alert(error.error?.message_text || 'Error al crear el usuario');
      }
    });
  }

  // Modal de vista
  openViewModal(user: AllUser): void {
    this.currentUser.set(user);
    this.isViewModalOpen.set(true);
  }

  closeViewModal(): void {
    this.isViewModalOpen.set(false);
    this.currentUser.set(null);
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
        alert(`Usuario ${action === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        alert(error.error?.message_text || 'Error al cambiar el estado del usuario');
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
      next: () => {
        alert('Usuario eliminado exitosamente');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al eliminar usuario:', error);
        alert(error.error?.message_text || 'Error al eliminar el usuario');
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
