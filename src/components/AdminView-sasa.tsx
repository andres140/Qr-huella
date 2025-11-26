import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserManagement } from './UserManagement';
import { ReportExporter } from './ReportExporter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectLabel } from './ui/select';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { QRGenerator } from './QRGenerator';
import { 
  Settings,
  FileText,
  Download,
  Clock,
  UserCheck,
  QrCode,
  UserCog,
  RefreshCw,
  AlertCircle,
  Users,
  GraduationCap,
  Shield,
  Calendar
} from 'lucide-react';

import { Person, AccessRecord, AccessStats, User, VisitorQR } from '../types';

interface AdminViewProps {
  personas: Person[];
  accessRecords: AccessRecord[];
  stats: AccessStats;
  user: User;
  visitorQRs: VisitorQR[];
  users: User[];
  onPersonUpdate: (person: Person) => void;
  onPersonDelete: (personId: string) => void;
  onPersonAdd: (person: Omit<Person, 'id'>) => void;
  onBulkPersonAdd: (persons: Omit<Person, 'id'>[]) => number;
  onUserAdd: (user: Omit<User, 'id'>) => void;
  onUserUpdate: (user: User) => void;
  onUserDelete: (userId: string) => void;
  onVisitorRegistered?: (person: Person) => void;
  onGenerateVisitorQR?: (visitorQR: VisitorQR) => void;
}

