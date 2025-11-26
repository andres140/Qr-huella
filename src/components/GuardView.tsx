import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { QRGenerator } from './QRGenerator';
import { useZxing } from 'react-zxing';
import { 
  Scan, 
  Camera, 
  CheckCircle, 
  XCircle, 
  QrCode,
  Users,
  Clock,
  Calendar,
  GraduationCap,
  Shield,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Person, AccessRecord, AccessStats, VisitorQR, User } from '../types';
import { aprendicesAPI, visitantesAPI } from '../services/api';

interface GuardViewProps {
  personas: Person[];
  accessRecords: AccessRecord[];
  stats: AccessStats;
  user: User;
  visitorQRs: VisitorQR[];
  onAccessGranted: (record: AccessRecord) => void;
  onVisitorRegistered: (person: Person) => void;
  onGenerateVisitorQR: (visitor: VisitorQR) => void;
}

export function GuardView({ 
  personas, 
  accessRecords, 
  stats, 
  user,
  visitorQRs,
  onAccessGranted,
  onVisitorRegistered,
  onGenerateVisitorQR
}: GuardViewProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    person?: Person;
    codigoQR?: string;
  } | null>(null);
  // Scanner real activo por defecto para que no haya que presionar el botón de iniciar
  const [isRealScanning, setIsRealScanning] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // Formulario para registro de visitantes
  const [visitorForm, setVisitorForm] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    tipoDocumento: 'CC' as 'CC' | 'TI' | 'CE',
    tipoSangre: 'O+' as 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-',
    motivo: '',
    zona: '', // Zona o destino donde se dirige el visitante
    horasValidez: 24, // Tiempo de validez del QR en horas (establecido manualmente por el guardia)
    minutosValidez: 0 // Tiempo de validez del QR en minutos adicionales (establecido manualmente por el guardia)
  });

  // Estado para el QR generado más reciente
  const [lastGeneratedQR, setLastGeneratedQR] = useState<VisitorQR | null>(null);
  
  // Estado para registro rápido de personas no encontradas
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [scannedDocument, setScannedDocument] = useState('');
  const [quickRegisterForm, setQuickRegisterForm] = useState({
    nombre: '',
    apellido: '',
    tipoDocumento: 'CC' as 'CC' | 'TI' | 'CE',
    rol: 'ESTUDIANTE' as 'ESTUDIANTE' | 'INSTRUCTOR' | 'ADMINISTRATIVO',
    tipoSangre: 'O+' as 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-',
    programa: '',
    ficha: ''
  });

  // Alertar cuando un visitante esté próximo a vencer (2 minutos antes)
  const warnedVisitorsRef = useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const checkNearExpiration = () => {
      const now = new Date();
      const thresholdMs = 2 * 60 * 1000; // 2 minutos antes de vencer
      const maxThresholdMs = 2 * 60 * 1000 + 30 * 1000; // 2 minutos y 30 segundos (ventana de alerta)

      visitorQRs.forEach((qr) => {
        if (qr.estado !== 'ACTIVO') return;
        
        const exp = qr.fechaExpiracion;
        const timeLeft = exp.getTime() - now.getTime();

        // Verificar si está entre 2 minutos y 2 minutos 30 segundos antes de vencer
        // Esto evita múltiples alertas para el mismo QR
        if (
          timeLeft > 0 &&
          timeLeft <= thresholdMs &&
          timeLeft > (thresholdMs - 30 * 1000) &&
          !warnedVisitorsRef.current.has(qr.id)
        ) {
          warnedVisitorsRef.current.add(qr.id);
          const minutosRestantes = Math.floor(timeLeft / 60000);
          const segundosRestantes = Math.floor((timeLeft % 60000) / 1000);
          toast.warning('⏰ QR de Visitante Próximo a Vencer', {
            description: `${qr.visitante.nombre} (${qr.visitante.documento}) - Vence en ${minutosRestantes} min ${segundosRestantes} seg (${exp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})`,
            duration: 10000,
          });
        }
      });
    };

    // Verificar cada 10 segundos para detectar cuando falta exactamente 2 minutos
    checkNearExpiration();
    const interval = setInterval(checkNearExpiration, 10000);
    return () => clearInterval(interval);
  }, [visitorQRs]);

  // ============================
  // Filtros avanzados historial
  // ============================

  const [historyDesde, setHistoryDesde] = useState<string>('');
  const [historyHasta, setHistoryHasta] = useState<string>('');
  const [historyRol, setHistoryRol] = useState<string>('TODOS');

  const parseDate = (value: Date | string | null | undefined): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const filteredAccessRecords = React.useMemo(() => {
    return accessRecords.filter((record) => {
      const baseDate =
        parseDate(record.fechaHora) ||
        parseDate(record.timestamp) ||
        parseDate((record as any).fecha_entrada) ||
        parseDate((record as any).fecha_salida);

      if (!baseDate) return false;

      let ok = true;

      if (historyDesde) {
        const desde = new Date(`${historyDesde}T00:00:00`);
        if (!isNaN(desde.getTime())) {
          ok = ok && baseDate >= desde;
        }
      }

      if (historyHasta) {
        const hasta = new Date(`${historyHasta}T23:59:59`);
        if (!isNaN(hasta.getTime())) {
          ok = ok && baseDate <= hasta;
        }
      }

      if (historyRol !== 'TODOS') {
        ok = ok && record.persona.rol === historyRol;
      }

      return ok;
    });
  }, [accessRecords, historyDesde, historyHasta, historyRol]);

  // Hook de react-zxing para escaneo QR - Optimizado
  const { ref: videoRef } = useZxing({
    onDecodeResult(result) {
      const code = result.getText();
      console.log('✅ QR escaneado:', code);
      
      // Evitar procesar el mismo código múltiples veces
      if (code === lastScannedCode || isProcessingScan) {
        console.log('⚠️ Código ya procesado o en proceso, ignorando...');
        return;
      }
      
      setLastScannedCode(code);
      setIsProcessingScan(true);
      
      // No detener el scanner inmediatamente, solo pausarlo temporalmente
      setIsRealScanning(false);
      
      // Procesar el código QR escaneado (async)
      processQRCode(code)
        .then(() => {
          // Esperar un momento antes de permitir otro escaneo
          setTimeout(() => {
            setIsProcessingScan(false);
            setLastScannedCode('');
            setIsRealScanning(true); // Reanudar el scanner
          }, 2000);
        })
        .catch(err => {
          console.error('Error procesando QR:', err);
          toast.error('Error procesando código QR');
          setIsProcessingScan(false);
          setLastScannedCode('');
          setIsRealScanning(true); // Reanudar el scanner incluso si hay error
        });
    },
    onError(error) {
      console.error('Error en el scanner:', error);
      // No detener el scanner por errores menores
    },
    paused: !isRealScanning || isProcessingScan,
    constraints: {
      video: {
        facingMode: 'environment', // Usar cámara trasera
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    timeBetweenDecodingAttempts: 100, // Reducir tiempo entre intentos para escaneo más rápido
  });

  // Mover processQRCode antes del useEffect que lo usa
  const processQRCode = useCallback(async (code: string) => {
    // Primero verificar si es un QR de visitante temporal
    const visitorQR = visitorQRs.find(qr => qr.codigoQR === code);
    
    if (visitorQR) {
      // Validar fecha de expiración
      const ahora = new Date();
      if (visitorQR.fechaExpiracion < ahora) {
        setScanResult({
          success: false,
          message: 'QR Expirado: El código ha vencido',
          person: visitorQR.visitante
        });
        toast.error('❌ QR Expirado', {
          description: 'El código QR del visitante ha vencido',
          duration: 5000,
        });
        return;
      }

      if (visitorQR.estado === 'EXPIRADO' || visitorQR.estado === 'USADO') {
        setScanResult({
          success: false,
          message: `QR Inválido: Estado ${visitorQR.estado}`,
          person: visitorQR.visitante
        });
        toast.error('❌ QR Inválido', {
          description: `Estado del QR: ${visitorQR.estado}`,
          duration: 5000,
        });
        return;
      }

      // Es un visitante con QR válido
      // El backend determinará automáticamente si es ENTRADA o SALIDA
      const accessRecord: AccessRecord = {
        id: Date.now().toString(),
        personaId: visitorQR.visitante.id,
        persona: visitorQR.visitante,
        tipo: 'AUTO', // El backend determinará automáticamente si es ENTRADA o SALIDA
        timestamp: new Date(),
        fechaHora: new Date(),
        ubicacion: 'Entrada Principal',
        codigoQR: code
      };

      setScanResult({
        success: true,
        message: 'Acceso permitido - Visitante',
        person: visitorQR.visitante
      });

      onAccessGranted(accessRecord);
      toast.success('✅ Acceso Permitido - Visitante', {
        description: `${visitorQR.visitante.nombre} - QR válido`,
        duration: 5000,
      });
      return;
    }

    // BUSCAR PRIMERO EN EL BACKEND (Base de datos)
    let persona: Person | null = null;
    let codigoQRFinal = code;
    
    try {
      // Si el código empieza con APR-, buscar por QR directamente
      if (code.startsWith('APR-')) {
        console.log('🔍 Buscando aprendiz por QR en backend:', code);
        const qrResponse = await aprendicesAPI.getByQR(code);
        if (qrResponse.success && qrResponse.data) {
          const aprendizBD = qrResponse.data;
          persona = {
            id: aprendizBD.id,
            nombre: aprendizBD.nombre,
            apellido: aprendizBD.apellido || '',
            documento: aprendizBD.documento,
            tipoDocumento: aprendizBD.tipo_documento,
            programa: aprendizBD.programa || '',
            ficha: aprendizBD.ficha || '',
            rol: 'ESTUDIANTE',
            estado: aprendizBD.estado,
            tipoSangre: 'O+',
            foto: null,
          };
          codigoQRFinal = aprendizBD.codigo_qr;
          console.log('✅ Aprendiz encontrado en BD por QR:', persona.nombre);
        } else {
          // Si el QR no se encontró, intentar extraer documento y crear automáticamente
          console.log('⚠️ QR no encontrado en BD. Intentando crear aprendiz automáticamente...');
          // Intentar extraer documento del código (puede estar en formato: APR-timestamp-documento)
          const partesQR = code.split('-');
          if (partesQR.length >= 3) {
            const posibleDocumento = partesQR[partesQR.length - 1];
            if (posibleDocumento.match(/^\d{8,15}$/)) {
              try {
                const tipoDocumento = posibleDocumento.length === 10 ? 'CC' : 'TI';
                // Intentar buscar si hay información adicional en el código antes del formato APR-
                // Si el código original tiene más información, intentar extraerla
                let nombreExtraido = 'Aprendiz';
                let apellidoExtraido = '';
                
                // Si el código completo tiene más información, intentar extraerla
                if (code.length > 20) {
                  const textoAntes = code.substring(0, code.indexOf('APR-')).trim();
                  if (textoAntes.length > 3) {
                    const palabras = textoAntes.split(/\s+/).filter(p => p.length > 0);
                    if (palabras.length >= 1) {
                      nombreExtraido = palabras[0] + (palabras[1] ? ' ' + palabras[1] : '');
                      apellidoExtraido = palabras.slice(2).join(' ') || palabras.slice(1).join(' ') || '';
                    }
                  }
                }
                
                const createResponse = await aprendicesAPI.create({
                  nombre: nombreExtraido.substring(0, 100),
                  apellido: apellidoExtraido.substring(0, 100),
                  documento: posibleDocumento,
                  tipoDocumento: tipoDocumento,
                  estado: 'ACTIVO',
                });
                
                if (createResponse.success && createResponse.data) {
                  const aprendizBD = createResponse.data;
                  persona = {
                    id: aprendizBD.id,
                    nombre: aprendizBD.nombre,
                    apellido: aprendizBD.apellido || '',
                    documento: aprendizBD.documento,
                    tipoDocumento: aprendizBD.tipoDocumento || tipoDocumento,
                    programa: aprendizBD.programa || '',
                    ficha: aprendizBD.ficha || '',
                    rol: 'ESTUDIANTE',
                    estado: aprendizBD.estado,
                    tipoSangre: 'O+',
                    foto: null,
                  };
                  codigoQRFinal = aprendizBD.codigoQR || aprendizBD.codigo_qr;
                  console.log('✅ Aprendiz creado automáticamente desde QR. QR nuevo:', codigoQRFinal);
                  toast.success('✅ Aprendiz creado automáticamente', {
                    description: `Persona creada en BD. Continuando con registro de entrada/salida...`,
                    duration: 4000,
                  });
                }
              } catch (error: any) {
                console.error('❌ Error al crear aprendiz desde QR:', error);
              }
            }
          }
        }
      } else {
        
        // El código puede ser:
        // 1. Solo el documento (ej: "1114541908")
        // 2. Texto completo del QR (ej: "JULIAN ANDRES SAAVEDRA LOZANO 1114541908 APRENDIZ RH=O+")
        // Intentar extraer el documento del texto
        
        let documentoBuscado = code;
        
        // Si el código contiene texto largo, intentar extraer el documento
        // Buscar secuencias de números de 8-15 dígitos que podrían ser el documento
        const numeroDocumentoMatch = code.match(/\b\d{8,15}\b/);
        if (numeroDocumentoMatch && code.length > 20) {
          documentoBuscado = numeroDocumentoMatch[0];
          console.log('📝 Código escaneado contiene texto completo. Extrayendo documento:', documentoBuscado);
        }
        
        console.log('🔍 Buscando aprendiz por documento en backend:', documentoBuscado);
        const docResponse = await aprendicesAPI.getByDocumento(documentoBuscado);
        if (docResponse.success && docResponse.data) {
          const aprendizBD = docResponse.data;
          persona = {
            id: aprendizBD.id,
            nombre: aprendizBD.nombre,
            apellido: aprendizBD.apellido || '',
            documento: aprendizBD.documento,
            tipoDocumento: aprendizBD.tipoDocumento || aprendizBD.tipo_documento,
            programa: aprendizBD.programa || '',
            ficha: aprendizBD.ficha || '',
            rol: 'ESTUDIANTE',
            estado: aprendizBD.estado,
            tipoSangre: 'O+',
            foto: null,
          };
          // El backend devuelve codigoQR (con Q mayúscula)
          codigoQRFinal = aprendizBD.codigoQR || aprendizBD.codigo_qr;
          console.log('✅ Aprendiz encontrado en BD por documento:', persona.nombre, 'QR:', codigoQRFinal);
        } else {
          // Si NO se encontró en BD, SIEMPRE intentar crear automáticamente desde el QR escaneado
          console.log('⚠️ No se encontró aprendiz con documento:', documentoBuscado);
          console.log('💡 Creando aprendiz automáticamente desde QR escaneado...');
          
          let datosExtraidos: { nombre: string; apellido: string; documento: string; tipoDocumento: string } | null = null;
          
          // Intentar extraer datos del QR - múltiples formatos posibles
          // Formato 1: "NOMBRE APELLIDOS DOCUMENTO APRENDIZ RH=TIPO"
          // Formato 2: "NOMBRE APELLIDOS DOCUMENTO"
          // Formato 3: Solo documento
          
          // Buscar el documento en el código (número de 8-15 dígitos)
          const documentoMatch = code.match(/\b(\d{8,15})\b/);
          const documentoEncontrado = documentoMatch ? documentoMatch[1] : null;
          
          if (documentoEncontrado) {
            const tipoDocumento = documentoEncontrado.length === 10 ? 'CC' : 'TI';
            
            // Si el código tiene más de 20 caracteres, probablemente contiene nombres
            if (code.length > 20) {
              try {
                // Intentar extraer nombres y apellidos
                // El documento está en alguna posición, buscar texto antes del documento
                const indiceDocumento = code.indexOf(documentoEncontrado);
                if (indiceDocumento > 0) {
                  const textoAntes = code.substring(0, indiceDocumento).trim();
                  
                  // Si hay texto antes del documento, intentar extraer nombres
                  if (textoAntes.length > 3) {
                    // Limpiar el texto (remover palabras como APRENDIZ, ESTUDIANTE, RH, etc.)
                    const palabrasLimpias = textoAntes
                      .replace(/APRENDIZ|ESTUDIANTE|RH[=:]\w+/gi, '')
                      .trim()
                      .split(/\s+/)
                      .filter(p => p.length > 0);
                    
                    if (palabrasLimpias.length >= 1) {
                      // Asumir que el primer nombre es el nombre, el resto son apellidos
                      const nombre = palabrasLimpias[0] + (palabrasLimpias[1] ? ' ' + palabrasLimpias[1] : '');
                      const apellidos = palabrasLimpias.slice(2).join(' ') || palabrasLimpias.slice(1).join(' ') || '';
                      
                      datosExtraidos = {
                nombre: nombre.substring(0, 100),
                apellido: apellidos.substring(0, 100),
                        documento: documentoEncontrado,
                tipoDocumento: tipoDocumento,
                      };
                      console.log('📝 Datos extraídos del QR (con nombres):', datosExtraidos);
                    }
                  }
                }
              } catch (error) {
                console.error('❌ Error al extraer datos del QR:', error);
              }
            }
            
            // Si no se pudieron extraer nombres, usar solo el documento
            if (!datosExtraidos) {
              datosExtraidos = {
                nombre: 'Aprendiz',
                apellido: '',
                documento: documentoEncontrado,
                tipoDocumento: tipoDocumento,
              };
              console.log('📝 Usando datos mínimos (solo documento):', datosExtraidos);
            }
          }
          
          // Si tenemos datos válidos, crear el aprendiz automáticamente
          if (datosExtraidos) {
            try {
              const createResponse = await aprendicesAPI.create({
                nombre: datosExtraidos.nombre,
                apellido: datosExtraidos.apellido,
                documento: datosExtraidos.documento,
                tipoDocumento: datosExtraidos.tipoDocumento,
                estado: 'ACTIVO',
              });
              
              if (createResponse.success && createResponse.data) {
                const aprendizBD = createResponse.data;
                persona = {
                  id: aprendizBD.id,
                  nombre: aprendizBD.nombre,
                  apellido: aprendizBD.apellido || '',
                  documento: aprendizBD.documento,
                  tipoDocumento: aprendizBD.tipoDocumento || datosExtraidos.tipoDocumento,
                  programa: aprendizBD.programa || '',
                  ficha: aprendizBD.ficha || '',
                  rol: 'ESTUDIANTE',
                  estado: aprendizBD.estado,
                  tipoSangre: 'O+',
                  foto: null,
                };
                codigoQRFinal = aprendizBD.codigoQR || aprendizBD.codigo_qr;
                console.log('✅ Aprendiz creado automáticamente en BD. QR:', codigoQRFinal);
                toast.success('✅ Aprendiz creado automáticamente', {
                  description: `Persona creada en BD. Continuando con registro de entrada/salida...`,
                  duration: 4000,
                });
                // Continuar con el flujo normal para registrar entrada/salida
              }
            } catch (error: any) {
              console.error('❌ Error al crear aprendiz automáticamente:', error);
              // Si ya existe, intentar buscarlo de nuevo
              if (error.message?.includes('ya está registrado') || error.message?.includes('ya existe')) {
                try {
                  const docResponseRetry = await aprendicesAPI.getByDocumento(datosExtraidos.documento);
                  if (docResponseRetry.success && docResponseRetry.data) {
                    const aprendizBD = docResponseRetry.data;
                    persona = {
                      id: aprendizBD.id,
                      nombre: aprendizBD.nombre,
                      apellido: aprendizBD.apellido || '',
                      documento: aprendizBD.documento,
                      tipoDocumento: aprendizBD.tipoDocumento || aprendizBD.tipo_documento,
                      programa: aprendizBD.programa || '',
                      ficha: aprendizBD.ficha || '',
                      rol: 'ESTUDIANTE',
                      estado: aprendizBD.estado,
                      tipoSangre: 'O+',
                      foto: null,
                    };
                    codigoQRFinal = aprendizBD.codigoQR || aprendizBD.codigo_qr;
                    console.log('✅ Aprendiz encontrado después del error (ya existía):', codigoQRFinal);
                  }
                } catch (retryError) {
                  console.error('❌ Error al buscar aprendiz después del error:', retryError);
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error buscando en backend:', error.message);
      console.error('Stack:', error.stack);
    }
    
    // Si no se encontró en el backend, buscar en el array local
    if (!persona) {
      persona = personas.find(p => {
        // Buscar por documento exacto o intentar extraer documento del texto
        const docMatch = code.match(/\b\d{8,15}\b/);
        const docExtract = docMatch ? docMatch[0] : code;
        return p.documento === code || p.documento === docExtract;
      }) || null;
      
      if (persona && persona.rol === 'ESTUDIANTE') {
        console.log('⚠️ Aprendiz encontrado solo en array local (no en BD):', persona.nombre);
        console.log('💡 Intentando registrar en BD automáticamente...');
        
        // Intentar registrar automáticamente en la BD para obtener código QR
        try {
          // Limpiar y validar el documento - solo números, máximo 20 caracteres
          let documentoLimpio = persona.documento.trim();
          
          // Extraer solo números del documento (por si contiene espacios u otros caracteres)
          const soloNumeros = documentoLimpio.replace(/\D/g, '');
          if (soloNumeros.length > 0) {
            documentoLimpio = soloNumeros;
          }
          
          // Limitar a 20 caracteres para evitar errores de BD
          if (documentoLimpio.length > 20) {
            documentoLimpio = documentoLimpio.substring(0, 20);
            console.log('⚠️ Documento truncado a 20 caracteres:', documentoLimpio);
          }
          
          if (!documentoLimpio || documentoLimpio.length < 5) {
            throw new Error('Documento inválido o muy corto');
          }
          
          // Determinar tipoDocumento con valor por defecto
          const tipoDocumentoFinal = persona.tipoDocumento || (documentoLimpio.length === 10 ? 'CC' : 'TI');
          
          console.log('📝 Creando aprendiz en BD:', {
            nombre: persona.nombre,
            documento: documentoLimpio,
            tipoDocumento: tipoDocumentoFinal
          });
          
          const createResponse = await aprendicesAPI.create({
            nombre: persona.nombre.trim().substring(0, 100), // Limitar nombre también
            apellido: (persona.apellido || '').trim().substring(0, 100),
            documento: documentoLimpio,
            tipoDocumento: tipoDocumentoFinal, // Usar el tipoDocumento con valor por defecto
            programa: (persona.programa || '').trim().substring(0, 200),
            ficha: (persona.ficha || '').trim().substring(0, 50),
            estado: persona.estado || 'ACTIVO',
          });
          
          if (createResponse.success && createResponse.data) {
            const aprendizBD = createResponse.data;
            // Actualizar persona con datos de BD
            persona = {
              ...persona,
              id: aprendizBD.id,
            };
            codigoQRFinal = aprendizBD.codigoQR || aprendizBD.codigo_qr;
            console.log('✅ Aprendiz registrado en BD automáticamente. QR:', codigoQRFinal);
            toast.success('✅ Aprendiz creado en BD', {
              description: `Persona creada. Código QR: ${codigoQRFinal}. Debes registrar entrada/salida manualmente.`,
              duration: 6000,
            });
            // NO continuar con el registro automático - solo crear la persona
            setScanResult({
              success: true,
              message: `Aprendiz creado en BD. Código QR: ${codigoQRFinal}. Registra entrada/salida manualmente.`,
              person: persona
            });
            return; // Salir aquí sin registrar entrada/salida
          } else {
            console.error('❌ Error al registrar aprendiz en BD:', createResponse);
            toast.error('❌ Error al registrar en BD', {
              description: 'No se pudo registrar el aprendiz automáticamente. Regístrelo manualmente.',
              duration: 6000,
            });
            // Si no se pudo crear, no continuar con el flujo
            setScanResult({
              success: false,
              message: 'No se pudo crear el aprendiz en BD. Regístrelo manualmente.',
              person: persona
            });
            return;
          }
        } catch (error: any) {
          console.error('❌ Error al registrar aprendiz en BD:', error);
          toast.error('❌ Error al registrar en BD', {
            description: error.message || 'Error desconocido',
            duration: 6000,
          });
          // Si ya existe en BD pero con otro documento, buscar nuevamente
          if (error.message?.includes('ya está registrado')) {
            try {
              const docResponse = await aprendicesAPI.getByDocumento(persona.documento);
              if (docResponse.success && docResponse.data) {
                const aprendizBD = docResponse.data;
                persona = {
                  ...persona,
                  id: aprendizBD.id,
                };
                codigoQRFinal = aprendizBD.codigoQR || aprendizBD.codigo_qr;
                console.log('✅ Aprendiz encontrado después de error de duplicado. QR:', codigoQRFinal);
              }
            } catch (err) {
              // Ignorar error de búsqueda
            }
          }
        }
      } else if (persona) {
        // No es estudiante (puede ser visitante u otro rol)
        console.log('ℹ️ Persona encontrada localmente pero no es estudiante:', persona.rol);
      }
    }
    
    // Si después de todos los intentos no se encontró ni se creó la persona, intentar una última vez
    if (!persona) {
      // Intentar una última vez extraer documento del código para crear automáticamente
      const ultimoIntento = code.match(/\b(\d{8,15})\b/);
      if (ultimoIntento) {
        const documentoFinal = ultimoIntento[1];
        try {
          const tipoDocumento = documentoFinal.length === 10 ? 'CC' : 'TI';
          
          // Intentar extraer nombres si el código tiene más información
          let nombreFinal = 'Aprendiz';
          let apellidoFinal = '';
          
          if (code.length > documentoFinal.length + 5) {
            const indiceDoc = code.indexOf(documentoFinal);
            if (indiceDoc > 0) {
              const textoAntes = code.substring(0, indiceDoc).trim();
              if (textoAntes.length > 3) {
                const palabras = textoAntes
                  .replace(/APRENDIZ|ESTUDIANTE|RH[=:]\w+/gi, '')
                  .trim()
                  .split(/\s+/)
                  .filter(p => p.length > 0);
                
                if (palabras.length >= 1) {
                  nombreFinal = palabras[0] + (palabras[1] ? ' ' + palabras[1] : '');
                  apellidoFinal = palabras.slice(2).join(' ') || palabras.slice(1).join(' ') || '';
                }
              }
            }
          }
          
          const createResponse = await aprendicesAPI.create({
            nombre: nombreFinal.substring(0, 100),
            apellido: apellidoFinal.substring(0, 100),
            documento: documentoFinal,
            tipoDocumento: tipoDocumento,
            estado: 'ACTIVO',
          });
          
          if (createResponse.success && createResponse.data) {
            const aprendizBD = createResponse.data;
            persona = {
              id: aprendizBD.id,
              nombre: aprendizBD.nombre,
              apellido: aprendizBD.apellido || '',
              documento: aprendizBD.documento,
              tipoDocumento: aprendizBD.tipoDocumento || tipoDocumento,
              programa: aprendizBD.programa || '',
              ficha: aprendizBD.ficha || '',
              rol: 'ESTUDIANTE',
              estado: aprendizBD.estado,
              tipoSangre: 'O+',
              foto: null,
            };
            codigoQRFinal = aprendizBD.codigoQR || aprendizBD.codigo_qr;
            console.log('✅ Aprendiz creado automáticamente en último intento. QR:', codigoQRFinal);
            toast.success('✅ Aprendiz creado automáticamente', {
              description: `Persona creada en BD. Continuando con registro de entrada/salida...`,
              duration: 4000,
            });
          }
        } catch (error: any) {
          console.error('❌ Error en último intento de creación:', error);
        }
      }
      
      // Si después de todos los intentos no se pudo crear, mostrar formulario de registro manual
      if (!persona) {
      setScannedDocument(code);
      setShowQuickRegister(true);
      setScanResult({
        success: false,
          message: '⚠️ No se pudo procesar automáticamente - Complete el formulario para registrar'
      });
        toast.warning('⚠️ Registro Manual Requerido', {
          description: `No se pudo crear automáticamente. Complete los datos para registrar.`,
        duration: 6000,
      });
      return;
      }
    }

    // Estados que permiten el acceso
    const estadosPermitidos = ['ACTIVO', 'EN FORMACION', 'POR CERTIFICAR', 'CERTIFICADO'];
    
    if (!estadosPermitidos.includes(persona.estado)) {
      const mensajesEstado: Record<string, string> = {
        'APLAZADO': 'Aprendiz aplazado - No puede ingresar',
        'CANCELADO': 'Matrícula cancelada - No puede ingresar',
        'SUSPENDIDO': 'Aprendiz suspendido - No puede ingresar',
        'RETIRO VOLUNTARIO': 'Retiro voluntario - No puede ingresar',
        'INACTIVO': 'Usuario inactivo - No puede ingresar'
      };
      
      const mensajeDetalle = mensajesEstado[persona.estado] || 'Estado no válido para ingreso';
      
      setScanResult({
        success: false,
        message: `Acceso denegado: ${mensajeDetalle}`,
        person: persona
      });
      toast.error('❌ Acceso Denegado', {
        description: `${persona.nombre} - ${mensajeDetalle}`,
        duration: 5000,
      });
      return;
    }

    // VALIDAR que tenemos un código QR válido antes de continuar
    if (!codigoQRFinal || !codigoQRFinal.startsWith('APR-')) {
      console.error('❌ No se pudo obtener código QR válido para el aprendiz');
      setScanResult({
        success: false,
        message: '⚠️ Error: No se pudo obtener el código QR válido del aprendiz',
        person: persona
      });
      toast.error('❌ Error de Código QR', {
        description: 'El aprendiz debe tener un código QR válido en la base de datos',
        duration: 6000,
      });
      return;
    }

    // Si está en BD, registrar automáticamente (ENTRADA/SALIDA alternando)
    // El backend determinará automáticamente si es ENTRADA o SALIDA
    const accessRecord: AccessRecord = {
      id: Date.now().toString(),
      personaId: persona.id,
      persona,
      tipo: 'AUTO', // El backend determinará automáticamente si es ENTRADA o SALIDA
      timestamp: new Date(),
      fechaHora: new Date(),
      ubicacion: 'Entrada Principal',
      codigoQR: codigoQRFinal
    };
    
    setScanResult({
      success: true,
      message: `✅ Persona encontrada en BD. Registrando entrada/salida automáticamente...`,
      person: persona,
      codigoQR: codigoQRFinal
    });
    
    // Registrar automáticamente en BD
    onAccessGranted(accessRecord);
    
    console.log('✅ Persona encontrada en BD. Registrando automáticamente...');
  }, [personas, visitorQRs, accessRecords, onAccessGranted]);

  const startRealScan = async () => {
    try {
      setIsScanning(false); // Desactivar simulación
      setIsRealScanning(true);
      setScanResult(null);
      setLastScannedCode('');
      setIsProcessingScan(false);
      
      // Solicitar permisos de cámara explícitamente
      await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } 
      });
      
      console.log('✅ Cámara iniciada correctamente');
    } catch (error: any) {
      console.error('Error al iniciar cámara:', error);
      setIsRealScanning(false);
      toast.error(`Error al acceder a la cámara: ${error.message || 'Permisos denegados'}`);
    }
  };

  const stopScan = () => {
    setIsRealScanning(false);
    setIsScanning(false);
    setIsProcessingScan(false);
    setLastScannedCode('');
    
    // Detener todos los streams de video
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return '--:--:--';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        // Si es una fecha DATE sin hora, mostrar solo la fecha
        return typeof date === 'string' ? date : '--:--:--';
      }
      return new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(dateObj);
    } catch (error) {
      return '--:--:--';
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '--/--/----';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        // Si es una fecha DATE sin hora, formatear como string
        if (typeof date === 'string') {
          const [year, month, day] = date.split('-');
          return `${day}/${month}/${year}`;
        }
        return '--/--/----';
      }
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
      return '--/--/----';
    }
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return 'Fecha no disponible';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'ESTUDIANTE':
        return <GraduationCap className="h-4 w-4" />;
      case 'INSTRUCTOR':
        return <Users className="h-4 w-4" />;
      case 'ADMINISTRATIVO':
        return <Shield className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  // Simular escáneo QR
  const simulateQRScan = () => {
    setIsScanning(true);
    setScanResult(null);
    
    setTimeout(() => {
      const randomPerson = personas[Math.floor(Math.random() * personas.length)];
      processQRCode(randomPerson.documento);
      setIsScanning(false);
    }, 2000);
  };

  const handleManualEntry = () => {
    if (!manualCode.trim()) {
      toast.error('⚠️ Campo Vacío', {
        description: 'Por favor ingrese un número de documento',
        duration: 3000,
      });
      return;
    }
    processQRCode(manualCode.trim());
    setManualCode('');
  };

  const handleVisitorRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('📝 Registrando visitante en backend...', visitorForm);
      
      // 1. Registrar visitante en el backend (tabla personas con rol VISITANTE)
      // El QR se genera automáticamente con el tiempo de validez especificado
      const horasValidez = visitorForm.horasValidez || 0;
      const minutosValidez = visitorForm.minutosValidez || 0;
      
      // Validar que al menos haya horas o minutos
      if (horasValidez === 0 && minutosValidez === 0) {
        toast.error('⚠️ Tiempo de validez requerido', {
          description: 'Debe especificar al menos horas o minutos de validez',
          duration: 3000,
        });
        return;
      }
      
      const visitanteResponse = await visitantesAPI.create({
        nombre: visitorForm.nombre,
        apellido: visitorForm.apellido || '',
        documento: visitorForm.documento,
        tipoDocumento: visitorForm.tipoDocumento,
        tipoSangre: visitorForm.tipoSangre,
        motivo: visitorForm.motivo,
        zona: visitorForm.zona, // Enviar zona/destino al backend
        horasValidez: horasValidez, // Enviar horas de validez al backend
        minutosValidez: minutosValidez // Enviar minutos de validez al backend
      });
      
      console.log('✅ Visitante registrado en BD:', visitanteResponse.data);
      
      const visitanteBD = visitanteResponse.data;
      
      // 2. El QR ya está generado y guardado en la tabla personas
      // Usar los datos del visitante que incluyen el QR
      const qrData = visitanteBD;
      
      // Convertir fechaExpiracion a Date si viene como string
      let fechaExpiracionDate: Date;
      if (qrData.fechaExpiracion) {
        fechaExpiracionDate = new Date(qrData.fechaExpiracion);
        // Validar que la fecha sea válida
        if (isNaN(fechaExpiracionDate.getTime())) {
          console.warn('⚠️ Fecha de expiración inválida, usando fecha por defecto');
          fechaExpiracionDate = new Date();
          fechaExpiracionDate.setHours(fechaExpiracionDate.getHours() + 24);
        }
      } else {
        // Si no hay fecha de expiración, usar 24 horas por defecto
        fechaExpiracionDate = new Date();
        fechaExpiracionDate.setHours(fechaExpiracionDate.getHours() + 24);
      }
      
      // 3. Crear objeto VisitorQR para mostrar
      const visitorQR: VisitorQR = {
        id: visitanteBD.id,
        visitanteId: visitanteBD.id,
        visitante: {
          id: visitanteBD.id,
          nombre: visitanteBD.nombre,
          apellido: visitanteBD.apellido || '',
          documento: visitanteBD.documento,
          tipoDocumento: visitanteBD.tipo_documento,
          rol: 'VISITANTE',
          estado: visitanteBD.estado,
          tipoSangre: visitorForm.tipoSangre || 'O+'
        },
        codigoQR: qrData.codigoQR,
        fechaGeneracion: new Date(),
        fechaExpiracion: fechaExpiracionDate,
        estado: 'ACTIVO',
        generadoPor: user.id,
        nombre: visitanteBD.nombre,
        apellido: visitanteBD.apellido,
        documento: visitanteBD.documento
      };
      
      // 4. Guardar el QR generado para mostrarlo
      setLastGeneratedQR(visitorQR);
      
      // 5. Notificar al componente padre
      onGenerateVisitorQR(visitorQR);
      
      // 6. La ENTRADA automática ya se registró en el backend al crear el visitante
      // No es necesario registrar acceso aquí, ya que el backend lo hizo automáticamente
      // Solo notificamos al componente padre para actualizar la UI
      
      // 7. Limpiar formulario
      setVisitorForm({
        nombre: '',
        apellido: '',
        documento: '',
        tipoDocumento: 'CC',
        tipoSangre: 'O+',
        motivo: '',
        zona: '',
        horasValidez: 24,
        minutosValidez: 0
      });
      
      // 8. Mostrar resultado
      setScanResult({
        success: true,
        message: `Visitante registrado en BD. QR generado válido hasta ${formatDateTime(visitorQR.fechaExpiracion)}`,
        person: visitorQR.visitante
      });
      
      // 9. Mostrar notificación toast con información del QR
      const tiempoValidezTexto = horasValidez > 0 && minutosValidez > 0 
        ? `${horasValidez} hora${horasValidez > 1 ? 's' : ''} y ${minutosValidez} minuto${minutosValidez > 1 ? 's' : ''}`
        : horasValidez > 0 
        ? `${horasValidez} hora${horasValidez > 1 ? 's' : ''}`
        : `${minutosValidez} minuto${minutosValidez > 1 ? 's' : ''}`;
      
      toast.success('✅ Visitante Registrado en Base de Datos', {
        description: `${visitanteBD.nombre} - QR válido por ${tiempoValidezTexto}`,
        duration: 8000,
      });
      
      console.log('🎉 Proceso completado. Código QR:', qrData.codigoQR);
      
    } catch (error: any) {
      console.error('❌ Error al registrar visitante:', error);
      toast.error('❌ Error al registrar visitante', {
        description: error.message || 'No se pudo conectar con el servidor',
        duration: 5000,
      });
    }
  };

  // Manejar registro rápido de persona no encontrada
  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Crear nueva persona
    const newPerson: Person = {
      id: Date.now().toString(),
      nombre: quickRegisterForm.nombre,
      apellido: quickRegisterForm.apellido,
      documento: scannedDocument,
      tipoDocumento: quickRegisterForm.tipoDocumento,
      rol: quickRegisterForm.rol,
      estado: quickRegisterForm.rol === 'ESTUDIANTE' ? 'EN FORMACION' : 'ACTIVO',
      tipoSangre: quickRegisterForm.tipoSangre,
      programa: quickRegisterForm.programa,
      ficha: quickRegisterForm.ficha
    };
    
    // Registrar la persona
    onVisitorRegistered(newPerson);
    
    // Registrar acceso automáticamente
    const now = new Date();
    const accessRecord: AccessRecord = {
      id: Date.now().toString(),
      personaId: newPerson.id,
      persona: newPerson,
      tipo: 'ENTRADA',
      timestamp: now,
      fechaHora: now,
      ubicacion: 'Entrada Principal',
      codigoQR: scannedDocument
    };
    
    onAccessGranted(accessRecord);
    
    // Limpiar y cerrar formulario
    setQuickRegisterForm({
      nombre: '',
      apellido: '',
      tipoDocumento: 'CC',
      rol: 'ESTUDIANTE',
      tipoSangre: 'O+',
      programa: '',
      ficha: ''
    });
    setShowQuickRegister(false);
    setScannedDocument('');
    
    setScanResult({
      success: true,
      message: `${newPerson.rol === 'ESTUDIANTE' ? 'Aprendiz' : newPerson.rol} registrado y acceso concedido`,
      person: newPerson
    });
    
    toast.success('✅ Persona Registrada', {
      description: `${newPerson.nombre} ${newPerson.apellido} - ${newPerson.rol === 'ESTUDIANTE' ? 'APRENDIZ' : newPerson.rol}`,
      duration: 5000,
    });
  };

  // Ordenar visitantes: más recientes primero
  const sortedVisitorRecords = accessRecords
    .filter(r => r.persona.rol === 'VISITANTE')
    .sort((a, b) => {
      const dateA = a.timestamp || a.fechaHora || new Date(0);
      const dateB = b.timestamp || b.fechaHora || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="scanner" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Escáner
          </TabsTrigger>
          <TabsTrigger value="visitor" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Visitantes
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* Escáner QR */}
        <TabsContent value="scanner" className="space-y-6">
          {/* Formulario de Registro Rápido */}
          {showQuickRegister && (
            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertCircle className="h-6 w-6" />
                  Registro Rápido - Persona No Encontrada
                </CardTitle>
                <CardDescription>
                  Documento: <strong>{scannedDocument}</strong> - Complete los datos para registrar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickRegister} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qr-nombre">Nombre *</Label>
                      <Input
                        id="qr-nombre"
                        type="text"
                        placeholder="Nombre"
                        value={quickRegisterForm.nombre}
                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, nombre: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qr-apellido">Apellido *</Label>
                      <Input
                        id="qr-apellido"
                        type="text"
                        placeholder="Apellido"
                        value={quickRegisterForm.apellido}
                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, apellido: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qr-tipoDoc">Tipo de Documento *</Label>
                      <select
                        id="qr-tipoDoc"
                        value={quickRegisterForm.tipoDocumento}
                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, tipoDocumento: e.target.value as 'CC' | 'TI' | 'CE'})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="TI">Tarjeta de Identidad</option>
                        <option value="CE">Cédula de Extranjería</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qr-rol">Rol *</Label>
                      <select
                        id="qr-rol"
                        value={quickRegisterForm.rol}
                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, rol: e.target.value as 'ESTUDIANTE' | 'INSTRUCTOR' | 'ADMINISTRATIVO'})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="ESTUDIANTE">Aprendiz</option>
                        <option value="INSTRUCTOR">Instructor</option>
                        <option value="ADMINISTRATIVO">Administrativo</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qr-tipoSangre">Tipo de Sangre *</Label>
                      <select
                        id="qr-tipoSangre"
                        value={quickRegisterForm.tipoSangre}
                        onChange={(e) => setQuickRegisterForm({...quickRegisterForm, tipoSangre: e.target.value as 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-'})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>

                    {quickRegisterForm.rol === 'ESTUDIANTE' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="qr-programa">Programa de Formación</Label>
                          <Input
                            id="qr-programa"
                            type="text"
                            placeholder="Ej: ADSO, Cocina, etc."
                            value={quickRegisterForm.programa}
                            onChange={(e) => setQuickRegisterForm({...quickRegisterForm, programa: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="qr-ficha">Número de Ficha</Label>
                          <Input
                            id="qr-ficha"
                            type="text"
                            placeholder="Ej: 2898754"
                            value={quickRegisterForm.ficha}
                            onChange={(e) => setQuickRegisterForm({...quickRegisterForm, ficha: e.target.value})}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Registrar y Dar Acceso
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowQuickRegister(false);
                        setScannedDocument('');
                        setScanResult(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-6 w-6" />
                  Escáner QR - Control de Acceso
                </CardTitle>
                <CardDescription>
                  Escanee el código QR o ingrese manualmente el documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Área de escáneo */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center overflow-hidden">
                  {isRealScanning ? (
                    <div className="space-y-4">
                      <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                        <video 
                          ref={videoRef} 
                          className="w-full h-full object-cover"
                          style={{ 
                            transform: 'scaleX(-1)', // Efecto espejo para mejor UX
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-2 border-white rounded-lg shadow-lg"></div>
                        </div>
                      </div>
                      <Button onClick={stopScan} variant="destructive" className="w-full">
                        Detener Escáneo
                      </Button>
                    </div>
                  ) : isScanning ? (
                    <div className="flex flex-col items-center space-y-2 py-4">
                      <Camera className="h-12 w-12 animate-pulse text-blue-600" />
                      <p>Escaneando...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-4 py-4">
                      <Camera className="h-12 w-12 text-gray-400" />
                      <div className="flex gap-2 w-full">
                        <Button 
                          onClick={startRealScan} 
                          className="flex-1"
                        >
                          Iniciar Cámara
                        </Button>
                        <Button onClick={simulateQRScan} variant="outline" className="flex-1">
                          Prueba
                      </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Entrada manual */}
                <div className="space-y-2">
                  <Label>Ingreso y Salida Manual de Documento:</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Número de documento"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
                    />
                    <Button onClick={handleManualEntry} variant="outline">
                      Ingreso y Salida Manual
                    </Button>
                  </div>
                </div>

                {/* Resultado del escáneo */}
                {scanResult && (
                  <div className={`p-4 rounded-lg border ${
                    scanResult.success 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {scanResult.success ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                      <span className="font-medium">{scanResult.message}</span>
                    </div>
                    {scanResult.person && scanResult.codigoQR && (
                      <div className="mt-3 p-3 bg-white rounded-lg border">
                        <div className="space-y-2">
                          <p><strong>Nombre Completo:</strong> {scanResult.person.nombre} {scanResult.person.apellido || ''}</p>
                          <p><strong>Número de Documento:</strong> {scanResult.person.documento}</p>
                          <p><strong>Rol:</strong> {scanResult.person.rol === 'ESTUDIANTE' ? 'APRENDIZ' : scanResult.person.rol}</p>
                          <p><strong>Tipo de Sangre:</strong> {scanResult.person.tipoSangre}</p>
                          <p><strong>Código QR:</strong> {scanResult.codigoQR}</p>
                        </div>
                        {/* Los botones manuales se quitaron - el registro es automático cuando está en BD */}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Panel de estado en tiempo real */}
            <Card>
              <CardHeader>
                <CardTitle>Estado Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-800">
                      {stats.totalPersonasDentro}
                    </p>
                    <p className="text-sm text-green-600">Personas dentro</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-2xl font-bold text-blue-800">
                      {stats.accesosDia}
                    </p>
                    <p className="text-sm text-blue-600">Accesos hoy</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Aprendices:</span>
                    <span className="font-medium">{stats.estudiantesDentro}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Instructores:</span>
                    <span className="font-medium">{stats.instructoresDentro}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Administrativos:</span>
                    <span className="font-medium">{stats.administrativosDentro}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Visitantes:</span>
                    <span className="font-medium">{stats.visitantesDentro}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Registro de Visitantes */}
        <TabsContent value="visitor" className="space-y-6">
          {/* Mostrar QR generado más recientemente */}
          {lastGeneratedQR && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <QrCode className="h-6 w-6" />
                  QR Generado Exitosamente
                </CardTitle>
                <CardDescription>
                  Descargue el código QR para entregar al visitante
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QRGenerator visitorQR={lastGeneratedQR} />
                <Button 
                  onClick={() => setLastGeneratedQR(null)} 
                  variant="outline" 
                  className="w-full mt-4"
                >
                  Cerrar
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-6 w-6" />
                Registro de Visitantes
              </CardTitle>
              <CardDescription>
                Generar código QR temporal para visitantes (válido por 24 horas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVisitorRegistration} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vis-nombre">Nombre</Label>
                    <Input
                      id="vis-nombre"
                      type="text"
                      placeholder="Nombre del visitante"
                      value={visitorForm.nombre}
                      onChange={(e) => setVisitorForm({...visitorForm, nombre: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vis-apellido">Apellido</Label>
                    <Input
                      id="vis-apellido"
                      type="text"
                      placeholder="Apellido del visitante"
                      value={visitorForm.apellido}
                      onChange={(e) => setVisitorForm({...visitorForm, apellido: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vis-documento">Documento</Label>
                    <Input
                      id="vis-documento"
                      type="text"
                      placeholder="Número de documento"
                      value={visitorForm.documento}
                      onChange={(e) => setVisitorForm({...visitorForm, documento: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vis-tipoDoc">Tipo de Documento</Label>
                    <select
                      id="vis-tipoDoc"
                      value={visitorForm.tipoDocumento}
                      onChange={(e) => setVisitorForm({...visitorForm, tipoDocumento: e.target.value as 'CC' | 'TI' | 'CE'})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="TI">Tarjeta de Identidad</option>
                      <option value="CE">Cédula de Extranjería</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vis-tipoSangre">Tipo de Sangre</Label>
                    <select
                      id="vis-tipoSangre"
                      value={visitorForm.tipoSangre}
                      onChange={(e) => setVisitorForm({...visitorForm, tipoSangre: e.target.value as 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-'})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="motivo">Motivo de la Visita</Label>
                    <Input
                      id="motivo"
                      type="text"
                      placeholder="Motivo de la visita"
                      value={visitorForm.motivo}
                      onChange={(e) => setVisitorForm({...visitorForm, motivo: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="zona">Zona / Destino</Label>
                    <Input
                      id="zona"
                      type="text"
                      placeholder="Ej: Oficina de Recursos Humanos, Taller 3, Aula 201, etc."
                      value={visitorForm.zona}
                      onChange={(e) => setVisitorForm({...visitorForm, zona: e.target.value})}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Especifique a dónde se dirige el visitante dentro de las instalaciones
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="horasValidez">Horas de Validez</Label>
                      <Input
                        id="horasValidez"
                        type="number"
                        min="0"
                        max="168"
                        placeholder="24"
                        value={visitorForm.horasValidez}
                        onChange={(e) => setVisitorForm({...visitorForm, horasValidez: parseInt(e.target.value) || 0})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minutosValidez">Minutos de Validez</Label>
                      <Input
                        id="minutosValidez"
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        value={visitorForm.minutosValidez}
                        onChange={(e) => setVisitorForm({...visitorForm, minutosValidez: parseInt(e.target.value) || 0})}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Establezca el tiempo de validez del QR del visitante (horas y minutos)
                  </p>
                </div>

                <Button type="submit" className="w-full">
                  Registrar Visitante y Generar QR
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reportes para Guarda */}
        <TabsContent value="reports" className="space-y-6">
          {/* Tarjetas estadísticas sincronizadas con Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personas Dentro</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPersonasDentro}</div>
                <p className="text-xs text-muted-foreground">
                  Total en instalaciones
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accesos Hoy</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.accesosDia}</div>
                <p className="text-xs text-muted-foreground">
                  Entradas y salidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.estudiantesDentro}</div>
                <p className="text-xs text-muted-foreground">
                  Actualmente dentro
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personal</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.instructoresDentro + stats.administrativosDentro}
                </div>
                <p className="text-xs text-muted-foreground">
                  Instructores y administrativos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Historial de accesos con filtros avanzados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historial de Accesos del Turno
              </CardTitle>
              <CardDescription>
                Filtre por rango de fechas y rol para investigar accesos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros avanzados */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="hist-desde">Fecha desde</Label>
                  <Input
                    id="hist-desde"
                    type="date"
                    value={historyDesde}
                    onChange={(e) => setHistoryDesde(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="hist-hasta">Fecha hasta</Label>
                  <Input
                    id="hist-hasta"
                    type="date"
                    value={historyHasta}
                    onChange={(e) => setHistoryHasta(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="hist-rol">Rol</Label>
                  <select
                    id="hist-rol"
                    value={historyRol}
                    onChange={(e) => setHistoryRol(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="ESTUDIANTE">Aprendiz</option>
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="ADMINISTRATIVO">Administrativo</option>
                    <option value="VISITANTE">Visitante</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setHistoryDesde('');
                      setHistoryHasta('');
                      setHistoryRol('TODOS');
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>

              {/* Lista */}
              <div className="space-y-4">
                {filteredAccessRecords.length > 0 ? (
                  filteredAccessRecords.slice(0, 50).map((record) => {
                    const qrAsociado = record.persona.rol === 'VISITANTE' 
                      ? visitorQRs.find(qr => qr.codigoQR === record.codigoQR)
                      : null;
                    // Manejar fechas DATE del backend (fecha_entrada o fecha_salida)
                    let timestamp: Date | string | null = null;
                    let fechaEntrada: Date | string | null = null;
                    let fechaSalida: Date | string | null = null;
                    
                    if (record.timestamp) {
                      timestamp = record.timestamp;
                    } else if (record.fechaHora) {
                      timestamp = record.fechaHora;
                    } else if (record.fecha_entrada) {
                      timestamp = record.fecha_entrada;
                    } else if (record.fecha_salida) {
                      timestamp = record.fecha_salida;
                    } else {
                      timestamp = new Date();
                    }
                    
                    // Obtener fecha_entrada y fecha_salida si existen
                    if (record.fecha_entrada) {
                      fechaEntrada = record.fecha_entrada;
                    }
                    if (record.fecha_salida) {
                      fechaSalida = record.fecha_salida;
                    }
                    
                    // Convertir strings a Date si es necesario
                    if (typeof fechaEntrada === 'string') {
                      fechaEntrada = new Date(fechaEntrada);
                    }
                    if (typeof fechaSalida === 'string') {
                      fechaSalida = new Date(fechaSalida);
                    }
                    if (typeof timestamp === 'string') {
                      timestamp = new Date(timestamp);
                    }
                    
                    return (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getRolIcon(record.persona.rol)}
                            <div>
                              <p className="font-medium">{record.persona.nombre} {record.persona.apellido || ''}</p>
                              <p className="text-sm text-muted-foreground">
                                {record.persona.documento} • {record.persona.rol === 'ESTUDIANTE' ? 'APRENDIZ' : record.persona.rol}
                              </p>
                              {qrAsociado && (
                                <p className="text-xs text-orange-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  QR vence: {formatDateTime(qrAsociado.fechaExpiracion)}
                                </p>
                              )}
                              {/* Mostrar horas de entrada y salida para visitantes */}
                              {record.persona.rol === 'VISITANTE' && (
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  {fechaEntrada ? (
                                    <p className="text-green-600">🟢 Entrada: {formatTime(fechaEntrada)} - {formatDate(fechaEntrada)}</p>
                                  ) : (
                                    <p className="text-gray-400">🟢 Entrada: No registrada</p>
                                  )}
                                  {fechaSalida ? (
                                    <p className="text-orange-600">🔴 Salida: {formatTime(fechaSalida)} - {formatDate(fechaSalida)}</p>
                                  ) : (
                                    <p className="text-gray-400">🔴 Salida: Pendiente (se marcará automáticamente al expirar el QR)</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={record.tipo === 'ENTRADA' ? 'default' : 'secondary'}
                            className={record.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                          >
                            {record.tipo}
                          </Badge>
                          <div className="text-right text-sm">
                            <p>{formatTime(timestamp)}</p>
                            <p className="text-muted-foreground">{formatDate(timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No hay registros que coincidan con los filtros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
