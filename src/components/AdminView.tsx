import React, { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserManagement } from './UserManagement';
import { ReportExporter } from './ReportExporter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  FileText,
  Clock,
  UserCheck,
  UserCog,
  Search,
  GraduationCap,
  Users,
  Calendar,
  Shield,
  Camera,
  X,
  Image as ImageIcon,
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
}: AdminViewProps) {
  const notifiedQRs = useRef<Set<string>>(new Set());

  // Búsqueda de aprendices
  const [searchTerm, setSearchTerm] = useState('');
  const [searchEstado, setSearchEstado] = useState<string>('TODOS');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Subida de foto
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);
  const [selectedFotoFile, setSelectedFotoFile] = useState<{ aprendizId: string; file: File } | null>(null);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  // Alertas de visitantes (solo notificaciones, sin formularios en esta pantalla)
  const visitantesOrdenados = [...visitorQRs].sort(
    (a, b) => b.fechaGeneracion.getTime() - a.fechaGeneracion.getTime(),
  );

  useEffect(() => {
    const checkExpiredQRs = () => {
      const now = new Date();
      visitorQRs.forEach((qr) => {
        if (qr.fechaExpiracion <= now && qr.estado === 'ACTIVO' && !notifiedQRs.current.has(qr.id)) {
          notifiedQRs.current.add(qr.id);
          toast.warning('⚠️ QR de Visitante Expirado', {
            description: `${qr.visitante.nombre} (${qr.visitante.documento}) - Expiró el ${formatDateTime(
              qr.fechaExpiracion,
            )}`,
            duration: 7000,
          });
        }
      });
    };

    checkExpiredQRs();
    const interval = setInterval(checkExpiredQRs, 60000);
    return () => clearInterval(interval);
  }, [visitorQRs]);

  useEffect(() => {
    const lastQRId = localStorage.getItem('lastVisitorQRNotified');
    if (visitorQRs.length > 0) {
      const latestQR = visitantesOrdenados[0];
      if (lastQRId !== latestQR.id) {
        localStorage.setItem('lastVisitorQRNotified', latestQR.id);
        if (lastQRId !== null) {
          toast.success('✅ Nuevo Visitante Registrado', {
            description: `${latestQR.visitante.nombre} - QR válido hasta ${formatDateTime(
              latestQR.fechaExpiracion,
            )}`,
            duration: 6000,
          });
        }
      }
    }
  }, [visitorQRs, visitantesOrdenados]);

  // Buscar aprendices
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
      if (searchTerm.trim()) params.buscar = searchTerm.trim();
      if (searchEstado !== 'TODOS') params.estado = searchEstado;

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

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchEstado('TODOS');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Foto
  const handleFotoSelect = (aprendizId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('❌ Tipo de Archivo Inválido', {
        description: 'Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)',
        duration: 4000,
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('❌ Archivo Muy Grande', {
        description: 'El archivo no debe exceder 5MB',
        duration: 4000,
      });
      return;
    }

    setSelectedFotoFile({ aprendizId, file });
  };

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
        setSearchResults((prev) => prev.map((a) => (a.id === aprendizId ? { ...a, foto: response.data.foto } : a)));
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

  const handleDeleteFoto = async (aprendizId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar la foto de este aprendiz?')) return;

    try {
      const response = await aprendicesAPI.deleteFoto(aprendizId);
      if (response.success) {
        toast.success('✅ Foto Eliminada', {
          description: 'La foto se ha eliminado exitosamente',
          duration: 4000,
        });
        setSearchResults((prev) => prev.map((a) => (a.id === aprendizId ? { ...a, foto: null } : a)));
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

  const getFotoUrl = (foto: string | null | undefined) => {
    if (!foto) return null;
    if (foto.startsWith('http')) return foto;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const baseUrl = API_URL.replace('/api', '');
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
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Importación Masiva
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
                <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.estudiantesDentro}</div>
                <p className="text-xs text-muted-foreground">Actualmente dentro</p>
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
                <p className="text-xs text-muted-foreground">Instructores y administrativos</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Búsqueda de Aprendices */}
        <TabsContent value="aprendices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Aprendices
              </CardTitle>
              <CardDescription>Busque aprendices por nombre, apellido o documento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="search-term">Término de Búsqueda</Label>
                  <Input
                    id="search-term"
                    type="text"
                    placeholder="Nombre, apellido o documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchAprendices();
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
                <Button onClick={handleSearchAprendices} disabled={isSearching} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </Button>
                {hasSearched && (
                  <Button onClick={handleClearSearch} variant="outline" className="flex items-center gap-2">
                    Limpiar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

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
                        {searchResults.map((aprendiz: any) => {
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
                                        alt={aprendiz.nombre || aprendiz.nombres}
                                        className="w-16 h-16 object-cover rounded-full border-2 border-gray-200"
                                      />
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
                              <TableCell>{aprendiz.apellido || aprendiz.apellidos || '-'}</TableCell>
                              <TableCell>{aprendiz.ficha || '-'}</TableCell>
                              <TableCell>{aprendiz.programa || '-'}</TableCell>
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
                                    onClick={() =>
                                      document.getElementById(`foto-${aprendiz.id}`)?.click()
                                    }
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

        {/* Gestión de Usuarios */}
        <TabsContent value="users" className="space-y-6">
          <UserManagement
            users={users}
            currentUser={user}
            onUserAdd={onUserAdd}
            onUserUpdate={onUserUpdate}
            onUserDelete={onUserDelete}
          />
        </TabsContent>

        {/* Importación / Exportación de reportes */}
        <TabsContent value="reports" className="space-y-6">
          <ReportExporter
            personas={personas}
            accessRecords={accessRecords}
            stats={stats}
            currentUser={user}
            onBulkPersonAdd={onBulkPersonAdd}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


