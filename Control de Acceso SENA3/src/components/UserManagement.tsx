import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit, 
  Trash2, 
  Mail,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { User } from '../types';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onUserAdd: (user: Omit<User, 'id'>) => void;
  onUserUpdate: (user: User) => void;
  onUserDelete: (userId: string) => void;
}

export function UserManagement({ 
  users, 
  currentUser, 
  onUserAdd, 
  onUserUpdate, 
  onUserDelete 
}: UserManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'GUARDA' as 'GUARDA' | 'ADMINISTRADOR',
    password: ''
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingUser) {
        // Actualizar usuario existente (solo actualizamos en estado local por ahora)
        const updatedUser: User = {
          ...editingUser,
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol
        };
        onUserUpdate(updatedUser);
        toast.success('Usuario actualizado correctamente');
      } else {
        // Crear nuevo usuario localmente
        if (formData.password.length < 6) {
          toast.error('❌ Contraseña muy corta', {
            description: 'La contraseña debe tener al menos 6 caracteres',
            duration: 4000,
            className: 'bg-red-50 border-red-200 text-red-900'
          });
          setIsSubmitting(false);
          return;
        }

        // Verificar que el email no exista
        const emailExists = users.some(u => u.email === formData.email);
        if (emailExists) {
          toast.error('❌ Email ya registrado', {
            description: 'Ya existe un usuario con este email',
            duration: 4000,
            className: 'bg-red-50 border-red-200 text-red-900'
          });
          setIsSubmitting(false);
          return;
        }

        // Crear el usuario localmente
        const newUser: Omit<User, 'id'> = {
          usuario: formData.email.split('@')[0],
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          rol: formData.rol,
          estado: 'ACTIVO',
          fechaCreacion: new Date()
        };

        onUserAdd(newUser);
        
        toast.success('✅ Usuario creado exitosamente', {
          description: `${formData.nombre} puede iniciar sesión ahora`,
          duration: 5000,
          className: 'bg-green-50 border-green-200 text-green-900'
        });
      }

      // Limpiar formulario y cerrar dialog
      setFormData({
        nombre: '',
        email: '',
        rol: 'GUARDA',
        password: ''
      });
      setEditingUser(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error al procesar usuario:', error);
      toast.error(`❌ Error: ${(error as Error).message}`, {
        className: 'bg-red-50 border-red-200 text-red-900'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      password: ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      toast.error('❌ Acción no permitida', {
        description: 'No puedes eliminar tu propia cuenta',
        duration: 4000,
        className: 'bg-red-50 border-red-200 text-red-900'
      });
      return;
    }
    
    if (window.confirm(`¿Estás seguro de eliminar a ${userName}?`)) {
      onUserDelete(userId);
      toast.success('✅ Usuario eliminado', {
        description: `${userName} ha sido eliminado del sistema`,
        duration: 3000,
        className: 'bg-green-50 border-green-200 text-green-900'
      });
    }
  };

  const toggleUserStatus = (user: User) => {
    if (user.id === currentUser.id) {
      toast.error('❌ Acción no permitida', {
        description: 'No puedes desactivar tu propia cuenta',
        duration: 4000,
        className: 'bg-red-50 border-red-200 text-red-900'
      });
      return;
    }

    const updatedUser: User = {
      ...user,
      estado: user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
    };
    onUserUpdate(updatedUser);
    
    toast.success(`✅ Estado actualizado`, {
      description: `${user.nombre} ahora está ${updatedUser.estado.toLowerCase()}`,
      duration: 3000,
      className: 'bg-green-50 border-green-200 text-green-900'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">
            Administra guardas y administradores del sistema
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  nombre: '',
                  email: '',
                  rol: 'GUARDA',
                  password: ''
                });
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Modifica la información del usuario seleccionado'
                  : 'Ingresa los datos para crear un nuevo usuario del sistema'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@sena.edu.co"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="pl-9"
                    required
                    disabled={isSubmitting || !!editingUser}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  El usuario se generará automáticamente desde el email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rol">Rol del Usuario</Label>
                <select
                  id="rol"
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value as 'GUARDA' | 'ADMINISTRADOR'})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  disabled={isSubmitting}
                >
                  <option value="GUARDA">Guarda de Seguridad</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña Temporal</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Contraseña temporal. El usuario podrá cambiarla después.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (editingUser ? 'Actualizando...' : 'Creando...') : (editingUser ? 'Actualizar' : 'Crear Usuario')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.estado === 'ACTIVO').length}
            </div>
            <p className="text-xs text-muted-foreground">Con acceso habilitado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.rol === 'ADMINISTRADOR').length}
            </div>
            <p className="text-xs text-muted-foreground">Con permisos completos</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Lista de todos los guardas y administradores registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback>{getInitials(user.nombre)}</AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{user.nombre}</h3>
                        <Badge 
                          variant="secondary" 
                          className={user.rol === 'ADMINISTRADOR' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'}
                        >
                          <span className="flex items-center gap-1">
                            {user.rol === 'ADMINISTRADOR' ? (
                              <Shield className="h-3 w-3" />
                            ) : (
                              <Users className="h-3 w-3" />
                            )}
                            {user.rol}
                          </span>
                        </Badge>
                        {user.id === currentUser.id && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                            TÚ
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">Usuario:</span> {user.usuario}
                        </p>
                        <p>
                          <span className="font-medium">Email:</span> {user.email}
                        </p>
                        <p>
                          <span className="font-medium">Creado:</span> {formatDate(user.fechaCreacion)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserStatus(user)}
                      className={user.estado === 'ACTIVO' 
                        ? 'text-green-600 hover:text-green-800' 
                        : 'text-red-600 hover:text-red-800'}
                      disabled={user.id === currentUser.id}
                    >
                      {user.estado === 'ACTIVO' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(user.id, user.nombre)}
                      disabled={user.id === currentUser.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No hay usuarios registrados en el sistema</p>
                <p className="text-sm">Los usuarios se registran desde la pantalla de inicio de sesión o puedes crear uno nuevo aquí</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}