export function AdminView({
  personas,
  accessRecords,
  stats,
  user,
  visitorQRs,
  users,
  onPersonUpdate,
  onPersonDelete,
  onPersonAdd,
  onBulkPersonAdd,
  onUserAdd,
  onUserUpdate,
  onUserDelete,
  onVisitorRegistered,
  onGenerateVisitorQR
}: AdminViewProps) {
  
  const notifiedQRs = useRef<Set<string>>(new Set());
  const [selectedQR, setSelectedQR] = useState<VisitorQR | null>(null);

  // Estados del formulario rápido de visitante
  const [formTipoDocumento, setFormTipoDocumento] = useState<Person['tipoDocumento']>('CC');
  const [formDocumento, setFormDocumento] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formEstado, setFormEstado] = useState<Person['estado']>('ACTIVO');
  const [formTipoSangre, setFormTipoSangre] = useState<Person['tipoSangre']>('O+');

  // Estado y handler para el formulario completo de visitantes (Card adicional solicitado)
  const [visitorForm, setVisitorForm] = useState<{
    nombre: string;
    apellido: string;
    documento: string;
    tipoDocumento: Person['tipoDocumento'];
    tipoSangre: Person['tipoSangre'];
    motivo: string;
  }>({
    nombre: '',
    apellido: '',
    documento: '',
    tipoDocumento: 'CC',
    tipoSangre: 'O+',
    motivo: ''
  });

  const handleVisitorRegistration = (e: React.FormEvent) => {
    e.preventDefault();

    if (!visitorForm.documento.trim() || !visitorForm.nombre.trim()) {
      alert('Por favor complete nombre y documento');
      return;
    }

    const person: Person = {
      id: Date.now().toString(),
      nombre: visitorForm.nombre.trim(),
      apellido: visitorForm.apellido.trim() || '',
      documento: visitorForm.documento.trim(),
      tipoDocumento: visitorForm.tipoDocumento,
      programa: undefined,
      ficha: undefined,
      rol: 'VISITANTE',
      estado: 'ACTIVO',
      tipoSangre: visitorForm.tipoSangre,
      foto: undefined
    };

    const now = new Date();
    const newQR: VisitorQR = {
      id: Date.now().toString(),
      visitante: person,
      codigoQR: `QR-${Date.now()}-${person.documento}`,
      fechaGeneracion: now,
      fechaExpiracion: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      estado: 'ACTIVO',
      generadoPor: user.id
    };

    if (onGenerateVisitorQR) {
      onGenerateVisitorQR(newQR);
      setSelectedQR(newQR);
      toast.success('QR generado para visitante');
    } else if (onVisitorRegistered) {
      onVisitorRegistered(person);
      toast.success('Visitante registrado');
    } else if (onPersonAdd) {
      onPersonAdd(person);
      toast.success('Visitante agregado');
    } else {
      alert('No hay callback configurado para registrar/generar QR');
    }

    // limpiar formulario
    setVisitorForm({ nombre: '', apellido: '', documento: '', tipoDocumento: 'CC', tipoSangre: 'O+', motivo: '' });
  };

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

  // Visitantes ordenados por más reciente primero
  const visitantesOrdenados = [...visitorQRs]
    .sort((a, b) => b.fechaGeneracion.getTime() - a.fechaGeneracion.getTime());

  // Monitorear QRs expirados y mostrar alertas mejoradas
  useEffect(() => {
    // Cargar QRs ya notificados desde localStorage para evitar alertas en la primera carga
    const savedNotifiedQRs = localStorage.getItem('notifiedExpiredQRs');
    if (savedNotifiedQRs) {
      try {
        const parsed = JSON.parse(savedNotifiedQRs);
        parsed.forEach((id: string) => notifiedQRs.current.add(id));
      } catch (e) {
        console.error('Error loading notified QRs:', e);
      }
    }

    const checkExpiredQRs = () => {
      const now = new Date();
      visitorQRs.forEach(qr => {
        if (qr.fechaExpiracion <= now && qr.estado === 'ACTIVO' && !notifiedQRs.current.has(qr.id)) {
          notifiedQRs.current.add(qr.id);
          // Guardar en localStorage
          localStorage.setItem('notifiedExpiredQRs', JSON.stringify(Array.from(notifiedQRs.current)));
          toast.warning('⚠️ QR de Visitante Expirado', {
            description: `${qr.visitante.nombre} (${qr.visitante.documento}) - Expiró el ${formatDateTime(qr.fechaExpiracion)}`,
            duration: 7000,
          });
        }
      });
    };

    // No verificar inmediatamente en la primera carga, solo en intervalos
    // Verificar cada minuto
    const interval = setInterval(checkExpiredQRs, 60000);

    return () => clearInterval(interval);
  }, [visitorQRs]);

  // Monitorear nuevos visitantes (solo notificar si hay cambios reales, no en la primera carga)
  useEffect(() => {
    // Solo ejecutar si ya hay un valor previo guardado (no es la primera carga)
    const lastQRId = localStorage.getItem('lastVisitorQRNotified');
    const isFirstLoad = lastQRId === null;
    
    if (visitorQRs.length > 0 && !isFirstLoad) {
      const latestQR = visitantesOrdenados[0];
      
      // Solo notificar si el QR más reciente es diferente al último notificado
      if (latestQR && lastQRId !== latestQR.id) {
        localStorage.setItem('lastVisitorQRNotified', latestQR.id);
        toast.success('✅ Nuevo Visitante Registrado', {
          description: `${latestQR.visitante.nombre} - QR válido hasta ${formatDateTime(latestQR.fechaExpiracion)}`,
          duration: 6000,
        });
      }
    } else if (visitorQRs.length > 0 && isFirstLoad) {
      // En la primera carga, solo guardar el ID sin notificar
      const latestQR = visitantesOrdenados[0];
      if (latestQR) {
        localStorage.setItem('lastVisitorQRNotified', latestQR.id);
      }
    }
  }, [visitorQRs, visitantesOrdenados]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex w-full items-center gap-2 overflow-x-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="visitors" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Registro Visitantes
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Importacion Masiva
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personas Dentro</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPersonasDentro}</div>
                <p className="text-xs text-muted-foreground">Total en instalaciones</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accesos Hoy</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.accesosDia}</div>
                <p className="text-xs text-muted-foreground">Entradas y salidas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprendices</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.estudiantesDentro}</div>
                <p className="text-xs text-muted-foreground">Actualmente dentro</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.visitantesDentro}</div>
                <p className="text-xs text-muted-foreground">Con QR activo dentro</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personal</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.instructoresDentro + stats.administrativosDentro}
                </div>
                <p className="text-xs text-muted-foreground">Instructores y administrativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Registrados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{personas.length}</div>
                <p className="text-xs text-muted-foreground">Personas en el sistema</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gestión de Usuarios del Sistema */}
        <TabsContent value="users" className="space-y-6">
          <UserManagement
            users={users}
            currentUser={user}
            onUserAdd={onUserAdd}
            onUserUpdate={onUserUpdate}
            onUserDelete={onUserDelete}
          />
        </TabsContent>

        {/* Gestión de Visitantes - MEJORADO */}
        <TabsContent value="visitors" className="space-y-6">
          {/* Mostrar QR seleccionado */}
          {selectedQR && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <QrCode className="h-6 w-6" />
                    QR de Visitante
                  </CardTitle>
                  <Button 
                    onClick={() => setSelectedQR(null)} 
                    variant="outline" 
                    size="sm"
                  >
                    Cerrar
                  </Button>
                </div>
                <CardDescription>
                  Información del QR y descarga
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QRGenerator visitorQR={selectedQR} />
              </CardContent>
            </Card>
          )}

          {/* Formulario rápido para registrar visitantes */}
          <Card>
            <CardHeader>
              <CardTitle>Registro Rápido de Visitante</CardTitle>
              <CardDescription>Completa los datos y presiona Registrar</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault();

                  if (!formDocumento.trim() || !formNombre.trim()) {
                    alert('Por favor, complete el número de documento y el nombre.');
                    return;
                  }

                  const newPerson: Omit<Person, 'id'> = {
                    nombre: formNombre.trim(),
                    apellido: formApellido.trim(),
                    documento: formDocumento.trim(),
                    tipoDocumento: formTipoDocumento,
                    programa: undefined,
                    ficha: undefined,
                    rol: 'VISITANTE',
                    estado: formEstado,
                    tipoSangre: formTipoSangre,
                    foto: undefined
                  };

                  if (onVisitorRegistered) {
                    onVisitorRegistered(newPerson as Person);
                  } else if (onPersonAdd) {
                    onPersonAdd(newPerson);
                  }

                  // limpiar estados
                  setFormDocumento('');
                  setFormNombre('');
                  setFormApellido('');
                  setFormTipoDocumento('CC');
                  setFormEstado('ACTIVO');
                  setFormTipoSangre('O+');
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm block mb-1">Tipo de documento</label>
                    <Select value={formTipoDocumento} onValueChange={(v: string) => setFormTipoDocumento(v as Person['tipoDocumento'])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CC">Cédula (CC)</SelectItem>
                        <SelectItem value="TI">Tarjeta Identidad (TI)</SelectItem>
                        <SelectItem value="CE">Cédula Extranjería (CE)</SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm block mb-1">Número documento</label>
                    <Input name="documento" value={formDocumento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDocumento(e.target.value)} placeholder="Número de documento" />
                  </div>

                  <div>
                    <label className="text-sm block mb-1">Nombre</label>
                    <Input name="nombre" value={formNombre} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNombre(e.target.value)} placeholder="Nombre" />
                  </div>

                  <div>
                    <label className="text-sm block mb-1">Apellidos</label>
                    <Input name="apellido" value={formApellido} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormApellido(e.target.value)} placeholder="Apellidos" />
                  </div>

                  <div>
                    <label className="text-sm block mb-1">Estado</label>
                    <Select value={formEstado} onValueChange={(v: string) => setFormEstado(v as Person['estado'])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                        <SelectItem value="INACTIVO">INACTIVO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm block mb-1">Tipo de sangre</label>
                    <Select value={formTipoSangre} onValueChange={(v: string) => setFormTipoSangre(v as Person['tipoSangre'])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button type="submit">Registrar</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Generar QR rápido si existe el callback (usa los estados del formulario)
                      const tempDoc = formDocumento.trim();
                      const tempName = formNombre.trim();
                      if (!tempDoc || !tempName) {
                        alert('Complete al menos nombre y documento para generar QR');
                        return;
                      }

                      const person: Person = {
                        id: Date.now().toString(),
                        nombre: tempName,
                        apellido: formApellido.trim() || '',
                        documento: tempDoc,
                        tipoDocumento: formTipoDocumento,
                        programa: undefined,
                        ficha: undefined,
                        rol: 'VISITANTE',
                        estado: formEstado,
                        tipoSangre: formTipoSangre,
                        foto: undefined
                      };

                      if (onGenerateVisitorQR) {
                        const now = new Date();
                        const newQR = {
                          id: Date.now().toString(),
                          visitante: person,
                          codigoQR: `QR-${Date.now()}-${person.documento}`,
                          fechaGeneracion: now,
                          fechaExpiracion: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                          estado: 'ACTIVO' as const,
                          generadoPor: user.id
                        };
                        onGenerateVisitorQR(newQR);
                        alert('QR generado (temporal)');
                      } else {
                        alert('No hay callback para generar QR configurado');
                      }
                    }}
                  >
                    Generar QR
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card adicional solicitado por el usuario: Registro de Visitantes y generación de QR */}
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
                    <Select 
                      value={visitorForm.tipoDocumento} 
                      onValueChange={(v: string) => setVisitorForm({...visitorForm, tipoDocumento: v as 'CC' | 'TI' | 'CE' | 'PASAPORTE'})}
                      required
                    >
                      <SelectTrigger id="vis-tipoDoc">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                        <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                        <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vis-tipoSangre">Tipo de Sangre</Label>
                    <Select 
                      value={visitorForm.tipoSangre} 
                      onValueChange={(v: string) => setVisitorForm({...visitorForm, tipoSangre: v as Person['tipoSangre']})}
                      required
                    >
                      <SelectTrigger id="vis-tipoSangre">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
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

        {/* Exportación de Reportes - HU8 */}
        <TabsContent value="reports" className="space-y-6">
          {/* Tarjetas estadísticas removidas (solicitado): se muestra solo el componente ReportExporter abajo */}

          {/* Componente de exportación de reportes */}
          <ReportExporter
            personas={personas}
            accessRecords={accessRecords}
            stats={stats}
            currentUser={user}
            onBulkPersonAdd={onBulkPersonAdd}
          />
        </TabsContent>

        {/* Configuración del Sistema */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>
                Ajustes generales del sistema de control de acceso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configuración de Acceso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Horario de Funcionamiento</h4>
                    <p className="text-sm text-muted-foreground">
                      Lunes a Viernes: 6:00 AM - 10:00 PM
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sábados: 7:00 AM - 2:00 PM
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Duración QR Visitantes</h4>
                    <p className="text-sm text-muted-foreground">
                      Validez: 24 horas desde generación
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Ubicación</h4>
                    <p className="text-sm text-muted-foreground">
                      SENA - Centro de Formación
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entrada Principal
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Estado del Sistema</h4>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <p className="text-sm text-muted-foreground">
                        Operacional
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Información del Sistema</h3>
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="space-y-2 text-sm">
                    <p><strong>Versión:</strong> 1.0.0</p>
                    <p><strong>Última actualización:</strong> Octubre 2025</p>
                    <p><strong>Total de usuarios registrados:</strong> {personas.length}</p>
                    <p><strong>Total de accesos registrados:</strong> {accessRecords.length}</p>
                    <p><strong>Usuarios del sistema:</strong> {users.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
