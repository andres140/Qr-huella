const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';
let token = '';
let visitanteId = '';
let qrId = '';
let codigoQR = '';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('1️⃣  INICIANDO SESIÓN', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      usuario: 'sasa@gmail.com',
      password: '123456'
    });
    
    token = response.data.token;
    log(`✅ Login exitoso como: ${response.data.usuario.nombre}`, 'green');
    log(`   Token: ${token.substring(0, 30)}...`, 'yellow');
    return true;
  } catch (error) {
    log(`❌ Error en login: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function registrarVisitante() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('2️⃣  REGISTRANDO VISITANTE', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    const visitanteData = {
      nombre: 'Carlos Alberto',
      apellido: 'Rodríguez Pérez',
      documento: '1098765432',
      tipoDocumento: 'CC',
      tipoSangre: 'O+',
      motivo: 'Reunión con coordinación académica'
    };
    
    log('📝 Datos del visitante:', 'yellow');
    console.log(visitanteData);
    
    const response = await axios.post(`${API_URL}/visitantes`, visitanteData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    visitanteId = response.data.data.id;
    log(`✅ Visitante registrado exitosamente`, 'green');
    log(`   ID: ${visitanteId}`, 'yellow');
    log(`   Documento: ${response.data.data.documento}`, 'yellow');
    log(`   Mensaje: ${response.data.mensaje}`, 'magenta');
    
    return true;
  } catch (error) {
    log(`❌ Error al registrar visitante: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function generarQR() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('3️⃣  GENERANDO QR TEMPORAL', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    const response = await axios.post(
      `${API_URL}/visitantes/${visitanteId}/generar-qr`,
      { horasValidez: 24 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    qrId = response.data.data.id;
    codigoQR = response.data.data.codigoQR;
    
    log(`✅ QR generado exitosamente`, 'green');
    log(`   QR ID: ${qrId}`, 'yellow');
    log(`   Código: ${codigoQR}`, 'yellow');
    log(`   Expira: ${new Date(response.data.data.fechaExpiracion).toLocaleString('es-CO')}`, 'yellow');
    log(`   Mensaje: ${response.data.mensaje}`, 'magenta');
    
    return true;
  } catch (error) {
    log(`❌ Error al generar QR: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function validarQR() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('4️⃣  VALIDANDO QR', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    const response = await axios.post(
      `${API_URL}/visitantes/validar-qr`,
      { codigoQR },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.valido) {
      log(`✅ QR VÁLIDO`, 'green');
      log(`   Visitante: ${response.data.data.nombre} ${response.data.data.apellido}`, 'yellow');
      log(`   Documento: ${response.data.data.documento}`, 'yellow');
      log(`   Tipo Sangre: ${response.data.data.tipoSangre}`, 'yellow');
      log(`   Horas restantes: ${response.data.data.horasRestantes}`, 'yellow');
    } else {
      log(`❌ QR INVÁLIDO: ${response.data.mensaje}`, 'red');
    }
    
    return true;
  } catch (error) {
    log(`❌ Error al validar QR: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function registrarEntrada() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('5️⃣  REGISTRANDO ENTRADA', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    const response = await axios.post(
      `${API_URL}/visitantes/registrar-acceso`,
      {
        visitanteId,
        qrId,
        tipo: 'ENTRADA',
        ubicacion: 'Principal'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    log(`✅ ${response.data.mensaje}`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Error al registrar entrada: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function consultarHistorial() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('6️⃣  CONSULTANDO HISTORIAL DE ACCESOS', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    const response = await axios.get(
      `${API_URL}/visitantes/${visitanteId}/accesos`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    log(`✅ Accesos encontrados: ${response.data.data.length}`, 'green');
    
    response.data.data.forEach((acceso, index) => {
      log(`\n   ${index + 1}. ${acceso.tipo}`, 'yellow');
      log(`      Fecha: ${new Date(acceso.timestamp).toLocaleString('es-CO')}`, 'yellow');
      log(`      Ubicación: ${acceso.ubicacion}`, 'yellow');
      log(`      Registrado por: ${acceso.usuarioRegistro || 'N/A'}`, 'yellow');
    });
    
    return true;
  } catch (error) {
    log(`❌ Error al consultar historial: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function listarTodosLosVisitantes() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('7️⃣  LISTANDO TODOS LOS VISITANTES', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    const response = await axios.get(
      `${API_URL}/visitantes`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    log(`✅ Visitantes encontrados: ${response.data.data.length}`, 'green');
    
    response.data.data.slice(0, 5).forEach((v, index) => {
      log(`\n   ${index + 1}. ${v.nombre} ${v.apellido || ''}`, 'yellow');
      log(`      Documento: ${v.documento}`, 'yellow');
      log(`      Estado: ${v.estado}`, 'yellow');
      log(`      Motivo: ${v.motivo || 'N/A'}`, 'yellow');
    });
    
    if (response.data.data.length > 5) {
      log(`\n   ... y ${response.data.data.length - 5} más`, 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ Error al listar visitantes: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function verificarRutasQR() {
  try {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('8️⃣  VERIFICANDO RUTAS DE QR ALTERNATIVAS', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    // Validar usando ruta alternativa
    const response = await axios.post(
      `${API_URL}/qr/validar`,
      { codigoQR },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.valido) {
      log(`✅ Validación alternativa exitosa (ruta /api/qr/validar)`, 'green');
      log(`   Visitante: ${response.data.data.nombre} ${response.data.data.apellido}`, 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ Error en rutas alternativas: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function ejecutarPruebas() {
  log('\n╔════════════════════════════════════════════════════════╗', 'magenta');
  log('║  🧪 PRUEBA DEL SISTEMA DE VISITANTES CON QR TEMPORAL  ║', 'magenta');
  log('╚════════════════════════════════════════════════════════╝', 'magenta');
  
  let paso = 1;
  
  // Paso 1: Login
  if (!await login()) {
    log('\n❌ PRUEBA FALLIDA: No se pudo iniciar sesión', 'red');
    process.exit(1);
  }
  await sleep(500);
  
  // Paso 2: Registrar visitante
  if (!await registrarVisitante()) {
    log('\n❌ PRUEBA FALLIDA: No se pudo registrar visitante', 'red');
    process.exit(1);
  }
  await sleep(500);
  
  // Paso 3: Generar QR
  if (!await generarQR()) {
    log('\n❌ PRUEBA FALLIDA: No se pudo generar QR', 'red');
    process.exit(1);
  }
  await sleep(500);
  
  // Paso 4: Validar QR
  if (!await validarQR()) {
    log('\n❌ PRUEBA FALLIDA: No se pudo validar QR', 'red');
    process.exit(1);
  }
  await sleep(500);
  
  // Paso 5: Registrar entrada
  if (!await registrarEntrada()) {
    log('\n❌ PRUEBA FALLIDA: No se pudo registrar entrada', 'red');
    process.exit(1);
  }
  await sleep(500);
  
  // Paso 6: Consultar historial
  if (!await consultarHistorial()) {
    log('\n❌ PRUEBA FALLIDA: No se pudo consultar historial', 'red');
    process.exit(1);
  }
  await sleep(500);
  
  // Paso 7: Listar visitantes
  if (!await listarTodosLosVisitantes()) {
    log('\n❌ PRUEBA FALLIDA: No se pudo listar visitantes', 'red');
    process.exit(1);
  }
  await sleep(500);
  
  // Paso 8: Verificar rutas alternativas
  if (!await verificarRutasQR()) {
    log('\n❌ PRUEBA FALLIDA: Rutas alternativas no funcionan', 'red');
    process.exit(1);
  }
  
  // Resumen final
  log('\n╔════════════════════════════════════════════════════════╗', 'green');
  log('║            ✅ TODAS LAS PRUEBAS EXITOSAS ✅            ║', 'green');
  log('╚════════════════════════════════════════════════════════╝', 'green');
  
  log('\n📋 RESUMEN:', 'blue');
  log('   ✅ Login de usuario', 'green');
  log('   ✅ Registro de visitante', 'green');
  log('   ✅ Generación de QR temporal', 'green');
  log('   ✅ Validación de QR', 'green');
  log('   ✅ Registro de entrada', 'green');
  log('   ✅ Consulta de historial', 'green');
  log('   ✅ Listado de visitantes', 'green');
  log('   ✅ Rutas alternativas de QR', 'green');
  
  log('\n🎉 Sistema de visitantes funcionando correctamente!', 'magenta');
  
  process.exit(0);
}

// Ejecutar pruebas
ejecutarPruebas().catch(error => {
  log(`\n💥 ERROR CRÍTICO: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


