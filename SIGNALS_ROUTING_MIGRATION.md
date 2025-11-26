# 🚀 Migración a Signals Routing - Profile Student

## 📋 Resumen de Cambios

Hemos migrado el componente `profile-student` para usar **Signals en Routing**, aprovechando las nuevas APIs de Angular 18+ para manejar parámetros de ruta, query params y fragments de forma reactiva.

---

## ✨ Características Nuevas

### 1. **toSignal() para Query Params y Fragment**

```typescript
// ✅ ANTES (Observable tradicional)
this.route.fragment.subscribe(fragment => {
  if (fragment === 'purchases') {
    this.setActiveSection('purchases');
  }
});

// ✅ AHORA (Signal reactivo)
private queryParams = toSignal(this.route.queryParams, { initialValue: {} });
private fragment = toSignal(this.route.fragment, { initialValue: null });

// Uso automático en computed
activeSection = computed(() => {
  const frag = this.fragment();
  if (frag === 'purchases') return 'purchases';
  // ...
});
```

### 2. **Computed Signal para Sección Activa**

```typescript
// ✅ Signal reactivo con múltiples fuentes de datos
activeSection = computed(() => {
  // Prioridad 1: Cambio manual
  const manual = this._manualSection();
  if (manual) return manual;
  
  // Prioridad 2: Fragment en URL
  const frag = this.fragment();
  if (frag && isValidSection(frag)) return frag;
  
  // Prioridad 3: Query param
  const querySection = this.queryParams()['section'];
  if (querySection && isValidSection(querySection)) return querySection;
  
  // Prioridad 4: localStorage
  const stored = localStorage.getItem('profile-active-section');
  if (stored && isValidSection(stored)) return stored;
  
  // Default
  return 'courses';
});
```

### 3. **Effects para Reacciones Automáticas**

```typescript
// ✅ Effect para sincronizar localStorage
effect(() => {
  const section = this.activeSection();
  localStorage.setItem('profile-active-section', section);
  
  // Cargar billetera automáticamente si es necesario
  if (section === 'wallet' && this.authService.isLoggedIn()) {
    this.walletService.loadWallet();
  }
}, { allowSignalWrites: true });

// ✅ Effect para debug
effect(() => {
  const params = this.queryParams();
  const frag = this.fragment();
  console.log('🔍 URL cambió:', { params, fragment: frag });
});
```

---

## 🎯 Ventajas de la Migración

### 1. **Reactividad Automática**
- Los cambios en la URL se reflejan automáticamente en la UI
- No necesitas suscripciones manuales
- Menos código boilerplate

### 2. **Prioridad de Fuentes**
```
1. 🎯 Cambio manual (_manualSection)
   ↓
2. 🔗 Fragment en URL (#purchases)
   ↓
3. 🔍 Query param (?section=wallet)
   ↓
4. 💾 localStorage
   ↓
5. ⚙️ Default ('courses')
```

### 3. **Sin Memory Leaks**
- No más `unsubscribe()` manual
- Angular limpia los signals automáticamente
- Effects se destruyen con el componente

### 4. **Performance Mejorada**
- Computed signals se recalculan solo cuando sus dependencias cambian
- No hay re-renders innecesarios
- Mejor tree-shaking

---

## 📖 Ejemplos de Uso

### Navegación con Fragment
```typescript
// En el template
<a [routerLink]="['/profile-student']" fragment="purchases">
  Ver Compras
</a>

// En el componente
this.router.navigate(['/profile-student'], { 
  fragment: 'wallet' 
});
```

### Navegación con Query Params
```typescript
// En el template
<a [routerLink]="['/profile-student']" [queryParams]="{ section: 'refunds' }">
  Ver Reembolsos
</a>

// En el componente
this.router.navigate(['/profile-student'], { 
  queryParams: { section: 'edit' } 
});
```

### Cambio Manual de Sección
```typescript
// Método mejorado que actualiza el signal manual
setActiveSection(section: ProfileSection) {
  this._manualSection.set(section);
  localStorage.setItem('profile-active-section', section);
}

// Uso
<button (click)="setActiveSection('courses')">
  Mis Cursos
</button>
```

---

## 🔄 Flujo de Datos

