export interface Person {
  id: string;
  nombre: string;
  apellido?: string;
  documento: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PASAPORTE';
  programa?: string;
  ficha?: string;
  rol: 'ESTUDIANTE' | 'INSTRUCTOR' | 'ADMINISTRATIVO' | 'VISITANTE';
  estado: 'ACTIVO' | 'INACTIVO' | 'EN FORMACION' | 'APLAZADO' | 'CANCELADO' | 'SUSPENDIDO' | 'RETIRO VOLUNTARIO' | 'POR CERTIFICAR' | 'CERTIFICADO';
  tipoSangre: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  foto?: string;
}

export interface AccessRecord {
  id: string;
  personaId: string;
  persona: Person;
  tipo: 'ENTRADA' | 'SALIDA';
  timestamp: Date;
  fechaHora?: Date; // Deprecated, usar timestamp
  ubicacion: string;
  codigoQR: string;
}

export interface AccessStats {
  totalPersonasDentro: number;
  accesosDia: number;
  estudiantesDentro: number;
  instructoresDentro: number;
  administrativosDentro: number;
  visitantesDentro: number;
}

export interface User {
  id: string;
  usuario: string;
  nombre: string;
  email: string;
  password: string;
  rol: 'GUARDA' | 'ADMINISTRADOR';
  estado: 'ACTIVO' | 'INACTIVO';
  fechaCreacion: Date;
}

export interface VisitorQR {
  id: string;
  visitante: Person;
  codigoQR: string;
  fechaGeneracion: Date;
  fechaExpiracion: Date;
  estado: 'ACTIVO' | 'EXPIRADO' | 'USADO';
  generadoPor: string; // ID del usuario que lo generó
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'GUARDA' | 'ADMINISTRADOR';
  message: string;
  timestamp: Date;
}