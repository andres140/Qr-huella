import React, { useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dashboard } from './Dashboard';
import { UserManagement } from './UserManagement';
import { ReportExporter } from './ReportExporter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { 
  BarChart3, 
  Users, 
  Settings, 
  FileText,
  Download,
  Calendar,
  Clock,
  Shield,
  UserCheck,
  QrCode,
  UserCog,
  RefreshCw,
  AlertCircle,
  GraduationCap
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
  onUserDelete
}: AdminViewProps) {
  
  const notifiedQRs = useRef<Set<string>>(new Set());

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
    const checkExpiredQRs = () => {
      const now = new Date();
      visitorQRs.forEach(qr => {
        if (qr.fechaExpiracion <= now && qr.estado === 'ACTIVO' && !notifiedQRs.current.has(qr.id)) {
          notifiedQRs.current.add(qr.id);
          toast.warning('⚠️ QR de Visitante Expirado', {
            description: `${qr.visitante.nombre} (${qr.visitante.documento}) - Expiró el ${formatDateTime(qr.fechaExpiracion)}`,
            duration: 7000,
          });
        }
      });
    };

    // Verificar inmediatamente
    checkExpiredQRs();

    // Verificar cada minuto
    const interval = setInterval(checkExpiredQRs, 60000);

    return () => clearInterval(interval);
  }, [visitorQRs]);

  // Monitorear nuevos visitantes
  useEffect(() => {
    const lastQRId = localStorage.getItem('lastVisitorQRNotified');
    
    if (visitorQRs.length > 0) {
      const latestQR = visitantesOrdenados[0];
      
      if (lastQRId !== latestQR.id) {
        localStorage.setItem('lastVisitorQRNotified', latestQR.id);
        
        // No notificar en la primera carga
        if (lastQRId !== null) {
          toast.success('✅ Nuevo Visitante Registrado', {
            description: `${latestQR.visitante.nombre} - QR válido hasta ${formatDateTime(latestQR.fechaExpiracion)}`,
            duration: 6000,
          });
        }
      }
    }
  }, [visitorQRs, visitantesOrdenados]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="visitors" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Visitantes
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reportes
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Completo */}
        <TabsContent value="dashboard" className="space-y-6">
          <Dashboard stats={stats} recentAccess={accessRecords} />
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
          <div className="grid grid-cols-1 gap-6">
            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Visitantes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {personas.filter(p => p.rol === 'VISITANTE').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registrados en el sistema
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">QRs Activos</CardTitle>
                  <QrCode className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {visitorQRs.filter(qr => qr.estado === 'ACTIVO' && qr.fechaExpiracion > new Date()).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Válidos actualmente
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visitantes Dentro</CardTitle>
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.visitantesDentro}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    En instalaciones ahora
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Visitantes Registrados Actualizada en Tiempo Real */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                      Visitantes y QRs Recientes
                    </CardTitle>
                    <CardDescription>
                      Actualizado en tiempo real • Últimos primero ({visitantesOrdenados.length} QRs generados)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visitantesOrdenados.length > 0 ? (
                    visitantesOrdenados.slice(0, 15).map((qr) => {
                      const now = new Date();
                      const isActive = qr.estado === 'ACTIVO' && qr.fechaExpiracion > now;
                      const isExpiringSoon = qr.fechaExpiracion.getTime() - now.getTime() < 2 * 60 * 60 * 1000; // Menos de 2 horas
                      
                      return (
                        <div 
                          key={qr.id} 
                          className={`p-4 border rounded-lg ${
                            isActive 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium">{qr.visitante.nombre}</p>
                                <Badge className={
                                  isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }>
                                  {isActive ? 'ACTIVO' : 'EXPIRADO'}
                                </Badge>
                                {isActive && isExpiringSoon && (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Expira pronto
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <p>
                                  <strong>Documento:</strong> {qr.visitante.tipoDocumento} {qr.visitante.documento}
                                </p>
                                <p>
                                  <strong>Tipo de Sangre:</strong> {qr.visitante.tipoSangre}
                                </p>
                                <p>
                                  <strong>Generado:</strong> {formatDateTime(qr.fechaGeneracion)}
                                </p>
                                <p className={isActive && isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                                  <strong>{isActive ? 'Vence:' : 'Expiró:'}</strong> {formatDateTime(qr.fechaExpiracion)}
                                </p>
                              </div>
                              
                              <p className="text-xs text-muted-foreground mt-2">
                                <strong>Código QR:</strong> {qr.codigoQR}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <QrCode className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No hay visitantes registrados aún</p>
                      <p className="text-sm">Los guardas pueden registrar visitantes desde su panel</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Exportación de Reportes - HU8 */}
        <TabsContent value="reports" className="space-y-6">
          {/* Tarjetas estadísticas sincronizadas con Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
