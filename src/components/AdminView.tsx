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
  Search,
  GraduationCap,
  Users,
  Calendar,
  Shield,
  Camera,
  X,
  Image as ImageIcon
} from 'lucide-react';

import { Person, AccessRecord, AccessStats, User, VisitorQR } from '../types';
import { aprendicesAPI } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

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
  onBulkPersonAdd: (persons: Omit<Person, 'id'>[]) => Promise<number>;
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
  
  // Estados para búsqueda de aprendices
  const [searchTerm, setSearchTerm] = useState('');
  const [searchEstado, setSearchEstado] = useState<string>('TODOS');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Estados para subir foto
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);
  const [selectedFotoFile, setSelectedFotoFile] = useState<{ aprendizId: string; file: File } | null>(null);

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
    documento: string;
    tipoDocumento: Person['tipoDocumento'];
    tipoSangre: Person['tipoSangre'];
    motivo: string;
  }>({
    nombre: '',
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
      apellido: '',
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
    setVisitorForm({ nombre: '', documento: '', tipoDocumento: 'CC', tipoSangre: 'O+', motivo: '' });
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

  // Función para buscar aprendices
  const handleSearchAprendices = async () => {
    if (!searchTerm.trim() && searchEstado === 'TODOS') {
      toast.warning('⚠️ Búsqueda Vacía', {
        description: 'Ingrese un término de búsqueda o seleccione un estado',
        duration: 4000,
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const params: { estado?: string; buscar?: string } = {};
      
      if (searchTerm.trim()) {
        params.buscar = searchTerm.trim();
      }
      
      if (searchEstado !== 'TODOS') {
        params.estado = searchEstado;
      }
      
      const response = await aprendicesAPI.getAll(params);
      
      if (response.success && response.data) {
        setSearchResults(response.data);
        toast.success('✅ Búsqueda Completada', {
          description: `Se encontraron ${response.data.length} aprendices`,
          duration: 3000,
        });
      } else {
        setSearchResults([]);
        toast.info('ℹ️ Sin Resultados', {
          description: 'No se encontraron aprendices con los criterios de búsqueda',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error al buscar aprendices:', error);
      toast.error('❌ Error en la Búsqueda', {
        description: 'No se pudo realizar la búsqueda. Intente nuevamente.',
        duration: 5000,
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchEstado('TODOS');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Manejar selección de archivo de foto
  const handleFotoSelect = (aprendizId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('❌ Tipo de Archivo Inválido', {
        description: 'Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)',
        duration: 4000,
      });
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('❌ Archivo Muy Grande', {
        description: 'El archivo no debe exceder 5MB',
        duration: 4000,
      });
      return;
    }

    setSelectedFotoFile({ aprendizId, file });
  };

  // Subir foto de aprendiz
  const handleUploadFoto = async (aprendizId: string) => {
    if (!selectedFotoFile || selectedFotoFile.aprendizId !== aprendizId) {
      toast.error('❌ Error', {
        description: 'Por favor seleccione un archivo primero',
        duration: 4000,
      });
      return;
    }

    setUploadingFoto(aprendizId);
    
    try {
      const response = await aprendicesAPI.uploadFoto(aprendizId, selectedFotoFile.file);
      
      if (response.success) {
        toast.success('✅ Foto Subida Exitosamente', {
          description: 'La foto se ha guardado en la base de datos',
          duration: 4000,
        });
        
        // Actualizar el resultado en la lista
        setSearchResults(prev => prev.map(a => 
          a.id === aprendizId ? { ...a, foto: response.data.foto } : a
        ));
        
        setSelectedFotoFile(null);
      } else {
        toast.error('❌ Error al Subir Foto', {
          description: response.message || 'No se pudo subir la foto',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error al subir foto:', error);
      toast.error('❌ Error al Subir Foto', {
        description: 'No se pudo conectar con el servidor',
        duration: 5000,
      });
    } finally {
      setUploadingFoto(null);
    }
  };

  // Eliminar foto de aprendiz
  const handleDeleteFoto = async (aprendizId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar la foto de este aprendiz?')) {
      return;
    }

    try {
      const response = await aprendicesAPI.deleteFoto(aprendizId);
      
      if (response.success) {
        toast.success('✅ Foto Eliminada', {
          description: 'La foto se ha eliminado exitosamente',
          duration: 4000,
        });
        
        // Actualizar el resultado en la lista
        setSearchResults(prev => prev.map(a => 
          a.id === aprendizId ? { ...a, foto: null } : a
        ));
      } else {
        toast.error('❌ Error al Eliminar Foto', {
          description: response.message || 'No se pudo eliminar la foto',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error al eliminar foto:', error);
      toast.error('❌ Error al Eliminar Foto', {
        description: 'No se pudo conectar con el servidor',
        duration: 5000,
      });
    }
  };

  // Obtener URL de la foto
  const getFotoUrl = (foto: string | null | undefined) => {
    if (!foto) return null;
    // Si ya es una URL completa, retornarla
    if (foto.startsWith('http')) return foto;
    // Si es una ruta relativa, construir la URL completa
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const baseUrl = API_URL.replace('/api', '');
    // Asegurar que no haya doble barra
    const cleanFoto = foto.startsWith('/') ? foto.substring(1) : foto;
    return `${baseUrl}/${cleanFoto}`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex w-full items-center gap-2 overflow-x-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="aprendices" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Búsqueda Aprendices
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

        {/* Dashboard con Estadísticas */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Tarjetas estadísticas */}
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

          {/* Estadísticas adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.visitantesDentro}</div>
                <p className="text-xs text-muted-foreground">
                  Actualmente dentro
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personas Registradas</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{personas.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total en el sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Accesos</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accessRecords.length}</div>
                <p className="text-xs text-muted-foreground">
                  Histórico completo
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Accesos recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Accesos Recientes
              </CardTitle>
              <CardDescription>
                Últimos registros de entrada y salida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessRecords.length > 0 ? (
                  accessRecords.slice(0, 15).map((record) => {
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

                    let timestamp: Date | string | null = null;
                    if (record.timestamp) {
                      timestamp = record.timestamp;
                    } else if (record.fechaHora) {
                      timestamp = record.fechaHora;
                    } else if ((record as any).fecha_entrada) {
                      timestamp = (record as any).fecha_entrada;
                    } else if ((record as any).fecha_salida) {
                      timestamp = (record as any).fecha_salida;
                    } else {
                      timestamp = new Date();
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
                            <p>{formatTime(timestamp as Date)}</p>
                            <p className="text-muted-foreground">{formatDate(timestamp as Date)}</p>
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

        {/* Búsqueda de Aprendices */}
        <TabsContent value="aprendices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Aprendices
              </CardTitle>
              <CardDescription>
                Busque aprendices por nombre, apellido, cédula o documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="search-term">Término de Búsqueda</Label>
                  <Input
                    id="search-term"
                    type="text"
                    placeholder="Nombre, apellido, cédula o documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchAprendices();
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="search-estado">Estado</Label>
                  <Select value={searchEstado} onValueChange={setSearchEstado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      <SelectItem value="ACTIVO">Activo</SelectItem>
                      <SelectItem value="INACTIVO">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSearchAprendices}
                  disabled={isSearching}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </Button>
                {hasSearched && (
                  <Button 
                    onClick={handleClearSearch}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resultados de búsqueda */}
          {hasSearched && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Resultados de Búsqueda
                  </span>
                  <Badge variant="outline">
                    {searchResults.length} encontrado{searchResults.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No se encontraron resultados</p>
                    <p className="text-sm">Intente con otros términos de búsqueda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Foto</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Apellido</TableHead>
                          <TableHead>Ficha</TableHead>
                          <TableHead>Programa</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((aprendiz) => {
                          const fotoUrl = getFotoUrl(aprendiz.foto);
                          const isUploading = uploadingFoto === aprendiz.id;
                          const hasSelectedFile = selectedFotoFile?.aprendizId === aprendiz.id;
                          
                          return (
                            <TableRow key={aprendiz.id}>
                              <TableCell>
                                <div className="flex items-center justify-center">
                                  {fotoUrl ? (
                                    <div className="relative group">
                                      <img 
                                        src={fotoUrl} 
                                        alt={`${aprendiz.nombre || aprendiz.nombres}`}
                                        className="w-16 h-16 object-cover rounded-full border-2 border-gray-200"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                      <div className="hidden w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-gray-400" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                                      <ImageIcon className="h-8 w-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {aprendiz.tipoDocumento} {aprendiz.documento}
                              </TableCell>
                              <TableCell className="font-medium">
                                {aprendiz.nombre || aprendiz.nombres}
                              </TableCell>
                              <TableCell>
                                {aprendiz.apellido || aprendiz.apellidos || '-'}
                              </TableCell>
                              <TableCell>
                                {aprendiz.ficha || '-'}
                              </TableCell>
                              <TableCell>
                                {aprendiz.programa || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={aprendiz.estado === 'ACTIVO' ? 'default' : 'secondary'}
                                >
                                  {aprendiz.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    className="hidden"
                                    id={`foto-${aprendiz.id}`}
                                    onChange={(e) => handleFotoSelect(aprendiz.id, e)}
                                    disabled={isUploading}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`foto-${aprendiz.id}`)?.click()}
                                    disabled={isUploading}
                                    className="flex items-center gap-1"
                                  >
                                    <Camera className="h-3 w-3" />
                                    {fotoUrl ? 'Cambiar' : 'Subir'}
                                  </Button>
                                  {hasSelectedFile && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleUploadFoto(aprendiz.id)}
                                      disabled={isUploading}
                                      className="flex items-center gap-1"
                                    >
                                      {isUploading ? 'Subiendo...' : 'Guardar'}
                                    </Button>
                                  )}
                                  {fotoUrl && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteFoto(aprendiz.id)}
                                      disabled={isUploading}
                                      className="flex items-center gap-1"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
                      onChange={(e) => setVisitorForm({...visitorForm, tipoDocumento: e.target.value as 'CC' | 'TI' | 'CE' | 'PASAPORTE'})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="TI">Tarjeta de Identidad</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vis-tipoSangre">Tipo de Sangre</Label>
                    <select
                      id="vis-tipoSangre"
                      value={visitorForm.tipoSangre}
                      onChange={(e) => setVisitorForm({...visitorForm, tipoSangre: e.target.value as Person['tipoSangre']})}
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
