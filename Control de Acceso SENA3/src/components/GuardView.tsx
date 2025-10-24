import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
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
  } | null>(null);

  // Formulario para registro de visitantes
  const [visitorForm, setVisitorForm] = useState({
    nombre: '',
    documento: '',
    tipoDocumento: 'CC' as 'CC' | 'TI' | 'CE',
    tipoSangre: 'O+' as 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-',
    motivo: ''
  });

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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

  const processQRCode = (code: string) => {
    const persona = personas.find(p => p.documento === code);
    
    if (!persona) {
      setScanResult({
        success: false,
        message: 'Código QR no válido o persona no registrada'
      });
      toast.error('❌ Acceso Denegado', {
        description: 'Código QR no válido o persona no registrada',
        duration: 4000,
      });
      return;
    }

    // Estados que permiten el acceso
    const estadosPermitidos = ['ACTIVO', 'EN FORMACION', 'POR CERTIFICAR', 'CERTIFICADO'];
    
    // Estados que bloquean el acceso
    const estadosBloqueados = ['INACTIVO', 'APLAZADO', 'CANCELADO', 'SUSPENDIDO', 'RETIRO VOLUNTARIO'];
    
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

    // Determinar si es entrada o salida basado en el último registro de la persona
    const ultimoAcceso = accessRecords.find(r => r.personaId === persona.id);
    const tipo: 'ENTRADA' | 'SALIDA' = !ultimoAcceso || ultimoAcceso.tipo === 'SALIDA' ? 'ENTRADA' : 'SALIDA';

    const accessRecord: AccessRecord = {
      id: Date.now().toString(),
      personaId: persona.id,
      persona,
      tipo,
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

    // Notificación mejorada
    toast.success(`✅ ${tipo} Registrada`, {
      description: `${persona.nombre} - ${persona.rol === 'ESTUDIANTE' ? 'APRENDIZ' : persona.rol} - ${formatDateTime(new Date())}`,
      duration: 5000,
    });
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

  const handleVisitorRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar si el visitante ya existe en la base de datos
    const existingVisitor = personas.find(p => p.documento === visitorForm.documento);
    
    let visitor: Person;
    const now = new Date();
    
    if (existingVisitor) {
      // El visitante ya existe, usar los datos existentes
      visitor = existingVisitor;
      
      // Actualizar tipo de sangre si es diferente
      if (existingVisitor.tipoSangre !== visitorForm.tipoSangre) {
        visitor = { ...existingVisitor, tipoSangre: visitorForm.tipoSangre };
      }

      toast.info('ℹ️ Visitante Existente', {
        description: `${visitor.nombre} ya está registrado en el sistema`,
        duration: 4000,
      });
    } else {
      // Crear nuevo visitante
      visitor = {
        id: Date.now().toString(),
        nombre: visitorForm.nombre,
        documento: visitorForm.documento,
        tipoDocumento: visitorForm.tipoDocumento,
        rol: 'VISITANTE',
        estado: 'ACTIVO',
        tipoSangre: visitorForm.tipoSangre
      };
      
      // Registrar el nuevo visitante
      onVisitorRegistered(visitor);
    }

    // Generar QR temporal para el visitante (válido por 24 horas)
    const fechaExpiracion = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const visitorQR: VisitorQR = {
      id: Date.now().toString(),
      visitante: visitor,
      codigoQR: `VISITOR_${visitor.documento}_${Date.now()}`,
      fechaGeneracion: now,
      fechaExpiracion: fechaExpiracion,
      estado: 'ACTIVO',
      generadoPor: user.id
    };

    onGenerateVisitorQR(visitorQR);

    // Registrar acceso automáticamente
    const accessRecord: AccessRecord = {
      id: (Date.now() + 1).toString(),
      personaId: visitor.id,
      persona: visitor,
      tipo: 'ENTRADA',
      timestamp: now,
      fechaHora: now,
      ubicacion: 'Entrada Principal',
      codigoQR: visitorQR.codigoQR
    };

    onAccessGranted(accessRecord);

    // Limpiar formulario
    setVisitorForm({
      nombre: '',
      documento: '',
      tipoDocumento: 'CC',
      tipoSangre: 'O+',
      motivo: ''
    });

    setScanResult({
      success: true,
      message: `Visitante registrado. QR generado válido hasta ${formatDateTime(visitorQR.fechaExpiracion)}`,
      person: visitor
    });

    // Mostrar notificación toast mejorada
    toast.success('✅ Visitante Registrado', {
      description: `${visitor.nombre} - QR válido hasta: ${formatDateTime(fechaExpiracion)}`,
      duration: 6000,
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
                  <Label>Entrada Manual de Documento:</Label>
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
                          <p><strong>Nombre Completo:</strong> {scanResult.person.nombre} {scanResult.person.apellido || ''}</p>
                          <p><strong>Número de Documento:</strong> {scanResult.person.documento}</p>
                          <p><strong>Rol:</strong> {scanResult.person.rol === 'ESTUDIANTE' ? 'APRENDIZ' : scanResult.person.rol}</p>
                          <p><strong>Tipo de Sangre:</strong> {scanResult.person.tipoSangre}</p>
                        </div>
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
                    <Label htmlFor="vis-nombre">Nombre Completo</Label>
                    <Input
                      id="vis-nombre"
                      type="text"
                      placeholder="Nombre completo del visitante"
                      value={visitorForm.nombre}
                      onChange={(e) => setVisitorForm({...visitorForm, nombre: e.target.value})}
                      required
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

          {/* Accesos recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Accesos Recientes del Turno
              </CardTitle>
              <CardDescription>
                Últimos registros procesados (en tiempo real)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessRecords.length > 0 ? (
                  accessRecords.slice(0, 10).map((record) => {
                    const qrAsociado = record.persona.rol === 'VISITANTE' 
                      ? visitorQRs.find(qr => qr.codigoQR === record.codigoQR)
                      : null;
                    const timestamp = record.timestamp || record.fechaHora || new Date();
                    
                    return (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getRolIcon(record.persona.rol)}
                            <div>
                              <p className="font-medium">{record.persona.nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                {record.persona.documento} • {record.persona.rol === 'ESTUDIANTE' ? 'APRENDIZ' : record.persona.rol}
                              </p>
                              {qrAsociado && (
                                <p className="text-xs text-orange-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  QR vence: {formatDateTime(qrAsociado.fechaExpiracion)}
                                </p>
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
                    No hay registros de acceso recientes
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
