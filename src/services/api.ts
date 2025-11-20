import { Person, AccessRecord, User, VisitorQR, ChatMessage, AccessStats } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Obtener token del localStorage
const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Headers con autenticación
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Manejo de respuestas
const handleResponse = async (response: Response) => {
  let data;
  
  try {
    // Intentar parsear el JSON de la respuesta
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    // Si no se puede parsear el JSON, crear un objeto de error
    console.error('❌ Error al parsear respuesta JSON:', error);
    data = { 
      message: `Error ${response.status}: ${response.statusText}`,
      error: 'Error al procesar la respuesta del servidor'
    };
  }
  
  if (!response.ok) {
    console.error('❌ Error en respuesta:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });
    
    // Extraer el mensaje de error de diferentes formatos posibles
    // Priorizar 'details' si está disponible, luego 'message', luego 'error'
    const errorMessage = data.details || data.message || data.error || data.error?.message || `Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  
  return data;
};

// ============================================
// AUTENTICACIÓN
// ============================================

export const authAPI = {
  login: async (email: string, password: string) => {
    console.log('🔐 Intentando login con:', { email, tienePassword: !!password });
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El backend ahora solo acepta email
        body: JSON.stringify({ email, password }),
      });
      
      console.log('📡 Respuesta del servidor:', response.status, response.statusText);
      
      const data = await handleResponse(response);
      
      if (data.token) {
        console.log('✅ Token recibido y guardado');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
      } else {
        console.warn('⚠️ No se recibió token en la respuesta');
      }
      
      return data;
    } catch (error: any) {
      // Si es un error de red o conexión, proporcionar un mensaje más útil
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error('❌ Error de conexión:', error);
        throw new Error('No se pudo conectar al servidor. Verifica que el backend esté ejecutándose en el puerto 3000.');
      }
      // Re-lanzar el error original para que LoginForm lo maneje
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  verify: async () => {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// ============================================
// PERSONAS
// ============================================

export const personasAPI = {
  getAll: async (params?: { rol?: string; estado?: string; buscar?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.rol) queryParams.append('rol', params.rol);
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.buscar) queryParams.append('buscar', params.buscar);
    
    const response = await fetch(`${API_URL}/personas?${queryParams}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/personas/${id}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getByDocumento: async (documento: string) => {
    const response = await fetch(`${API_URL}/personas/documento/${documento}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  create: async (persona: Omit<Person, 'id'>) => {
    const response = await fetch(`${API_URL}/personas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        nombre: persona.nombre,
        apellido: persona.apellido,
        documento: persona.documento,
        tipoDocumento: persona.tipoDocumento,
        programa: persona.programa,
        ficha: persona.ficha,
        zona: persona.zona,
        rol: persona.rol,
        estado: persona.estado,
        tipoSangre: persona.tipoSangre,
        foto: persona.foto,
      }),
    });
    
    return handleResponse(response);
  },
  
  update: async (id: string, persona: Partial<Person>) => {
    const response = await fetch(`${API_URL}/personas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        nombre: persona.nombre,
        apellido: persona.apellido,
        documento: persona.documento,
        tipoDocumento: persona.tipoDocumento,
        programa: persona.programa,
        ficha: persona.ficha,
        zona: persona.zona,
        rol: persona.rol,
        estado: persona.estado,
        tipoSangre: persona.tipoSangre,
        foto: persona.foto,
      }),
    });
    
    return handleResponse(response);
  },
  
  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/personas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// USUARIOS
// ============================================

export const usuariosAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/usuarios`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  create: async (usuario: Omit<User, 'id' | 'fechaCreacion' | 'estado'>) => {
    const response = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(usuario),
    });
    
    return handleResponse(response);
  },
  
  update: async (id: string, usuario: Partial<User>) => {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(usuario),
    });
    
    return handleResponse(response);
  },
  
  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  cambiarPassword: async (id: string, passwordActual: string, passwordNueva: string) => {
    const response = await fetch(`${API_URL}/usuarios/${id}/cambiar-password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ passwordActual, passwordNueva }),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// ACCESOS
// ============================================

export const accesosAPI = {
  getAll: async (params?: { fecha?: string; tipo?: string; personaId?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.fecha) queryParams.append('fecha', params.fecha);
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.personaId) queryParams.append('personaId', params.personaId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const response = await fetch(`${API_URL}/accesos?${queryParams}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getHoy: async () => {
    const response = await fetch(`${API_URL}/accesos/hoy`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getEstadisticas: async (): Promise<{ success: boolean; data: AccessStats }> => {
    const response = await fetch(`${API_URL}/accesos/estadisticas`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  registrar: async (acceso: { personaId: string; tipo: 'ENTRADA' | 'SALIDA'; ubicacion: string; codigoQR: string }) => {
    const response = await fetch(`${API_URL}/accesos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(acceso),
    });
    
    return handleResponse(response);
  },
  
  getHistorialPersona: async (personaId: string) => {
    const response = await fetch(`${API_URL}/accesos/persona/${personaId}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getEstadoPersona: async (personaId: string) => {
    const response = await fetch(`${API_URL}/accesos/estado/${personaId}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// CÓDIGOS QR
// ============================================

export const qrAPI = {
  getAll: async (params?: { estado?: string; visitanteId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.visitanteId) queryParams.append('visitanteId', params.visitanteId);
    
    const response = await fetch(`${API_URL}/qr?${queryParams}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getByCodigo: async (codigo: string) => {
    const response = await fetch(`${API_URL}/qr/codigo/${codigo}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  generar: async (visitanteId: string, horasValidez: number = 24) => {
    const response = await fetch(`${API_URL}/qr`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ visitanteId, horasValidez }),
    });
    
    return handleResponse(response);
  },
  
  validar: async (codigoQR: string) => {
    const response = await fetch(`${API_URL}/qr/validar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ codigoQR }),
    });
    
    return handleResponse(response);
  },
  
  revocar: async (id: string) => {
    const response = await fetch(`${API_URL}/qr/${id}/revocar`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// CHAT
// ============================================

export const chatAPI = {
  getAll: async (limit: number = 100) => {
    const response = await fetch(`${API_URL}/chat?limit=${limit}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getRecientes: async (cantidad: number = 50) => {
    const response = await fetch(`${API_URL}/chat/recientes/${cantidad}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  enviar: async (mensaje: string) => {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message: mensaje }),
    });
    
    return handleResponse(response);
  },
  
  eliminar: async (id: string) => {
    const response = await fetch(`${API_URL}/chat/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  limpiarAntiguos: async (dias: number = 30) => {
    const response = await fetch(`${API_URL}/chat/limpiar/antiguos?dias=${dias}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// APRENDICES (Nueva API simplificada)
// ============================================

export const aprendicesAPI = {
  getAll: async (params?: { estado?: string; buscar?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.buscar) queryParams.append('buscar', params.buscar);
    
    const response = await fetch(`${API_URL}/aprendices?${queryParams}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/aprendices/${id}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getByQR: async (codigoQR: string) => {
    const response = await fetch(`${API_URL}/aprendices/qr/${codigoQR}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getByDocumento: async (documento: string) => {
    const response = await fetch(`${API_URL}/aprendices/documento/${documento}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  create: async (aprendiz: { nombre: string; apellido?: string; documento: string; tipoDocumento: string; programa?: string; ficha?: string; estado?: string }) => {
    const response = await fetch(`${API_URL}/aprendices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(aprendiz),
    });
    
    return handleResponse(response);
  },
  
  update: async (id: string, aprendiz: Partial<{ nombre: string; apellido: string; documento: string; tipoDocumento: string; programa: string; ficha: string; estado: string }>) => {
    const response = await fetch(`${API_URL}/aprendices/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(aprendiz),
    });
    
    return handleResponse(response);
  },
  
  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/aprendices/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  bulkCreate: async (aprendices: Array<{ nombre: string; apellido?: string; documento: string; tipoDocumento: string; programa?: string; ficha?: string; estado?: string }>) => {
    const response = await fetch(`${API_URL}/aprendices/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ aprendices }),
    });
    
    return handleResponse(response);
  },
  
  uploadFoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('foto', file);
    formData.append('documento', ''); // Se usará el documento del aprendiz
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/aprendices/${id}/foto`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });
    
    return handleResponse(response);
  },
  
  deleteFoto: async (id: string) => {
    const response = await fetch(`${API_URL}/aprendices/${id}/foto`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// ENTRADAS Y SALIDAS (Nueva API simplificada)
// ============================================

export const entradasSalidasAPI = {
  getAll: async (params?: { fecha?: string; tipo?: string; aprendizId?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.fecha) queryParams.append('fecha', params.fecha);
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.aprendizId) queryParams.append('aprendizId', params.aprendizId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const response = await fetch(`${API_URL}/entradas-salidas?${queryParams}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getHoy: async () => {
    const response = await fetch(`${API_URL}/entradas-salidas/hoy`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  escanear: async (data: { codigoQR: string; tipo: 'ENTRADA' | 'SALIDA' | 'AUTO'; ubicacion?: string }) => {
    const response = await fetch(`${API_URL}/entradas-salidas/escanear`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    return handleResponse(response);
  },
  
  getHistorialAprendiz: async (aprendizId: string) => {
    const response = await fetch(`${API_URL}/entradas-salidas/aprendiz/${aprendizId}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getEstadoAprendiz: async (aprendizId: string) => {
    const response = await fetch(`${API_URL}/entradas-salidas/estado/${aprendizId}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  getEstadisticas: async () => {
    const response = await fetch(`${API_URL}/entradas-salidas/estadisticas`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// VISITANTES (Nueva API con QR temporal)
// ============================================

export const visitantesAPI = {
  // Obtener todos los visitantes
  getAll: async (params?: { estado?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.append('estado', params.estado);
    
    const response = await fetch(`${API_URL}/visitantes?${queryParams}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  // Obtener visitante por ID
  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/visitantes/${id}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  // Buscar visitante por documento
  getByDocumento: async (documento: string) => {
    const response = await fetch(`${API_URL}/visitantes/documento/${documento}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  // Registrar nuevo visitante
  create: async (visitante: {
    nombre: string;
    apellido?: string;
    documento: string;
    tipoDocumento?: 'CC' | 'TI' | 'CE' | 'PASAPORTE';
    tipoSangre?: string;
    motivo?: string;
    zona?: string;
    horasValidez?: number;
    minutosValidez?: number;
  }) => {
    const response = await fetch(`${API_URL}/visitantes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(visitante),
    });
    
    return handleResponse(response);
  },
  
  // Actualizar visitante
  update: async (id: string, visitante: Partial<{
    nombre: string;
    apellido: string;
    tipo_documento: string;
    tipo_sangre: string;
    motivo: string;
    estado: string;
  }>) => {
    const response = await fetch(`${API_URL}/visitantes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(visitante),
    });
    
    return handleResponse(response);
  },
  
  // Desactivar visitante (soft delete)
  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/visitantes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  // Generar QR temporal para visitante
  generarQR: async (visitanteId: string, horasValidez: number = 24) => {
    const response = await fetch(`${API_URL}/visitantes/${visitanteId}/generar-qr`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ horasValidez }),
    });
    
    return handleResponse(response);
  },
  
  // Validar QR de visitante
  validarQR: async (codigoQR: string) => {
    const response = await fetch(`${API_URL}/visitantes/validar-qr`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ codigoQR }),
    });
    
    return handleResponse(response);
  },
  
  // Registrar entrada o salida de visitante
  registrarAcceso: async (data: {
    visitanteId: string;
    qrId?: string;
    tipo: 'ENTRADA' | 'SALIDA';
    ubicacion?: string;
  }) => {
    const response = await fetch(`${API_URL}/visitantes/registrar-acceso`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...data,
        ubicacion: data.ubicacion || 'Principal'
      }),
    });
    
    return handleResponse(response);
  },
  
  // Obtener historial de accesos de un visitante
  getAccesos: async (visitanteId: string) => {
    const response = await fetch(`${API_URL}/visitantes/${visitanteId}/accesos`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
  
  // Obtener todos los QR generados para un visitante
  getQRs: async (visitanteId: string) => {
    const response = await fetch(`${API_URL}/visitantes/${visitanteId}/qrs`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

export default {
  auth: authAPI,
  personas: personasAPI,
  usuarios: usuariosAPI,
  accesos: accesosAPI,
  qr: qrAPI,
  chat: chatAPI,
  aprendices: aprendicesAPI,
  entradasSalidas: entradasSalidasAPI,
  visitantes: visitantesAPI,
};


