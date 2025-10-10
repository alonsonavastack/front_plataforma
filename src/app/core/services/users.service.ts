// src/app/core/services/users.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AllUser {
  _id: string;
  rol: 'admin' | 'instructor' | 'cliente';
  name: string;
  surname: string;
  email: string;
  avatar?: string;
  phone?: string;
  profession?: string;
  description?: string;
  state: boolean | number;
  createdAt?: string;
  updatedAt?: string;
}

interface UsersResponse {
  users: AllUser[];
}

interface UserResponse {
  user: AllUser;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);

  // Signals para el estado
  private allUsersSignal = signal<AllUser[]>([]);
  isLoading = signal<boolean>(false);
  
  // Filtros
  private searchTermSignal = signal<string>('');
  private roleFilterSignal = signal<string>('');
  private stateFilterSignal = signal<boolean | string>('');

  // Computed para usuarios filtrados
  filteredUsers = computed(() => {
    let users = this.allUsersSignal();
    const search = this.searchTermSignal().toLowerCase();
    const role = this.roleFilterSignal();
    const state = this.stateFilterSignal();

    // Filtrar por búsqueda
    if (search) {
      users = users.filter(user => 
        user.name.toLowerCase().includes(search) ||
        user.surname.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }

    // Filtrar por rol
    if (role) {
      users = users.filter(user => user.rol === role);
    }

    // Filtrar por estado
    if (state !== '') {
      users = users.filter(user => {
        const userState = typeof user.state === 'boolean' ? user.state : user.state === 1;
        return userState === state;
      });
    }

    return users;
  });

  // Métodos para actualizar filtros
  setSearchTerm(term: string): void {
    this.searchTermSignal.set(term);
  }

  setRoleFilter(role: string): void {
    this.roleFilterSignal.set(role);
  }

  setStateFilter(state: boolean | string): void {
    this.stateFilterSignal.set(state);
  }

  // Headers con token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token || ''
    });
  }

  // Cargar todos los usuarios
  loadAllUsers(): Observable<UsersResponse> {
    this.isLoading.set(true);
    return this.http.get<UsersResponse>(`${environment.url}users/list`, {
      headers: this.getHeaders()
    }).pipe(
      tap({
        next: (response) => {
          this.allUsersSignal.set(response.users);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      })
    );
  }

  // Crear usuario (admin)
  createUser(userData: FormData): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${environment.url}users/register_admin`, userData, {
      headers: new HttpHeaders({
        'Authorization': localStorage.getItem('token') || ''
      })
    });
  }

  // Actualizar usuario
  updateUser(userId: string, userData: Partial<AllUser>): Observable<UserResponse> {
    const body = {
      ...userData,
      _id: userId
    };
    
    return this.http.post<UserResponse>(`${environment.url}users/update`, body, {
      headers: this.getHeaders()
    });
  }

  // Actualizar rol de usuario
  updateUserRole(userId: string, newRole: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${environment.url}users/update`, {
      _id: userId,
      rol: newRole
    }, {
      headers: this.getHeaders()
    });
  }

  // Actualizar estado del usuario
  updateUserState(userId: string, state: boolean): Observable<UserResponse> {
    console.log('=== updateUserState called ===');
    console.log('userId:', userId);
    console.log('state:', state, 'type:', typeof state);
    
    return this.http.put<UserResponse>(`${environment.url}users/update-state/${userId}`, 
      { state }, 
      { headers: this.getHeaders() }
    ).pipe(
      tap({
        next: (response) => {
          console.log('Response from server:', response);
        },
        error: (error) => {
          console.error('Error from server:', error);
        }
      })
    );
  }

  // Eliminar usuario
  deleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.url}users/delete/${userId}`, {
      headers: this.getHeaders()
    });
  }

  // Actualizar usuario con archivo (avatar)
  updateUserWithFile(userId: string, formData: FormData): Observable<UserResponse> {
    formData.append('_id', userId);
    
    return this.http.post<UserResponse>(`${environment.url}users/update`, formData, {
      headers: new HttpHeaders({
        'Authorization': localStorage.getItem('token') || ''
      })
    });
  }
}
