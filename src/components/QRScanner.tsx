import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Scan, Camera, CheckCircle, XCircle } from 'lucide-react';
import { Person, AccessRecord } from '../types';

interface QRScannerProps {
  onAccessGranted: (record: AccessRecord) => void;
  personas: Person[];
}

export function QRScanner({ onAccessGranted, personas }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    person?: Person;
  } | null>(null);

  // Simular escáneo QR - en una implementación real se usaría una librería de QR
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
    const persona = personas.find(p => p.documento === code);
    
    if (!persona) {
      setScanResult({
        success: false,
        message: 'Código QR no válido o persona no registrada'
      });
      return;
    }

    if (persona.estado === 'INACTIVO') {
      setScanResult({
        success: false,
        message: 'Acceso denegado: Usuario inactivo',
        person: persona
      });
      return;
    }

    // Crear registro de acceso
    const accessRecord: AccessRecord = {
      id: Date.now().toString(),
      personaId: persona.id,
      persona,
      tipo: Math.random() > 0.5 ? 'ENTRADA' : 'SALIDA',
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
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {isScanning ? (
            <div className="flex flex-col items-center space-y-2">
              <Camera className="h-12 w-12 animate-pulse text-blue-600" />
              <p>Escaneando...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <Scan className="h-12 w-12 text-gray-400" />
              <Button onClick={simulateQRScan} className="w-full">
                Iniciar Escáneo
              </Button>
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
            {scanResult.person && (
              <div className="mt-3 p-3 bg-white rounded-lg border">
                <div className="space-y-2">
                  <p><strong>Nombre:</strong> {scanResult.person.nombre}</p>
                  <p><strong>Documento:</strong> {scanResult.person.documento}</p>
                  <p><strong>Rol:</strong> {scanResult.person.rol === 'ESTUDIANTE' ? 'APRENDIZ' : scanResult.person.rol}</p>
                  <p><strong>Tipo de Sangre:</strong> {scanResult.person.tipoSangre}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}