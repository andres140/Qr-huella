import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Scan, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Person, AccessRecord, VisitorQR } from '../types';
import { useZxing } from 'react-zxing';

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

  const handleScannedQR = (code: string) => {
    // Detener el scanner
    setIsScanning(false);
    
    // Procesar el código QR escaneado
    processQRCode(code);
  };

  const simulateQRScan = () => {
    setIsScanning(true);
    setScanResult(null);
    
    // Simular tiempo de escáneo
    setTimeout(() => {
      const randomPerson = personas[Math.floor(Math.random() * personas.length)];
      processQRCode(randomPerson.documento);
      setIsScanning(false);
    }, 2000);
  };

  const processQRCode = (code: string) => {
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
      const accessRecord: AccessRecord = {
        id: Date.now().toString(),
        personaId: visitorQR.visitante.id,
        persona: visitorQR.visitante,
        tipo: 'ENTRADA', // Visitantes siempre son entrada
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

    // Si no es QR de visitante, buscar en personas registradas
    const persona = personas.find(p => p.documento === code);
    
    if (!persona) {
      setScanResult({
        success: false,
        message: `⚠️ Persona no registrada - Documento: ${code}. Use la Vista de Guardia para registrar.`
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
    const accessRecord: AccessRecord = {
      id: Date.now().toString(),
      personaId: persona.id,
      persona,
      tipo: 'ENTRADA', // Simplificado - en producción determinaría si es entrada o salida
      timestamp: new Date(),
      fechaHora: new Date(),
      ubicacion: 'Entrada Principal',
      codigoQR: code
    };

    setScanResult({
      success: true,
      message: `${accessRecord.tipo} registrada exitosamente`,
      person: persona
    });

    onAccessGranted(accessRecord);
  };

  const handleManualEntry = () => {
    if (!manualCode.trim()) return;
    processQRCode(manualCode.trim());
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
                  className="w-full h-full object-cover -scale-x-100"
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