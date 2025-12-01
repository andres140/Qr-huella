import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Download, 
  Clock, 
  User, 
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { VisitorQR, Person } from '../types';

interface QRGeneratorProps {
  visitorQR: VisitorQR;
  onDownload?: () => void;
}

export function QRGenerator({ visitorQR, onDownload }: QRGeneratorProps) {
  const [isExpired, setIsExpired] = useState(false);

  React.useEffect(() => {
    const checkExpiry = () => {
      const now = new Date();
      setIsExpired(visitorQR.fechaExpiracion < now);
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 1000); // Verificar cada segundo
    return () => clearInterval(interval);
  }, [visitorQR.fechaExpiracion]);

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return 'Fecha no disponible';
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else {
      // Si viene como string, parsearlo correctamente
      dateObj = new Date(date);
    }
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    
    // Formatear con hora local correcta (sin conversión de zona horaria)
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleDownload = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR-${visitorQR.visitante.nombre.replace(/\s/g, '-')}-${visitorQR.visitante.documento}.png`;
      link.click();
    }
    onDownload?.();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          QR de Visitante
        </CardTitle>
        <CardDescription>
          Código temporal de acceso - Válido por 24 horas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información del visitante */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold mb-3">Información del Visitante</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Nombre:</strong> {visitorQR.visitante.nombre}</p>
            <p><strong>Documento:</strong> {visitorQR.visitante.tipoDocumento} {visitorQR.visitante.documento}</p>
            <p><strong>Tipo de Sangre:</strong> {visitorQR.visitante.tipoSangre}</p>
            <p><strong>Rol:</strong> VISITANTE</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed">
          <div className="text-center">
            <QRCodeCanvas
              id="qr-canvas"
              value={visitorQR.codigoQR}
              size={250}
              level="H"
              includeMargin={true}
            />
            <p className="text-sm text-gray-500 mt-2">Código: {visitorQR.codigoQR}</p>
          </div>
        </div>

        {/* Información del QR */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <p><strong>Generado:</strong> {formatDateTime(visitorQR.fechaGeneracion)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <p><strong>Vence:</strong> {formatDateTime(visitorQR.fechaExpiracion)}</p>
            </div>
            <div className="flex items-center gap-2">
              {isExpired ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">EXPIRADO</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">ACTIVO</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botón de descarga */}
        <Button 
          onClick={handleDownload} 
          className="w-full"
          variant={isExpired ? "destructive" : "default"}
          disabled={isExpired}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExpired ? 'QR Expirado - No descargable' : 'Descargar QR'}
        </Button>

        {/* Estado */}
        <div className="flex justify-center">
          <Badge 
            variant={isExpired ? "destructive" : "default"}
            className={isExpired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}
          >
            {isExpired ? 'EXPIRADO' : 'VÁLIDO'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

