// 🧪 SCRIPT DE PRUEBA - Pegar en la consola del navegador
// Este script te ayudará a ver exactamente qué está pasando

console.clear();
console.log('🧪 ========== DIAGNÓSTICO DE COMPRAS ==========');

// 1. Verificar si hay usuario autenticado
const token = localStorage.getItem('token');
console.log('👤 Token presente:', token ? '✅ Sí' : '❌ No');

// 2. Verificar localStorage completo
console.log('\n📦 LocalStorage completo:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`  ${key}:`, value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
}

// 3. Hacer llamada manual al API
console.log('\n🌐 Haciendo llamada al API...');
fetch('http://localhost:8000/sales/student', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('\n✅ Respuesta del API recibida:');
  console.log('📚 Cursos comprados:', data.courses?.length || 0);
  console.log('🎨 Proyectos comprados:', data.projects?.length || 0);
  
  console.log('\n📝 IDs de cursos:');
  data.courses?.forEach((course, i) => {
    console.log(`  ${i + 1}. ${course._id} - ${course.title}`);
  });
  
  console.log('\n📝 IDs de proyectos:');
  data.projects?.forEach((project, i) => {
    console.log(`  ${i + 1}. ${project._id} - ${project.title}`);
  });
  
  console.log('\n📦 Respuesta completa:', data);
})
.catch(error => {
  console.error('\n❌ Error al llamar al API:', error);
});

console.log('\n🧪 ========== FIN DIAGNÓSTICO ==========');
