import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { GuardView } from './components/GuardView';
import { AdminView } from './components/AdminView';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { Fingerprint, LogOut, User as UserIcon } from 'lucide-react';
import { Person, AccessRecord, AccessStats, User, VisitorQR, ChatMessage } from './types';
import { Chat } from './components/Chat';
import { 
  mockPersonas, 
  generateMockAccessRecords, 
  calculateAccessStats,
  generateMockVisitorQRs
} from './data/mockData';
import { aprendicesAPI, entradasSalidasAPI, authAPI, usuariosAPI } from './services/api';
import api from './services/api';
import { toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [personas, setPersonas] = useState<Person[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([]);
  const [visitorQRs, setVisitorQRs] = useState<VisitorQR[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<AccessStats>({
    totalPersonasDentro: 0,
    accesosDia: 0,
    estudiantesDentro: 0,
    instructoresDentro: 0,
    administrativosDentro: 0,
    visitantesDentro: 0
  });

  // Cargar usuarios desde el backend al iniciar (solo si hay usuario logueado)
  useEffect(() => {
    const loadUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await usuariosAPI.getAll();
        if (response.success && response.data) {
          // Convertir usuarios del backend a formato User
          const usuariosFromBackend: User[] = response.data.map((u: any) => ({
            id: u.id.toString(),
            usuario: u.email.split('@')[0], // Generar usuario desde email
            nombre: u.nombre,
            email: u.email,
            password: '', // No se envía la contraseña desde el backend por seguridad
            rol: u.rol,
            estado: u.estado,
            fechaCreacion: u.fechaCreacion ? new Date(u.fechaCreacion) : new Date(),
            ultimoAcceso: u.ultimoAcceso ? new Date(u.ultimoAcceso) : undefined,
          }));
          setUsers(usuariosFromBackend);
        }
      } catch (error) {
        console.error('Error loading users from backend:', error);
        // Si falla, intentar cargar desde localStorage como fallback
    const savedUsers = localStorage.getItem('sena_users');
    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers);
        const usersWithDates = parsedUsers.map((u: any) => ({
          ...u,
          fechaCreacion: new Date(u.fechaCreacion)
        }));
        setUsers(usersWithDates);
          } catch (e) {
            console.error('Error loading users from localStorage:', e);
          }
        }
      }
    };
    
    loadUsers();
  }, [user]); // Recargar cuando cambie el usuario logueado

  // Verificar si hay un usuario logueado (token válido) al iniciar
  useEffect(() => {
    const checkLoggedInUser = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Verificar que el token sea válido
          const response = await authAPI.verify();
          if (response.success && response.usuario) {
            const userFromBackend = response.usuario;
            const user: User = {
              id: userFromBackend.id,
              usuario: userFromBackend.usuario,
              nombre: userFromBackend.nombre,
              email: userFromBackend.email,
              rol: userFromBackend.rol,
              estado: userFromBackend.estado,
              password: '',
              fechaCreacion: new Date()
            };
            setUser(user);
          }
        } catch (error) {
          // Token inválido o expirado, limpiar
          console.error('Token inválido o expirado:', error);
          authAPI.logout();
        }
      }
    };
    
    checkLoggedInUser();
  }, []);

  // Cargar aprendices desde el backend al iniciar (solo si hay usuario logueado)
  useEffect(() => {
    const loadAprendices = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await aprendicesAPI.getAll();
        if (response.success && response.data) {
          // Convertir aprendices del backend a formato Person
          const aprendicesAsPersonas: Person[] = response.data.map((a: any) => ({
            id: a.id,
            nombre: a.nombre,
            apellido: a.apellido || '',
            documento: a.documento,
            tipoDocumento: a.tipoDocumento || a.tipo_documento || 'CC',
            programa: a.programa || '',
            ficha: a.ficha || '',
            rol: 'ESTUDIANTE', // Los aprendices siempre son estudiantes
            estado: a.estado,
            tipoSangre: 'O+', // Valor por defecto, se puede agregar luego
            foto: a.foto || null,
          }));
          setPersonas(aprendicesAsPersonas);
        }
      } catch (error) {
        console.error('Error loading aprendices from backend:', error);
      }
    };
    
    loadAprendices();
  }, [user]);

  // Cargar registros de entrada/salida desde el backend al iniciar
  useEffect(() => {
    const loadRegistros = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await entradasSalidasAPI.getHoy();
        if (response.success && response.data) {
          // Convertir registros del backend a formato AccessRecord
          const registrosAsAccessRecords: AccessRecord[] = response.data.map((r: any) => {
            // Determinar timestamp: usar fecha_entrada o fecha_salida si están disponibles
            let timestamp = r.timestamp;
            if (r.fecha_entrada) {
              timestamp = r.fecha_entrada;
            } else if (r.fecha_salida) {
              timestamp = r.fecha_salida;
            }
            
            return {
              id: r.id,
              personaId: r.personaId || r.aprendizId,
              persona: personas.find(p => p.id === (r.personaId || r.aprendizId)) || {
                id: r.personaId || r.aprendizId,
                nombre: r.nombres || r.nombre || 'Sin nombre',
                apellido: r.apellidos || r.apellido || '',
                documento: r.documento,
                tipoDocumento: r.tipo_documento || 'CC',
                programa: r.programa || '',
                ficha: r.ficha || '',
                rol: 'ESTUDIANTE',
                estado: 'ACTIVO',
                tipoSangre: 'O+',
                foto: null,
              },
              tipo: r.tipo,
              timestamp: timestamp ? new Date(timestamp) : new Date(),
              fechaHora: timestamp ? new Date(timestamp) : new Date(),
              ubicacion: r.ubicacion || 'Entrada Principal',
              codigoQR: r.codigoQR || r.codigo_qr || '',
              fecha_entrada: r.fecha_entrada ? new Date(r.fecha_entrada) : undefined,
              fecha_salida: r.fecha_salida ? new Date(r.fecha_salida) : undefined,
            };
          });
          setAccessRecords(registrosAsAccessRecords);
        }
      } catch (error) {
        console.error('Error loading registros from backend:', error);
      }
    };
    
    if (personas.length > 0) {
      loadRegistros();
    }
  }, [user, personas.length]);

  // Cargar QRs de visitantes desde localStorage al iniciar
  useEffect(() => {
    const savedQRs = localStorage.getItem('sena_visitor_qrs');
    if (savedQRs) {
      try {
        const parsedQRs = JSON.parse(savedQRs);
        // Convertir fechas de string a Date
        const qrsWithDates = parsedQRs.map((q: any) => ({
          ...q,
          fechaGeneracion: new Date(q.fechaGeneracion),
          fechaExpiracion: new Date(q.fechaExpiracion)
        }));
        setVisitorQRs(qrsWithDates);
      } catch (error) {
        console.error('Error loading visitor QRs from localStorage:', error);
      }
    }
  }, []);

  // Guardar usuarios en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_users', JSON.stringify(users));
  }, [users]);

  // Guardar personas en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_personas', JSON.stringify(personas));
  }, [personas]);

  // Guardar registros de acceso en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_access_records', JSON.stringify(accessRecords));
  }, [accessRecords]);

  // Guardar QRs de visitantes en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_visitor_qrs', JSON.stringify(visitorQRs));
  }, [visitorQRs]);

  // Recalcular estadísticas cuando cambien los registros
  useEffect(() => {
    const newStats = calculateAccessStats(personas, accessRecords, visitorQRs);
    setStats(newStats);
  }, [personas, accessRecords, visitorQRs]);

  // Proceso automático para marcar salidas de visitantes cuando expire su QR
  useEffect(() => {
    if (!user) return; // Solo ejecutar si hay usuario logueado
    
    const marcarSalidasAutomaticas = async () => {
      try {
        const response = await api.visitantes.marcarSalidasAutomaticas();
        if (response.success && response.salidasMarcadas > 0) {
          console.log(`✅ ${response.salidasMarcadas} salidas automáticas marcadas`);
          // Recargar registros de acceso para actualizar la UI
          if (user) {
            const registrosResponse = await accesosAPI.getAll({ limit: 100 });
            if (registrosResponse.success && registrosResponse.data) {
              const registros = registrosResponse.data.map((r: any) => ({
                ...r,
                timestamp: new Date(r.timestamp || r.fecha_entrada || r.fecha_salida),
                fechaHora: new Date(r.fecha_entrada || r.fecha_salida || r.timestamp),
              }));
              setAccessRecords(registros);
            }
          }
        }
      } catch (error) {
        console.error('Error al marcar salidas automáticas:', error);
      }
    };

    // Ejecutar inmediatamente y luego cada minuto
    marcarSalidasAutomaticas();
    const interval = setInterval(marcarSalidasAutomaticas, 60000); // Cada minuto
    
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    authAPI.logout(); // Limpia el token del localStorage
    setUser(null);
  };

  const handleAccessGranted = async (newRecord: AccessRecord) => {
    try {
      console.log('🔍 handleAccessGranted - Registro recibido:', {
        codigoQR: newRecord.codigoQR,
        tipo: newRecord.tipo,
        persona: newRecord.persona?.nombre
      });
      
      // GuardView ya buscó en el backend y obtuvo el código QR correcto
      const codigoQR = newRecord.codigoQR;
      
      // Validar que tenemos un código QR válido
      if (!codigoQR) {
        toast.error('❌ Código QR inválido.');
        console.error('❌ Código QR vacío');
        return;
      }
      
      // Detectar si es un QR de visitante o de aprendiz
      const esVisitante = codigoQR.startsWith('VISITOR_');
      const esAprendiz = codigoQR.startsWith('APR-');
      
      if (!esVisitante && !esAprendiz) {
        toast.error('❌ Código QR inválido. Debe ser de un aprendiz o visitante registrado.');
        console.error('❌ Código QR inválido:', codigoQR);
        console.log('💡 El código QR debe empezar con APR- (aprendiz) o VISITOR_ (visitante)');
        return;
      }
      
      // Registrar en el backend según el tipo
      console.log(`📤 Registrando ${esVisitante ? 'visitante' : 'aprendiz'} en backend:`, { 
        codigoQR, 
        tipo: newRecord.tipo, 
        ubicacion: newRecord.ubicacion || 'Principal' 
      });
      
      let response: any;
      
      if (esVisitante) {
        // Registrar visitante
        // Primero validar el QR
        const validacion = await api.visitantes.validarQR(codigoQR);
        
        if (!validacion.valido) {
          toast.error(`❌ ${validacion.mensaje}`);
          console.error('❌ QR de visitante inválido:', validacion.mensaje);
          return;
        }
        
        // Registrar acceso (el backend determinará automáticamente si es ENTRADA o SALIDA)
        response = await api.visitantes.registrarAcceso({
          visitanteId: validacion.data.visitanteId,
          qrId: validacion.data.qrId,
          tipo: 'AUTO', // El backend determinará automáticamente si es ENTRADA o SALIDA
          ubicacion: newRecord.ubicacion || 'Principal',
        });
        
        if (response.success) {
          const tipoRegistrado = response.tipoRegistrado || newRecord.tipo;
          const newAccessRecord: AccessRecord = {
            id: Date.now().toString(),
            personaId: validacion.data.visitanteId,
            persona: newRecord.persona,
            tipo: tipoRegistrado,
            timestamp: new Date(),
            fechaHora: new Date(),
            ubicacion: newRecord.ubicacion || 'Principal',
            codigoQR: codigoQR,
          };
          setAccessRecords(prev => [newAccessRecord, ...prev]);
          toast.success(`✅ ${tipoRegistrado} de visitante registrada: ${validacion.data.nombre}`);
          
          // Recargar registros desde el backend para asegurar que tenemos todos los datos actualizados
          setTimeout(async () => {
            try {
              const registrosResponse = await entradasSalidasAPI.getHoy();
              if (registrosResponse.success && registrosResponse.data) {
                const registrosAsAccessRecords: AccessRecord[] = registrosResponse.data.map((r: any) => {
                  let timestamp = r.timestamp;
                  if (r.fecha_entrada) {
                    timestamp = r.fecha_entrada;
                  } else if (r.fecha_salida) {
                    timestamp = r.fecha_salida;
                  }
                  
                  return {
                    id: r.id,
                    personaId: r.personaId || r.aprendizId,
                    persona: personas.find(p => p.id === (r.personaId || r.aprendizId)) || {
                      id: r.personaId || r.aprendizId,
                      nombre: r.nombres || r.nombre || 'Sin nombre',
                      apellido: r.apellidos || r.apellido || '',
                      documento: r.documento,
                      tipoDocumento: r.tipo_documento || 'CC',
                      programa: r.programa || '',
                      ficha: r.ficha || '',
                      rol: 'ESTUDIANTE',
                      estado: 'ACTIVO',
                      tipoSangre: 'O+',
                      foto: null,
                    },
                    tipo: r.tipo,
                    timestamp: timestamp ? new Date(timestamp) : new Date(),
                    fechaHora: timestamp ? new Date(timestamp) : new Date(),
                    ubicacion: r.ubicacion || 'Entrada Principal',
                    codigoQR: r.codigoQR || r.codigo_qr || '',
                    fecha_entrada: r.fecha_entrada ? new Date(r.fecha_entrada) : undefined,
                    fecha_salida: r.fecha_salida ? new Date(r.fecha_salida) : undefined,
                  };
                });
                setAccessRecords(registrosAsAccessRecords);
              }
            } catch (error) {
              console.error('Error al recargar registros:', error);
            }
          }, 500);
        }
      } else {
        // Registrar aprendiz
        response = await entradasSalidasAPI.escanear({
          codigoQR: codigoQR,
          tipo: newRecord.tipo,
          ubicacion: newRecord.ubicacion || 'Principal',
        });
        
        console.log('📥 Respuesta del backend:', response);
        
        if (response.success && response.data) {
          const registroBD = response.data;
          
          // El backend devuelve fecha_entrada y fecha_salida (TIMESTAMP), usar la fecha correspondiente según el tipo
          const fechaEntrada = registroBD.fecha_entrada ? new Date(registroBD.fecha_entrada) : undefined;
          const fechaSalida = registroBD.fecha_salida ? new Date(registroBD.fecha_salida) : undefined;
          const fechaRegistro = fechaEntrada || fechaSalida || new Date();
          
          const newAccessRecord: AccessRecord = {
            id: registroBD.id || registroBD.id_registro_entrada_salida,
            personaId: registroBD.personaId || registroBD.id_persona,
            persona: newRecord.persona,
            tipo: response.tipoRegistrado || registroBD.tipo, // Usar el tipo que realmente se registró
            timestamp: fechaRegistro,
            fechaHora: fechaRegistro,
            ubicacion: 'Entrada Principal', // El backend no devuelve ubicación
            codigoQR: codigoQR,
            fecha_entrada: fechaEntrada,
            fecha_salida: fechaSalida,
          };
          setAccessRecords(prev => [newAccessRecord, ...prev]);
          
          // Recargar registros desde el backend para asegurar que tenemos todos los datos actualizados
          setTimeout(async () => {
            try {
              const registrosResponse = await entradasSalidasAPI.getHoy();
              if (registrosResponse.success && registrosResponse.data) {
                const registrosAsAccessRecords: AccessRecord[] = registrosResponse.data.map((r: any) => {
                  let timestamp = r.timestamp;
                  if (r.fecha_entrada) {
                    timestamp = r.fecha_entrada;
                  } else if (r.fecha_salida) {
                    timestamp = r.fecha_salida;
                  }
                  
                  return {
                    id: r.id,
                    personaId: r.personaId || r.aprendizId,
                    persona: personas.find(p => p.id === (r.personaId || r.aprendizId)) || {
                      id: r.personaId || r.aprendizId,
                      nombre: r.nombres || r.nombre || 'Sin nombre',
                      apellido: r.apellidos || r.apellido || '',
                      documento: r.documento,
                      tipoDocumento: r.tipo_documento || 'CC',
                      programa: r.programa || '',
                      ficha: r.ficha || '',
                      rol: 'ESTUDIANTE',
                      estado: 'ACTIVO',
                      tipoSangre: 'O+',
                      foto: null,
                    },
                    tipo: r.tipo,
                    timestamp: timestamp ? new Date(timestamp) : new Date(),
                    fechaHora: timestamp ? new Date(timestamp) : new Date(),
                    ubicacion: r.ubicacion || 'Entrada Principal',
                    codigoQR: r.codigoQR || r.codigo_qr || '',
                    fecha_entrada: r.fecha_entrada ? new Date(r.fecha_entrada) : undefined,
                    fecha_salida: r.fecha_salida ? new Date(r.fecha_salida) : undefined,
                  };
                });
                setAccessRecords(registrosAsAccessRecords);
              }
            } catch (error) {
              console.error('Error al recargar registros:', error);
            }
          }, 500);
          
          const mensaje = response.tipoRegistrado && response.tipoRegistrado !== newRecord.tipo
            ? `${response.tipoRegistrado} registrada (tipo ajustado automáticamente)`
            : response.message || `${response.tipoRegistrado || registroBD.tipo} registrada correctamente`;
          
          toast.success(mensaje);
        } else {
          throw new Error(response.message || 'Error al registrar en el backend');
        }
      }
    } catch (error: any) {
      console.error('❌ Error al registrar entrada/salida:', error);
      console.error('Stack:', error.stack);
      toast.error('❌ Error al registrar: ' + (error.message || 'Error desconocido'));
      // NO agregar localmente si falla el backend - el usuario debe saber que no se guardó
    }
  };

  const handlePersonUpdate = (updatedPerson: Person) => {
    setPersonas(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
  };

  const handlePersonDelete = (personId: string) => {
    setPersonas(prev => prev.filter(p => p.id !== personId));
  };

  const handlePersonAdd = async (newPersonData: Omit<Person, 'id'>) => {
    try {
      // Si es un estudiante, usar la API de aprendices
      if (newPersonData.rol === 'ESTUDIANTE') {
        const response = await aprendicesAPI.create({
          nombre: newPersonData.nombre,
          apellido: newPersonData.apellido,
          documento: newPersonData.documento,
          tipoDocumento: newPersonData.tipoDocumento,
          programa: newPersonData.programa,
          ficha: newPersonData.ficha,
          estado: newPersonData.estado || 'ACTIVO',
        });
        
        if (response.success && response.data) {
          const nuevoAprendiz = response.data;
          const newPerson: Person = {
            id: nuevoAprendiz.id,
            nombre: nuevoAprendiz.nombre,
            apellido: nuevoAprendiz.apellido || '',
            documento: nuevoAprendiz.documento,
            tipoDocumento: nuevoAprendiz.tipoDocumento || nuevoAprendiz.tipo_documento || 'CC',
            programa: nuevoAprendiz.programa || '',
            ficha: nuevoAprendiz.ficha || '',
            rol: 'ESTUDIANTE',
            estado: nuevoAprendiz.estado,
            tipoSangre: 'O+',
            foto: nuevoAprendiz.foto || null,
          };
          setPersonas(prev => [...prev, newPerson]);
          toast.success('✅ Aprendiz registrado correctamente');
        }
      } else {
        // Para otros roles, mantener comportamiento local por ahora
    const newPerson: Person = {
      ...newPersonData,
      id: Date.now().toString()
    };
    setPersonas(prev => [...prev, newPerson]);
      }
    } catch (error: any) {
      console.error('Error al crear aprendiz:', error);
      toast.error('❌ Error al registrar aprendiz: ' + (error.message || 'Error desconocido'));
    }
  };

  // Función para agregar múltiples personas (desde carga de archivo) - REGISTRA EN BD
  const handleBulkPersonAdd = async (newPersonsData: Omit<Person, 'id'>[]) => {
    try {
      // Filtrar solo estudiantes para registrar en BD
      const aprendicesToAdd = newPersonsData
        .filter(p => p.rol === 'ESTUDIANTE')
        .map(p => ({
          nombre: p.nombre,
          apellido: p.apellido || '',
          documento: p.documento,
          tipoDocumento: p.tipoDocumento,
          programa: p.programa,
          ficha: p.ficha,
          estado: p.estado || 'ACTIVO',
        }));
      
      if (aprendicesToAdd.length === 0) {
        toast.warning('⚠️ No hay aprendices para registrar');
        return { exitosos: 0, duplicados: 0, fallidos: 0 };
      }
      
      console.log(`📦 Registrando ${aprendicesToAdd.length} aprendices en BD...`);
      
      // Llamar al endpoint de carga masiva
      const response = await aprendicesAPI.bulkCreate(aprendicesToAdd);
      
      if (response.success && response.data) {
        const { exitosos, duplicados, fallidos } = response.data;
        
        // Recargar aprendices desde el backend para actualizar la lista
        const aprendicesResponse = await aprendicesAPI.getAll();
        if (aprendicesResponse.success && aprendicesResponse.data) {
          const aprendicesAsPersonas: Person[] = aprendicesResponse.data.map((a: any) => ({
            id: a.id,
            nombre: a.nombre,
            apellido: a.apellido || '',
            documento: a.documento,
            tipoDocumento: a.tipoDocumento || a.tipo_documento || 'CC',
            programa: a.programa || '',
            ficha: a.ficha || '',
            rol: 'ESTUDIANTE',
            estado: a.estado,
            tipoSangre: 'O+',
            foto: a.foto || null,
          }));
          setPersonas(prev => {
            // Mantener personas que no son estudiantes y agregar/actualizar aprendices
            const noEstudiantes = prev.filter(p => p.rol !== 'ESTUDIANTE');
            const aprendicesMap = new Map(aprendicesAsPersonas.map(a => [a.documento, a]));
            const estudiantesActualizados = prev
              .filter(p => p.rol === 'ESTUDIANTE')
              .map(p => aprendicesMap.get(p.documento) || p);
            const nuevosAprendices = aprendicesAsPersonas.filter(
              a => !prev.some(p => p.documento === a.documento && p.rol === 'ESTUDIANTE')
            );
            return [...noEstudiantes, ...estudiantesActualizados, ...nuevosAprendices];
          });
        }
        
        // Retornar el objeto completo para que ReportExporter lo use
        return { 
          exitosos, 
          duplicados, 
          fallidos,
          errores: response.data.errores || []
        };
      } else {
        throw new Error(response.message || 'Error desconocido en carga masiva');
      }
    } catch (error: any) {
      console.error('❌ Error en carga masiva:', error);
      toast.error('❌ Error al registrar aprendices: ' + (error.message || 'Error desconocido'));
      return { exitosos: 0, duplicados: 0, fallidos: 0 };
    }
  };

  const handleVisitorRegistered = async (newPerson: Person) => {
    try {
      // Si es un visitante, guardarlo en la BD con la hora de registro
      if (newPerson.rol === 'VISITANTE') {
        const response = await api.visitantes.create({
          nombre: newPerson.nombre,
          apellido: newPerson.apellido || '',
          documento: newPerson.documento,
          tipoDocumento: newPerson.tipoDocumento,
          tipoSangre: newPerson.tipoSangre,
          motivo: '', // Se puede agregar un campo motivo si es necesario
        });
        
        if (response.success && response.data) {
          // Actualizar el ID con el que viene del backend
          const visitanteBD = response.data;
          const updatedPerson: Person = {
            ...newPerson,
            id: visitanteBD.id,
          };
          setPersonas(prev => [...prev, updatedPerson]);
          toast.success('✅ Visitante registrado correctamente en la BD');
        } else {
          // Si falla el backend, agregar localmente de todas formas
          setPersonas(prev => [...prev, newPerson]);
          toast.warning('⚠️ Visitante agregado localmente (error al guardar en BD)');
        }
      } else {
        // Para otros roles, mantener comportamiento anterior
        setPersonas(prev => [...prev, newPerson]);
      }
    } catch (error: any) {
      console.error('Error al registrar visitante en BD:', error);
      // Si falla, agregar localmente de todas formas
      setPersonas(prev => [...prev, newPerson]);
      toast.error('❌ Error al guardar en BD: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleGenerateVisitorQR = (newQR: VisitorQR) => {
    setVisitorQRs(prev => [...prev, newQR]);
  };

  const handleUserAdd = async (newUserData: Omit<User, 'id'>) => {
    try {
      // Llamar al backend para crear el usuario en la BD
      const response = await usuariosAPI.create({
        nombre: newUserData.nombre,
        email: newUserData.email,
        password: newUserData.password,
        rol: newUserData.rol,
      });

      if (response.success && response.data) {
        const nuevoUsuario: User = {
          id: response.data.id.toString(),
          usuario: newUserData.email.split('@')[0],
          nombre: response.data.nombre,
          email: response.data.email,
          password: newUserData.password, // Guardar temporalmente para mostrarlo
          rol: response.data.rol,
          estado: response.data.estado || 'ACTIVO',
          fechaCreacion: response.data.fechaCreacion ? new Date(response.data.fechaCreacion) : new Date(),
        };

        // Recargar lista de usuarios desde el backend
        const usuariosResponse = await usuariosAPI.getAll();
        if (usuariosResponse.success && usuariosResponse.data) {
          const usuariosFromBackend: User[] = usuariosResponse.data.map((u: any) => ({
            id: u.id.toString(),
            usuario: u.email.split('@')[0],
            nombre: u.nombre,
            email: u.email,
            password: '',
            rol: u.rol,
            estado: u.estado,
            fechaCreacion: u.fechaCreacion ? new Date(u.fechaCreacion) : new Date(),
            ultimoAcceso: u.ultimoAcceso ? new Date(u.ultimoAcceso) : undefined,
          }));
          setUsers(usuariosFromBackend);
        }

        // Mostrar credenciales al usuario
        toast.success('✅ Usuario Creado Exitosamente', {
          description: `Email: ${nuevoUsuario.email} | Contraseña: ${newUserData.password}`,
          duration: 10000,
        });
      } else {
        throw new Error(response.message || 'Error al crear usuario');
      }
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      toast.error('❌ Error al crear usuario', {
        description: error.message || 'No se pudo crear el usuario en la base de datos',
        duration: 5000,
      });
      throw error; // Re-lanzar para que UserManagement lo maneje
    }
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
      // Llamar al backend para actualizar el usuario
      const response = await usuariosAPI.update(updatedUser.id, {
        nombre: updatedUser.nombre,
        email: updatedUser.email,
        rol: updatedUser.rol,
        estado: updatedUser.estado,
      });

      if (response.success && response.data) {
        // Recargar lista de usuarios desde el backend
        const usuariosResponse = await usuariosAPI.getAll();
        if (usuariosResponse.success && usuariosResponse.data) {
          const usuariosFromBackend: User[] = usuariosResponse.data.map((u: any) => ({
            id: u.id.toString(),
            usuario: u.email.split('@')[0],
            nombre: u.nombre,
            email: u.email,
            password: '',
            rol: u.rol,
            estado: u.estado,
            fechaCreacion: u.fechaCreacion ? new Date(u.fechaCreacion) : new Date(),
            ultimoAcceso: u.ultimoAcceso ? new Date(u.ultimoAcceso) : undefined,
          }));
          setUsers(usuariosFromBackend);
        }
      } else {
        throw new Error(response.message || 'Error al actualizar usuario');
      }
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error);
      toast.error('❌ Error al actualizar usuario', {
        description: error.message || 'No se pudo actualizar el usuario',
        duration: 5000,
      });
      throw error;
    }
  };

  const handleUserDelete = async (userId: string) => {
    try {
      // Llamar al backend para eliminar el usuario
      const response = await usuariosAPI.delete(userId);

      if (response.success) {
        // Recargar lista de usuarios desde el backend
        const usuariosResponse = await usuariosAPI.getAll();
        if (usuariosResponse.success && usuariosResponse.data) {
          const usuariosFromBackend: User[] = usuariosResponse.data.map((u: any) => ({
            id: u.id.toString(),
            usuario: u.email.split('@')[0],
            nombre: u.nombre,
            email: u.email,
            password: '',
            rol: u.rol,
            estado: u.estado,
            fechaCreacion: u.fechaCreacion ? new Date(u.fechaCreacion) : new Date(),
            ultimoAcceso: u.ultimoAcceso ? new Date(u.ultimoAcceso) : undefined,
          }));
          setUsers(usuariosFromBackend);
        }
      } else {
        throw new Error(response.message || 'Error al eliminar usuario');
      }
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error);
      toast.error('❌ Error al eliminar usuario', {
        description: error.message || 'No se pudo eliminar el usuario',
        duration: 5000,
      });
      throw error;
    }
  };

  const handleSendMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  // Si no hay usuario logueado, mostrar formulario de login
  if (!user) {
    return (
      <LoginForm 
        onLogin={handleLogin} 
        users={users}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Fingerprint className="h-10 w-10 text-indigo-600" />
                <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-20"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Huella
                </h1>
                <p className="text-sm text-gray-600">
                  Control de Acceso Biométrico con QR
                </p>
              </div>
            </div>

            {/* Info del usuario y logout */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="h-4 w-4" />
                <div className="text-right">
                  <p className="font-medium">{user.nombre}</p>
                  <p className="text-gray-500">{user.rol}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal según el rol del usuario */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.rol === 'GUARDA' ? (
          <GuardView
            personas={personas}
            accessRecords={accessRecords}
            stats={stats}
            user={user}
            visitorQRs={visitorQRs}
            onAccessGranted={handleAccessGranted}
            onVisitorRegistered={handleVisitorRegistered}
            onGenerateVisitorQR={handleGenerateVisitorQR}
          />
        ) : (
          <AdminView
            personas={personas}
            accessRecords={accessRecords}
            stats={stats}
            user={user}
            visitorQRs={visitorQRs}
            users={users}
            onPersonUpdate={handlePersonUpdate}
            onPersonDelete={handlePersonDelete}
            onPersonAdd={handlePersonAdd}
            onBulkPersonAdd={handleBulkPersonAdd}
            onUserAdd={handleUserAdd}
            onUserUpdate={handleUserUpdate}
            onUserDelete={handleUserDelete}
            onVisitorRegistered={handleVisitorRegistered}
            onGenerateVisitorQR={handleGenerateVisitorQR}
          />
        )}
      </main>

      {/* Chat flotante */}
      <Chat 
        currentUser={user} 
        messages={chatMessages} 
        onSendMessage={handleSendMessage} 
      />
    </div>
  );
}