```
┌──────────────────────────────────────────────┐
│        URL Changes (Router)                  │
│   /profile-student?section=wallet#purchases │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│         toSignal() Conversion                │
│   ┌─────────────────────────────────┐        │
│   │ queryParams signal              │        │
│   │ fragment signal                 │        │
│   └─────────────────────────────────┘        │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│      Computed Signal (activeSection)         │
│   ┌─────────────────────────────────┐        │
│   │ 1. Check _manualSection         │        │
│   │ 2. Check fragment               │        │
│   │ 3. Check queryParams            │        │
│   │ 4. Check localStorage           │        │
│   │ 5. Return default               │        │
│   └─────────────────────────────────┘        │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│           Effects + Template                 │
│   ┌─────────────────────────────────┐        │
│   │ - Update localStorage            │        │
│   │ - Load wallet if needed         │        │
│   │ - Update UI automatically       │        │
│   └─────────────────────────────────┘        │
└──────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Probar Fragment en URL
```bash
# Navegar a diferentes secciones usando fragment
http://localhost:4200/profile-student#courses
http://localhost:4200/profile-student#purchases
http://localhost:4200/profile-student#wallet
http://localhost:4200/profile-student#refunds
```

### Probar Query Params
```bash
# Navegar usando query params
http://localhost:4200/profile-student?section=courses
http://localhost:4200/profile-student?section=wallet
```

### Probar Prioridad
```bash
# Fragment tiene prioridad sobre query param
http://localhost:4200/profile-student?section=courses#wallet
# Resultado: Muestra 'wallet' (fragment gana)

# Manual tiene prioridad sobre todo
# 1. Click en botón "Mis Cursos"
# 2. La URL puede tener #wallet pero se muestra 'courses'
```

---

## 🎨 Cambios en el Template

### Antes
```html
<!-- Sin cambios en el template -->
<div *ngIf="activeSection() === 'courses'">
  <!-- Cursos -->
</div>
```

### Ahora
```html
<!-- El template sigue igual, pero ahora es reactivo a la URL -->
<div *ngIf="activeSection() === 'courses'">
  <!-- Cursos -->
</div>

<!-- Nuevos links con routing -->
<a [routerLink]="['/profile-student']" fragment="purchases">
  Ver Compras
</a>
```

---

## 📊 Comparación: Antes vs Ahora

| Característica | Antes (Observable) | Ahora (Signals) |
|----------------|-------------------|-----------------|
| **Reactividad** | Manual (subscribe) | Automática (computed) |
| **Memory Leaks** | Posibles (unsubscribe) | No (auto-cleanup) |
| **Código** | Más verbose | Más conciso |
| **Performance** | Buena | Mejor (granular) |
| **URL Sync** | Parcial | Completa |
| **Testing** | Complejo | Simple |

---

## 🔧 Troubleshooting

### Problema: La sección no cambia al hacer clic
**Solución**: Verificar que `_manualSection` se esté actualizando:
```typescript
setActiveSection(section: ProfileSection) {
  console.log('📍 Cambiando sección a:', section);
  this._manualSection.set(section); // ✅ Asegurar que esto se ejecute
}
```

### Problema: La URL no se actualiza
**Solución**: Usar `Router.navigate()` con fragment:
```typescript
this.router.navigate(['/profile-student'], { 
  fragment: 'wallet' 
});
```

### Problema: localStorage no se guarda
**Solución**: Verificar el effect:
```typescript
effect(() => {
  const section = this.activeSection();
  if (typeof window !== 'undefined') {
    localStorage.setItem('profile-active-section', section);
  }
}, { allowSignalWrites: true }); // ✅ Importante: allowSignalWrites
```

---

## 🚀 Próximos Pasos

### Componentes a Migrar
1. ✅ **profile-student** - COMPLETADO
2. ⏳ **learning** - Próximo
3. ⏳ **course-detail** - Próximo
4. ⏳ **checkout** - Próximo

### Mejoras Futuras
- [ ] Migrar guards a signals (cuando esté disponible)
- [ ] Migrar resolvers a signals
- [ ] Implementar `Router.state()` signal (Angular 20+)
- [ ] Pre-fetching con signals

---

## 📚 Recursos

- [Angular Signals Docs](https://angular.dev/guide/signals)
- [toSignal API Reference](https://angular.dev/api/core/rxjs-interop/toSignal)
- [Computed Signals](https://angular.dev/guide/signals#computed-signals)
- [Effects in Angular](https://angular.dev/guide/signals#effects)

---

**Última actualización**: Noviembre 2024  
**Versión de Angular**: 18+  
**Autor**: Equipo de Desarrollo
