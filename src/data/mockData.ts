import { Person, AccessRecord, AccessStats, VisitorQR, User } from '../types';

// Array vacío - El sistema ahora funciona sin datos de prueba
export const mockPersonas: Person[] = [];

// Sin datos de prueba - retorna array vacío
export const generateMockAccessRecords = (personas: Person[]): AccessRecord[] => {
  return [];
};

export const mockUsers: User[] = [];

// Sin datos de prueba - retorna array vacío
export const generateMockVisitorQRs = (): VisitorQR[] => {
  return [];
};

export const calculateAccessStats = (
  personas: Person[], 
  accessRecords: AccessRecord[],
  visitorQRs: VisitorQR[] = []
): AccessStats => {
  // Obtener registros de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayRecords = accessRecords.filter(record => {
    const recordDate = record.timestamp || record.fechaHora || new Date(0);
    return recordDate >= today;
  });
  
  // Calcular quién está dentro (último registro por persona debe ser ENTRADA)
  const personasStatus = new Map<string, 'DENTRO' | 'FUERA'>();
  
  // Procesar registros por persona para determinar estado actual
  personas.forEach(persona => {
    const personRecords = accessRecords
      .filter(record => record.personaId === persona.id)
      .sort((a, b) => {
        const dateA = a.timestamp || a.fechaHora || new Date(0);
        const dateB = b.timestamp || b.fechaHora || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    
    if (personRecords.length > 0) {
      const lastRecord = personRecords[0];
      personasStatus.set(persona.id, lastRecord.tipo === 'ENTRADA' ? 'DENTRO' : 'FUERA');
    } else {
      personasStatus.set(persona.id, 'FUERA');
    }
  });
  
  // Contar personas dentro por rol
  let estudiantesDentro = 0;
  let instructoresDentro = 0;
  let administrativosDentro = 0;
  let visitantesDentro = 0;
  
  personas.forEach(persona => {
    // Considerar como activos varios estados para permitir acceso
    const estadosPermitidos = ['ACTIVO', 'EN FORMACION', 'POR CERTIFICAR', 'CERTIFICADO'];
    const puedeIngresar = estadosPermitidos.includes(persona.estado);
    
    if (personasStatus.get(persona.id) === 'DENTRO' && puedeIngresar) {
      switch (persona.rol) {
        case 'ESTUDIANTE':
          estudiantesDentro++;
          break;
        case 'INSTRUCTOR':
          instructoresDentro++;
          break;
        case 'ADMINISTRATIVO':
          administrativosDentro++;
          break;
        case 'VISITANTE':
          visitantesDentro++;
          break;
      }
    }
  });
  
  // Contar visitantes con QR activo que están dentro
  const ahora = new Date();
  visitorQRs.forEach(qr => {
    // Verificar si el QR está activo y no expirado
    const qrActivo = qr.estado === 'ACTIVO' && qr.fechaExpiracion >= ahora;
    
    if (qrActivo) {
      // Verificar si el visitante tiene un registro de entrada sin salida correspondiente
      const visitanteRecords = accessRecords
        .filter(record => record.personaId === qr.visitante.id)
        .sort((a, b) => {
          const dateA = a.timestamp || a.fechaHora || new Date(0);
          const dateB = b.timestamp || b.fechaHora || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      
      if (visitanteRecords.length > 0) {
        const lastRecord = visitanteRecords[0];
        if (lastRecord.tipo === 'ENTRADA') {
          // Verificar que no haya una salida posterior
          visitantesDentro++;
        }
      } else {
        // Si tiene QR activo pero no tiene registros, podría estar dentro (depende de la lógica del negocio)
        // Por ahora, solo contamos si tiene registro de entrada
      }
    }
  });
  
  const totalPersonasDentro = estudiantesDentro + instructoresDentro + administrativosDentro + visitantesDentro;
  
  return {
    totalPersonasDentro,
    accesosDia: todayRecords.length,
    estudiantesDentro,
    instructoresDentro,
    administrativosDentro,
    visitantesDentro
  };
};