import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService, Review, ReviewStatistics, CanRateResponse } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-course-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Estadísticas de calificaciones -->
      @if (statistics()) {
        <div class="rounded-xl border border-white/10 bg-white/5 p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="text-center">
              <div class="text-3xl font-bold text-lime-300">{{ statistics()!.average_rating }}</div>
              <div class="flex items-center justify-center gap-1 text-yellow-400">
                @for (star of generateStars(statistics()!.average_rating); track $index) {
                  @if (star === 'full') {
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                    </svg>
                  } @else if (star === 'half') {
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <defs>
                        <linearGradient id="half-{{ $index }}">
                          <stop offset="50%" stop-color="currentColor"/>
                          <stop offset="50%" stop-color="transparent"/>
                        </linearGradient>
                      </defs>
                      <path [attr.fill]="'url(#half-' + $index + ')'" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                    </svg>
                  } @else {
                    <svg class="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                    </svg>
                  }
                }
              </div>
              <div class="text-sm text-white/70">{{ statistics()!.total_reviews }} calificaciones</div>
            </div>

            <!-- Distribución de calificaciones -->
            <div class="flex-1 space-y-2">
              @for (rating of [5,4,3,2,1]; track rating) {
                <div class="flex items-center gap-2">
                  <span class="text-sm text-white/70 w-2">{{ rating }}</span>
                  <svg class="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                  </svg>
                  <div class="flex-1 bg-white/10 rounded-full h-2">
                    <div class="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                         [style.width.%]="getRatingPercentage(rating)"></div>
                  </div>
                  <span class="text-xs text-white/60 w-8">{{ getRatingCount(rating) }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ✅ CORREGIDO: Formulario para CREAR nueva calificación (solo si NO tiene review existente) -->
      @if (shouldShowCreateForm()) {
        <div class="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Califica este curso</h3>

          @if (isSubmitting()) {
            <div class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto"></div>
              <p class="text-white/70 mt-2">Enviando calificación...</p>
            </div>
          } @else {
            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <!-- Calificación con estrellas -->
              <div>
                <label class="block text-sm font-medium text-white/90 mb-2">Tu calificación</label>
                <div class="flex items-center gap-1">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button type="button"
                            (click)="setRating(star)"
                            class="transition-colors duration-200">
                      @if (star <= selectedRating()) {
                        <svg class="w-8 h-8 text-yellow-400 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                        </svg>
                      } @else {
                        <svg class="w-8 h-8 text-white/30 hover:text-yellow-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                        </svg>
                      }
                    </button>
                  }
                </div>
                @if (selectedRating() > 0) {
                  <p class="text-sm text-white/70 mt-1">
                    {{ getRatingText(selectedRating()) }}
                  </p>
                }
              </div>

              <!-- Comentario -->
              <div>
                <label for="description" class="block text-sm font-medium text-white/90 mb-2">
                  Tu comentario
                </label>
                <textarea
                  id="description"
                  [(ngModel)]="reviewDescription"
                  name="description"
                  rows="4"
                  placeholder="Comparte tu experiencia con este curso..."
                  class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50"
                  required></textarea>
              </div>

              <!-- Botones -->
              <div class="flex gap-3">
                <button type="submit"
                        [disabled]="selectedRating() === 0 || !reviewDescription.trim()"
                        class="px-6 py-2 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Enviar calificación
                </button>
                <button type="button"
                        (click)="resetForm()"
                        class="px-6 py-2 border border-white/20 text-white/70 rounded-lg hover:border-white/40 hover:text-white transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          }
        </div>
      }

      <!-- ✅ NUEVO: Formulario para EDITAR calificación existente -->
      @if (shouldShowEditForm()) {
        <div class="rounded-xl border border-lime-400/40 bg-lime-500/5 p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Editar tu calificación</h3>

          @if (isSubmitting()) {
            <div class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto"></div>
              <p class="text-white/70 mt-2">Actualizando calificación...</p>
            </div>
          } @else {
            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <!-- Calificación con estrellas -->
              <div>
                <label class="block text-sm font-medium text-white/90 mb-2">Tu calificación</label>
                <div class="flex items-center gap-1">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button type="button"
                            (click)="setRating(star)"
                            class="transition-colors duration-200">
                      @if (star <= selectedRating()) {
                        <svg class="w-8 h-8 text-yellow-400 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                        </svg>
                      } @else {
                        <svg class="w-8 h-8 text-white/30 hover:text-yellow-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                        </svg>
                      }
                    </button>
                  }
                </div>
                @if (selectedRating() > 0) {
                  <p class="text-sm text-white/70 mt-1">
                    {{ getRatingText(selectedRating()) }}
                  </p>
                }
              </div>

              <!-- Comentario -->
              <div>
                <label for="description-edit" class="block text-sm font-medium text-white/90 mb-2">
                  Tu comentario
                </label>
                <textarea
                  id="description-edit"
                  [(ngModel)]="reviewDescription"
                  name="description"
                  rows="4"
                  placeholder="Comparte tu experiencia con este curso..."
                  class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50"
                  required></textarea>
              </div>

              <!-- Botones -->
              <div class="flex gap-3">
                <button type="submit"
                        [disabled]="selectedRating() === 0 || !reviewDescription.trim()"
                        class="px-6 py-2 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Actualizar calificación
                </button>
                <button type="button"
                        (click)="resetForm()"
                        class="px-6 py-2 border border-white/20 text-white/70 rounded-lg hover:border-white/40 hover:text-white transition-colors">
                  Cancelar edición
                </button>
              </div>
            </form>
          }
        </div>
      }

      <!-- ✅ CORREGIDO: Mensaje cuando ya calificó (sin estar editando) -->
      @if (shouldShowAlreadyRatedMessage()) {
        <div class="rounded-xl border border-white/10 bg-white/5 p-6">
          <div class="text-center">
            <svg class="w-12 h-12 text-lime-400 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">Ya calificaste este curso</h3>
            <p class="text-white/70 mb-4">Gracias por compartir tu opinión</p>

            <div class="mt-4 p-4 bg-white/5 rounded-lg">
              <p class="text-sm text-white/70 mb-2">Tu calificación:</p>
              <div class="flex items-center justify-center gap-2">
                <div class="flex items-center gap-1">
                  @for (star of generateStars(canRateResponse()!.existing_review!.rating); track $index) {
                    @if (star === 'full') {
                      <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                      </svg>
                    } @else if (star === 'half') {
                      <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                        <defs>
                          <linearGradient id="existing-half-{{ $index }}">
                            <stop offset="50%" stop-color="currentColor"/>
                            <stop offset="50%" stop-color="transparent"/>
                          </linearGradient>
                        </defs>
                        <path [attr.fill]="'url(#existing-half-' + $index + ')'" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                      </svg>
                    } @else {
                      <svg class="w-5 h-5 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                      </svg>
                    }
                  }
                </div>
              </div>
              <p class="text-white/80 mt-3 text-sm">{{ canRateResponse()!.existing_review!.description }}</p>

              <button (click)="editExistingReview()"
                      class="mt-4 px-4 py-2 bg-lime-500/20 text-lime-300 rounded-lg hover:bg-lime-500/30 transition-colors font-medium">
                ✏️ Editar mi calificación
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ✅ MANTENER: Mensaje cuando NO puede calificar (no compró el curso) -->
      @if (!canRate() && canRateResponse()) {
        <div class="rounded-xl border border-white/10 bg-white/5 p-6">
          <div class="text-center">
            <svg class="w-12 h-12 text-white/30 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">No puedes calificar este curso</h3>
            <p class="text-white/70">{{ canRateResponse()!.reason }}</p>
          </div>
        </div>
      }

      <!-- Lista de calificaciones -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-white">Calificaciones de estudiantes</h3>

        @if (isLoading()) {
          <div class="space-y-4">
            @for (i of [1,2,3]; track i) {
              <div class="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 bg-white/10 rounded-full"></div>
                  <div class="space-y-1">
                    <div class="h-4 bg-white/10 rounded w-24"></div>
                    <div class="h-3 bg-white/10 rounded w-16"></div>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="h-3 bg-white/10 rounded w-full"></div>
                  <div class="h-3 bg-white/10 rounded w-3/4"></div>
                </div>
              </div>
            }
          </div>
        } @else if (reviews().length === 0) {
          <div class="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <svg class="w-12 h-12 text-white/30 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">Sin calificaciones aún</h3>
            <p class="text-white/70">Sé el primero en calificar este curso</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (review of reviews(); track review._id) {
              <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                <div class="flex items-start gap-3">
                  <!-- Avatar del usuario -->
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-slate-900 font-semibold text-sm">
                    {{ review.user_info.full_name.charAt(0).toUpperCase() }}
                  </div>

                  <div class="flex-1">
                    <!-- Información del usuario y calificación -->
                    <div class="flex items-center gap-2 mb-2">
                      <span class="font-semibold text-white">{{ review.user_info.full_name }}</span>
                      <div class="flex items-center gap-1">
                        @for (star of generateStars(review.rating); track $index) {
                          @if (star === 'full') {
                            <svg class="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                              <path d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                            </svg>
                          } @else if (star === 'half') {
                            <svg class="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                              <defs>
                                <linearGradient id="review-half-{{ $index }}">
                                  <stop offset="50%" stop-color="currentColor"/>
                                  <stop offset="50%" stop-color="transparent"/>
                                </linearGradient>
                              </defs>
                              <path [attr.fill]="'url(#review-half-' + $index + ')'" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                            </svg>
                          } @else {
                            <svg class="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path stroke-width="2" d="M12 17l-5 3 1.5-5.5L4 9l5.5-.5L12 3l2.5 5.5L20 9l-4.5 5.5L17 20z"/>
                            </svg>
                          }
                        }
                      </div>
                      <span class="text-xs text-white/60">{{ formatDate(review.createdAt) }}</span>
                    </div>

                    <!-- Comentario -->
                    <p class="text-white/80 leading-relaxed">{{ review.description }}</p>

                    <!-- ✅ NUEVO: Respuesta del instructor -->
                    @if (review.reply) {
                      <div class="mt-4 ml-8 pl-4 border-l-2 border-lime-500/30 bg-lime-500/5 rounded-r-lg p-4">
                        <div class="flex items-start gap-3">
                          <!-- Avatar del instructor -->
                          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                            {{ review.reply.instructor_info?.full_name?.charAt(0)?.toUpperCase() || 'I' }}
                          </div>

                          <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                              <span class="font-semibold text-lime-300 text-sm">
                                {{ review.reply.instructor_info?.full_name || 'Instructor' }}
                              </span>
                              <span class="text-xs text-white/60">
                                · {{ formatDate(review.reply.createdAt) }}
                              </span>
                              <span class="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                Instructor
                              </span>
                            </div>

                            <!-- Texto de la respuesta -->
                            @if (editingReplyFor() === review._id) {
                              <!-- Formulario de edición -->
                              <div class="space-y-2">
                                <textarea
                                  [(ngModel)]="replyText"
                                  rows="3"
                                  class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                                  placeholder="Edita tu respuesta..."></textarea>
                                <div class="flex gap-2">
                                  <button
                                    (click)="submitReply(review._id)"
                                    [disabled]="isSubmittingReply() || !replyText().trim()"
                                    class="px-3 py-1 bg-lime-500 text-slate-900 text-sm font-semibold rounded hover:bg-lime-400 disabled:opacity-50 transition-colors">
                                    @if (isSubmittingReply()) {
                                      <span class="flex items-center gap-2">
                                        <div class="animate-spin w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full"></div>
                                        Guardando...
                                      </span>
                                    } @else {
                                      Guardar cambios
                                    }
                                  </button>
                                  <button
                                    (click)="cancelReply()"
                                    class="px-3 py-1 border border-white/20 text-white/70 text-sm rounded hover:border-white/40 transition-colors">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            } @else {
                              <!-- Mostrar respuesta -->
                              <p class="text-white/80 text-sm leading-relaxed">{{ review.reply.description }}</p>

                              <!-- Botones de acción (solo si es el instructor que respondió) -->
                              @if (canReplyToReviews()) {
                                <div class="flex gap-2 mt-2">
                                  <button
                                    (click)="editReply(review._id, review.reply.description)"
                                    class="text-xs text-lime-400 hover:text-lime-300 transition-colors">
                                    ✏️ Editar
                                  </button>
                                  <button
                                    (click)="deleteReply(review._id)"
                                    [disabled]="isSubmittingReply()"
                                    class="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                                    🗑️ Eliminar
                                  </button>
                                </div>
                              }
                            }
                          </div>
                        </div>
                      </div>
                    }

                    <!-- Formulario para agregar respuesta (si no existe aún) -->
                    @if (canReplyToReviews() && !review.reply && replyingTo() !== review._id) {
                      <div class="mt-4 ml-8">
                        <button
                          (click)="startReply(review._id)"
                          class="text-sm text-lime-400 hover:text-lime-300 transition-colors flex items-center gap-2">
                          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-width="2" d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/>
                          </svg>
                          Responder a esta reseña
                        </button>
                      </div>
                    }

                    <!-- Formulario de respuesta activo -->
                    @if (replyingTo() === review._id && !review.reply) {
                      <div class="mt-4 ml-8 pl-4 border-l-2 border-lime-500/30 bg-lime-500/5 rounded-r-lg p-4">
                        <div class="space-y-3">
                          <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                              {{ authService.user()?.name?.charAt(0)?.toUpperCase() || 'I' }}
                            </div>
                            <span class="text-sm font-semibold text-lime-300">Tu respuesta como instructor</span>
                          </div>

                          <textarea
                            [(ngModel)]="replyText"
                            rows="4"
                            class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                            placeholder="Escribe tu respuesta al estudiante..."></textarea>

                          <div class="flex gap-2">
                            <button
                              (click)="submitReply(review._id)"
                              [disabled]="isSubmittingReply() || !replyText().trim()"
                              class="px-4 py-2 bg-lime-500 text-slate-900 text-sm font-semibold rounded hover:bg-lime-400 disabled:opacity-50 transition-colors">
                              @if (isSubmittingReply()) {
                                <span class="flex items-center gap-2">
                                  <div class="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full"></div>
                                  Enviando...
                                </span>
                              } @else {
                                Enviar respuesta
                              }
                            </button>
                            <button
                              (click)="cancelReply()"
                              [disabled]="isSubmittingReply()"
                              class="px-4 py-2 border border-white/20 text-white/70 text-sm rounded hover:border-white/40 transition-colors disabled:opacity-50">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Pagination -->
        @if (totalPages() > 1) {
        <div class="bg-slate-800/50 rounded-lg px-6 py-4 flex items-center justify-between">
          <div class="text-sm text-slate-400">
            Página {{ currentPage() }} de {{ totalPages() }} ({{ totalItems() }} reseñas)
          </div>

          <div class="flex gap-1">
            <!-- Previous Button -->
            <button
              (click)="onPageChange(currentPage() - 1)"
              [disabled]="currentPage() === 1"
              class="px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>

            <!-- Page Numbers -->
            @for (page of getPageNumbers(); track page) {
              @if (page === -1) {
                <span class="px-3 py-1 text-slate-500">...</span>
              } @else {
                <button
                  (click)="onPageChange(page)"
                  [class.bg-lime-500]="page === currentPage()"
                  [class.text-slate-900]="page === currentPage()"
                  [class.bg-slate-700]="page !== currentPage()"
                  [class.text-slate-300]="page !== currentPage()"
                  class="px-3 py-1 rounded hover:bg-slate-600 transition-colors"
                >
                  {{ page }}
                </button>
              }
            }

            <!-- Next Button -->
            <button
              (click)="onPageChange(currentPage() + 1)"
              [disabled]="currentPage() === totalPages()"
              class="px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    textarea:focus {
      outline: none;
    }
  `]
})
export class CourseReviewsComponent implements OnInit, OnChanges {
  @Input() productId!: string;
  @Input() productType: 'course' | 'project' = 'course';
  @Output() reviewAdded = new EventEmitter<Review>();
  @Output() reviewUpdated = new EventEmitter<Review>();

  private reviewService = inject(ReviewService);
  public authService = inject(AuthService);

  // Estado del componente
  reviews = signal<Review[]>([]);
  statistics = signal<ReviewStatistics | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  canRateResponse = signal<CanRateResponse | null>(null);

  // Pagination signals
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  limit = 5;

  // Edit mode signals
  isEditing = signal(false);
  editingReviewId = signal<string | null>(null);

  // Formulario
  selectedRating = signal(0);
  reviewDescription = '';

  // ✅ NUEVO: Respuestas del instructor
  replyingTo = signal<string | null>(null);  // ID de review a la que se está respondiendo
  replyText = signal('');                    // Texto de la respuesta
  isSubmittingReply = signal(false);         // Loading para respuestas
  editingReplyFor = signal<string | null>(null);  // ID de reply que se está editando

  // ✅ CORREGIDO: Computed signals para controlar la UI
  canRate = computed(() => this.canRateResponse()?.can_rate ?? false);

  // ✅ NUEVO: Solo mostrar formulario si puede crear una NUEVA review (no tiene review existente)
  shouldShowCreateForm = computed(() => {
    const response = this.canRateResponse();
    if (!response) return false;

    // Mostrar formulario solo si:
    // 1. Puede calificar (can_rate = true)
    // 2. NO tiene review existente
    // 3. NO está en modo edición
    const canCreate = response.can_rate && !response.existing_review && !this.isEditing();

    console.log('🔍 [shouldShowCreateForm]', {
      can_rate: response.can_rate,
      has_existing_review: !!response.existing_review,
      is_editing: this.isEditing(),
      should_show: canCreate
    });

    return canCreate;
  });

  // ✅ NUEVO: Solo mostrar mensaje de "ya calificaste" si tiene review Y NO está editando
  shouldShowAlreadyRatedMessage = computed(() => {
    const response = this.canRateResponse();
    if (!response) return false;

    return response.can_rate && !!response.existing_review && !this.isEditing();
  });

  // ✅ NUEVO: Mostrar formulario de edición solo si está en modo edición
  shouldShowEditForm = computed(() => {
    return this.isEditing() && this.editingReviewId() !== null;
  });

  ngOnInit() {
    // Solo cargar reviews si tenemos un productId válido
    if (this.productId) {
      this.loadReviews();
      this.checkCanRate();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si el productId cambia y es válido, cargar las reviews
    if (changes['productId'] && this.productId) {
      this.loadReviews();
      this.checkCanRate();
    }
  }

  async loadReviews(page: number = 1) {
    if (!this.productId) {
      console.warn('Cannot load reviews: productId is null or undefined');
      return;
    }

    this.isLoading.set(true);
    try {
      const response = await this.reviewService.getReviewsByProduct(this.productId, this.productType, page, this.limit).toPromise();
      if (response) {
        this.reviews.set(response.reviews);
        this.statistics.set(response.statistics);

        // Update pagination
        if (response.pagination) {
          this.currentPage.set(response.pagination.page);
          this.totalPages.set(response.pagination.pages);
          this.totalItems.set(response.pagination.total);
        }
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async checkCanRate() {
    if (!this.productId) {
      console.warn('Cannot check can rate: productId is null or undefined');
      return;
    }

    try {
      const response = await this.reviewService.canRateProduct(this.productId, this.productType).toPromise();
      this.canRateResponse.set(response || null);

      console.log('🔍 [checkCanRate] Respuesta del servidor:', {
        can_rate: response?.can_rate,
        reason: response?.reason,
        has_existing_review: !!response?.existing_review
      });

      // ✅ CORREGIDO: Si ya tiene review existente, NO mostrar formulario de creación
      // Solo mostrar si hace click en "Editar calificación"
    } catch (error) {
      console.error('Error checking can rate:', error);
    }
  }

  setRating(rating: number) {
    this.selectedRating.set(rating);
  }

  getRatingText(rating: number): string {
    const texts = {
      1: 'Muy malo',
      2: 'Malo',
      3: 'Regular',
      4: 'Bueno',
      5: 'Excelente'
    };
    return texts[rating as keyof typeof texts] || '';
  }

  async onSubmit() {
    if (this.selectedRating() === 0 || !this.reviewDescription.trim() || !this.productId) {
      alert('Por favor completa todos los campos');
      return;
    }

    console.log('📝 [onSubmit] Enviando review:', {
      is_editing: this.isEditing(),
      editing_review_id: this.editingReviewId(),
      rating: this.selectedRating(),
      product_id: this.productId
    });

    this.isSubmitting.set(true);
    try {
      if (this.isEditing() && this.editingReviewId()) {
        // Actualizar reseña existente
        console.log('🔄 [onSubmit] Actualizando reseña existente...');
        const response = await this.reviewService.updateReview(
          this.editingReviewId()!,
          this.selectedRating(),
          this.reviewDescription.trim()
        ).toPromise();

        if (response) {
          console.log('✅ [onSubmit] Reseña actualizada exitosamente');
          this.reviewUpdated.emit(response.review);
          this.resetForm();
          await this.loadReviews(this.currentPage()); // Recargar reviews
          await this.checkCanRate(); // Actualizar estado
          alert('Calificación actualizada exitosamente');
        }
      } else {
        // Crear nueva reseña
        console.log('➕ [onSubmit] Creando nueva reseña...');
        const response = await this.reviewService.createReview({
          product_id: this.productId,
          product_type: this.productType,
          rating: this.selectedRating(),
          description: this.reviewDescription.trim()
        }).toPromise();

        if (response) {
          console.log('✅ [onSubmit] Reseña creada exitosamente');
          this.reviewAdded.emit(response.review);
          this.resetForm();
          await this.loadReviews(1); // Volver a página 1 para ver la nueva review
          await this.checkCanRate(); // Actualizar estado (ahora can_rate será false)
          alert('Calificación enviada exitosamente');
        }
      }
    } catch (error: any) {
      console.error('❌ [onSubmit] Error submitting review:', error);
      const errorMessage = error?.error?.message_text || 'Error al enviar la calificación';
      alert(errorMessage);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm() {
    this.selectedRating.set(0);
    this.reviewDescription = '';
    this.isEditing.set(false);
    this.editingReviewId.set(null);
  }

  editExistingReview() {
    if (this.canRateResponse()?.existing_review) {
      const existingReview = this.canRateResponse()!.existing_review!;
      console.log('✏️ [editExistingReview] Entrando en modo edición:', {
        review_id: existingReview._id,
        rating: existingReview.rating
      });
      this.isEditing.set(true);
      this.editingReviewId.set(existingReview._id);
      this.selectedRating.set(existingReview.rating);
      this.reviewDescription = existingReview.description;
    }
  }

  generateStars(rating: number): string[] {
    return this.reviewService.generateStars(rating);
  }

  getRatingPercentage(rating: number): number {
    if (!this.statistics()) return 0;
    const total = this.statistics()!.total_reviews;
    if (total === 0) return 0;
    const distribution = this.statistics()!.rating_distribution;
    return Math.round((distribution[rating as keyof typeof distribution] / total) * 100);
  }

  // Pagination methods
  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.loadReviews(page);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }

    return pages;
  }

  getRatingCount(rating: number): number {
    if (!this.statistics()) return 0;
    const distribution = this.statistics()!.rating_distribution;
    return distribution[rating as keyof typeof distribution];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // ✅ NUEVO: Métodos para respuestas del instructor

  /**
   * ✅ CORREGIDO: Verificar si el usuario actual puede responder reviews
   * Solo instructores y admins pueden responder
   */
  canReplyToReviews = computed(() => {
    const user = this.authService.user();
    if (!user) {
      console.log('❌ [canReplyToReviews] No hay usuario autenticado');
      return false;
    }

    console.log('🔍 [canReplyToReviews] Verificando permisos:', {
      user_id: user._id,
      user_role: user.rol,
      is_admin: user.rol === 'admin',
      is_instructor: user.rol === 'instructor'
    });

    // Admin puede responder a cualquier review
    if (user.rol === 'admin') {
      console.log('✅ [canReplyToReviews] Usuario es admin');
      return true;
    }

    // Instructor puede responder (el backend valida si es SU curso)
    if (user.rol === 'instructor') {
      console.log('✅ [canReplyToReviews] Usuario es instructor');
      return true;
    }

    console.log('❌ [canReplyToReviews] Usuario no tiene permisos (rol:', user.rol + ')');
    return false;
  });

  /**
   * ✅ CORREGIDO: Iniciar respuesta a una review
   */
  startReply(reviewId: string) {
    console.log('💬 [startReply] Iniciando respuesta para review:', reviewId);
    console.log('🔍 [startReply] Permisos actuales:', {
      can_reply: this.canReplyToReviews(),
      user_role: this.authService.user()?.rol
    });
    this.replyingTo.set(reviewId);
    this.replyText.set('');
    this.editingReplyFor.set(null);
  }

  /**
   * Editar respuesta existente
   */
  editReply(reviewId: string, currentReply: string) {
    this.replyingTo.set(reviewId);
    this.replyText.set(currentReply);
    this.editingReplyFor.set(reviewId);
  }

  /**
   * Cancelar respuesta
   */
  cancelReply() {
    this.replyingTo.set(null);
    this.replyText.set('');
    this.editingReplyFor.set(null);
  }

  /**
   * ✅ CORREGIDO: Enviar o actualizar respuesta con validación mejorada
   */
  async submitReply(reviewId: string) {
    if (!this.replyText().trim()) {
      alert('Por favor escribe una respuesta');
      return;
    }

    // ✅ VALIDAR permisos antes de enviar
    if (!this.canReplyToReviews()) {
      console.error('❌ [submitReply] Usuario no tiene permisos para responder');
      alert('No tienes permisos para responder a reviews');
      return;
    }

    console.log('📤 [submitReply] Enviando respuesta:', {
      review_id: reviewId,
      is_editing: this.editingReplyFor() === reviewId,
      reply_length: this.replyText().trim().length,
      user_role: this.authService.user()?.rol
    });

    this.isSubmittingReply.set(true);

    try {
      const isEditing = this.editingReplyFor() === reviewId;

      if (isEditing) {
        // Actualizar respuesta existente
        console.log('🔄 [submitReply] Actualizando respuesta existente...');
        await this.reviewService.updateReply(reviewId, this.replyText().trim()).toPromise();
        console.log('✅ [submitReply] Respuesta actualizada');
      } else {
        // Agregar nueva respuesta
        console.log('➕ [submitReply] Agregando nueva respuesta...');
        await this.reviewService.addReply(reviewId, this.replyText().trim()).toPromise();
        console.log('✅ [submitReply] Respuesta agregada');
      }

      // Recargar reviews para mostrar la respuesta
      await this.loadReviews(this.currentPage());

      // Limpiar formulario
      this.cancelReply();

      alert(isEditing ? 'Respuesta actualizada exitosamente' : 'Respuesta enviada exitosamente');

    } catch (error: any) {
      console.error('❌ [submitReply] Error al enviar respuesta:', error);
      console.error('❌ [submitReply] Error completo:', JSON.stringify(error, null, 2));
      const errorMessage = error?.error?.message_text || error?.message || 'Error al enviar la respuesta';
      alert(errorMessage);
    } finally {
      this.isSubmittingReply.set(false);
    }
  }

  /**
   * Eliminar respuesta
   */
  async deleteReply(reviewId: string) {
    if (!confirm('¿Estás seguro de eliminar esta respuesta?')) {
      return;
    }

    this.isSubmittingReply.set(true);

    try {
      await this.reviewService.deleteReply(reviewId).toPromise();
      console.log('✅ Respuesta eliminada');

      // Recargar reviews
      await this.loadReviews(this.currentPage());

      alert('Respuesta eliminada exitosamente');

    } catch (error: any) {
      console.error('Error al eliminar respuesta:', error);
      const errorMessage = error?.error?.message_text || 'Error al eliminar la respuesta';
      alert(errorMessage);
    } finally {
      this.isSubmittingReply.set(false);
    }
  }
}
