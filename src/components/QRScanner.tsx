import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Scan, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Person, AccessRecord, VisitorQR } from '../types';
import { useZxing } from 'react-zxing';
import { aprendicesAPI } from '../services/api';

interface QRScannerProps {
  onAccessGranted: (record: AccessRecord) => void;
  personas: Person[];
  visitorQRs?: VisitorQR[];
  onPersonNotFound?: (documento: string) => void;
}

export function QRScanner({ onAccessGranted, personas, visitorQRs = [], onPersonNotFound }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    person?: Person;
  } | null>(null);

  // Inicializar scanner con react-zxing
  const { ref } = useZxing({
    onDecodeResult(result) {
      const code = result.getText();
      console.log('QR escaneado:', code);
      handleScannedQR(code);
    },
    onError(error) {
      console.error('Error en el scanner:', error);
    },
    paused: !isScanning,
  });

  const handleScannedQR = async (code: string) => {
    // Detener el scanner
    setIsScanning(false);
    
    // Procesar el código QR escaneado
    await processQRCode(code);
  };

  const simulateQRScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    
    // Simular tiempo de escáneo
    setTimeout(async () => {
      const randomPerson = personas[Math.floor(Math.random() * personas.length)];
      if (randomPerson) {
        await processQRCode(randomPerson.documento);
      }
      setIsScanning(false);
    }, 2000);
  };

  const processQRCode = async (code: string) => {
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
        return;
      }

      if (visitorQR.estado === 'EXPIRADO' || visitorQR.estado === 'USADO') {
        setScanResult({
          success: false,
          message: `QR Inválido: Estado ${visitorQR.estado}`,
          person: visitorQR.visitante
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
      return;
    }

    // Si no es QR de visitante, buscar PRIMERO en el backend (BD)
    // El código puede ser:
    // 1. Un código QR de aprendiz (formato: APR-xxxxx)
    // 2. Un documento
    let persona: Person | undefined;
    let codigoQRReal = code;
    let estaEnBD = false;
    
    // SIEMPRE buscar primero en el backend (BD)
    try {
      // Si el código empieza con APR-, buscar por código QR en el backend
      if (code.startsWith('APR-')) {
        console.log('🔍 Buscando aprendiz por QR en BD:', code);
        const response = await aprendicesAPI.getByQR(code);
        if (response.success && response.data) {
          const aprendiz = response.data;
          persona = {
            id: aprendiz.id,
            nombre: aprendiz.nombre,
            apellido: aprendiz.apellido || '',
            documento: aprendiz.documento,
            tipoDocumento: aprendiz.tipo_documento,
            programa: aprendiz.programa || '',
            ficha: aprendiz.ficha || '',
            rol: 'ESTUDIANTE',
            estado: aprendiz.estado,
            tipoSangre: 'O+',
            foto: null,
          };
          codigoQRReal = aprendiz.codigo_qr;
          estaEnBD = true;
          console.log('✅ Aprendiz encontrado en BD por QR:', persona.nombre);
        }
      } else {
        // Buscar por documento en el backend
        // El código puede ser solo el documento o contener texto completo del QR
        let documentoBuscado = code;
        
        // Si el código contiene texto largo, intentar extraer el documento
        const numeroDocumentoMatch = code.match(/\b\d{8,15}\b/);
        if (numeroDocumentoMatch && code.length > 20) {
          documentoBuscado = numeroDocumentoMatch[0];
          console.log('📝 Código contiene texto completo. Extrayendo documento:', documentoBuscado);
        }
        
        console.log('🔍 Buscando aprendiz por documento en BD:', documentoBuscado);
        const response = await aprendicesAPI.getByDocumento(documentoBuscado);
        if (response.success && response.data) {
          const aprendiz = response.data;
          persona = {
            id: aprendiz.id,
            nombre: aprendiz.nombre,
            apellido: aprendiz.apellido || '',
            documento: aprendiz.documento,
            tipoDocumento: aprendiz.tipo_documento,
            programa: aprendiz.programa || '',
            ficha: aprendiz.ficha || '',
            rol: 'ESTUDIANTE',
            estado: aprendiz.estado,
            tipoSangre: 'O+',
            foto: null,
          };
          codigoQRReal = aprendiz.codigo_qr;
          estaEnBD = true;
          console.log('✅ Aprendiz encontrado en BD por documento:', persona.nombre, 'QR:', codigoQRReal);
        }
      }
    } catch (error: any) {
      console.error('❌ Error buscando en BD:', error);
      // Si hay error, continuar para buscar en array local
    }
    
    // Si NO se encontró en BD, buscar en el array local (pero esto significa que NO está en BD)
    if (!persona) {
      persona = personas.find(p => p.documento === code);
      if (persona) {
        console.log('⚠️ Aprendiz encontrado solo en array local (NO en BD):', persona.nombre);
        console.log('💡 Se requiere registro manual en BD');
      }
    }
    
    // Si NO se encontró en BD ni en array local, mostrar mensaje para registro manual
    if (!persona) {
      setScanResult({
        success: false,
        message: `⚠️ Persona no registrada - Código: ${code}. Use la Vista de Guardia para registrar.`
      });
      if (onPersonNotFound) {
        onPersonNotFound(code);
      }
      return;
    }
    
    // Si la persona NO está en BD, mostrar mensaje para registro manual
    if (!estaEnBD) {
      setScanResult({
        success: false,
        message: `⚠️ Persona no registrada en BD - ${persona.nombre}. Use la Vista de Guardia para registrar en BD primero.`
      });
      if (onPersonNotFound) {
        onPersonNotFound(code);
      }
      return;
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
      return;
    }

    // Crear registro de acceso
    // El código escaneado puede ser el documento o el QR real
    // Si es el QR real (empieza con APR-), usarlo directamente
    // Si es el documento, necesitaremos obtener el QR del backend en handleAccessGranted
    // El tipo será determinado automáticamente por el backend basándose en el último registro
    const accessRecord: AccessRecord = {
      id: Date.now().toString(),
      personaId: persona.id,
      persona,
      tipo: 'AUTO', // El backend determinará automáticamente si es ENTRADA o SALIDA
      timestamp: new Date(),
      fechaHora: new Date(),
      ubicacion: 'Entrada Principal',
      codigoQR: codigoQRReal // Código QR real del aprendiz
    };

    // Si está en BD, se registrará automáticamente (ENTRADA/SALIDA alternando)
    setScanResult({
      success: true,
      message: `✅ Persona encontrada en BD. Registrando entrada/salida automáticamente...`,
      person: persona
    });

    // Registrar automáticamente en BD (el backend determinará si es ENTRADA o SALIDA)
    onAccessGranted(accessRecord);
  };

  const handleManualEntry = async () => {
    if (!manualCode.trim()) return;
    await processQRCode(manualCode.trim());
    setManualCode('');
  };

  const startRealScan = () => {
    setIsScanning(true);
    setScanResult(null);
  };

  const stopScan = () => {
    setIsScanning(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
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
          {isScanning ? (
            <div className="space-y-4">
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                <video 
                  ref={ref} 
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
          ) : (
            <div className="flex flex-col items-center space-y-4 py-4">
              <Camera className="h-12 w-12 text-gray-400" />
              <div className="flex gap-2 w-full">
                <Button onClick={startRealScan} className="flex-1">
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
          <label className="text-sm font-medium">Entrada Manual de Documento:</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Número de documento"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
            />
            <Button onClick={handleManualEntry} variant="outline">
              Verificar
            </Button>
          </div>
        </div>

        {/* Resultado del escáneo */}
        {scanResult && (
          <div className={`p-4 rounded-lg border ${
            scanResult.success 
              ? 'bg-green-50 border-green-200' 
              : scanResult.message.includes('no registrada')
                ? 'bg-orange-50 border-orange-200'
                : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : scanResult.message.includes('no registrada') ? (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                scanResult.success 
                  ? 'text-green-800' 
                  : scanResult.message.includes('no registrada')
                    ? 'text-orange-800'
                    : 'text-red-800'
              }`}>
                {scanResult.message}
              </span>
            </div>
            {scanResult.person && (
              <div className="mt-3 p-3 bg-white rounded-lg border">
                <div className="space-y-2">
                  <p><strong>Nombre:</strong> {scanResult.person.nombre}</p>
                  <p><strong>Documento:</strong> {scanResult.person.documento}</p>
                  <p><strong>Rol:</strong> {scanResult.person.rol === 'ESTUDIANTE' ? 'APRENDIZ' : scanResult.person.rol}</p>
                  <p><strong>Tipo de Sangre:</strong> {scanResult.person.tipoSangre}</p>
                  {scanResult.person.rol === 'VISITANTE' && (
                    <div className="flex items-center gap-2 mt-2 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Visitante temporal</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}