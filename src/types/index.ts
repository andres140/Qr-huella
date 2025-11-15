export interface Person {
  id: string;
  nombre: string;
  apellido?: string;
  documento: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PASAPORTE';
  programa?: string;
  ficha?: string;
  zona?: string; // Zona o destino donde va la persona o visitante
  rol: 'ESTUDIANTE' | 'INSTRUCTOR' | 'ADMINISTRATIVO' | 'VISITANTE';
  estado: 'ACTIVO' | 'INACTIVO' | 'EN FORMACION' | 'APLAZADO' | 'CANCELADO' | 'SUSPENDIDO' | 'RETIRO VOLUNTARIO' | 'POR CERTIFICAR' | 'CERTIFICADO';
  tipoSangre: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  foto?: string; // Ruta del archivo de foto (formato: uploads/fotos/[documento]-[timestamp].jpg)
}

export interface AccessRecord {
  id: string;
  personaId: string;
  persona: Person;
  tipo: 'ENTRADA' | 'SALIDA' | 'AUTO'; // AUTO permite que el backend determine automáticamente
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

export interface Visitante {
  id: string;
  nombre: string;
  apellido?: string;
  documento: string;
  tipo_documento: 'CC' | 'TI' | 'CE' | 'PASAPORTE';
  tipo_sangre?: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  motivo?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface VisitorQR {
  id: string;
  visitante: Person | Visitante;
  visitanteId?: string;
  codigoQR: string;
  fechaGeneracion: Date;
  fechaExpiracion: Date;
  estado: 'ACTIVO' | 'EXPIRADO' | 'USADO' | 'REVOCADO';
  generadoPor: string; // ID del usuario que lo generó
  nombre?: string;
  apellido?: string;
  documento?: string;
  tipoSangre?: string;
  horasRestantes?: number;
}

export interface RegistroVisitante {
  id: string;
  visitante_id: string;
  qr_id?: string;
  tipo: 'ENTRADA' | 'SALIDA';
  timestamp: Date;
  ubicacion: string;
  usuario_registro?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'GUARDA' | 'ADMINISTRADOR';
  message: string;
  timestamp: Date;
}