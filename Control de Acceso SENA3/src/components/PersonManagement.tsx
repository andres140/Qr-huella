import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  GraduationCap, 
  Shield, 
  UserCheck,
  Filter
} from 'lucide-react';
import { Person } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface PersonManagementProps {
  personas: Person[];
  onPersonUpdate: (person: Person) => void;
  onPersonDelete: (personId: string) => void;
  onPersonAdd: (person: Omit<Person, 'id'>) => void;
}

export function PersonManagement({ 
  personas, 
  onPersonUpdate, 
  onPersonDelete, 
  onPersonAdd 
}: PersonManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  const filteredPersonas = personas.filter(person => {
    const matchesSearch = person.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.documento.includes(searchTerm);
    const matchesRole = filterRole === 'TODOS' || person.rol === filterRole;
    const matchesStatus = filterStatus === 'TODOS' || person.estado === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

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

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'ESTUDIANTE':
        return 'bg-blue-100 text-blue-800';
      case 'INSTRUCTOR':
        return 'bg-green-100 text-green-800';
      case 'ADMINISTRATIVO':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (nombre: string) => {
    return nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Personas
          </CardTitle>
          <CardDescription>
            Administrar personas autorizadas para el acceso al SENA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de búsqueda y filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los roles</SelectItem>
                <SelectItem value="ESTUDIANTE">Estudiantes</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructores</SelectItem>
                <SelectItem value="ADMINISTRATIVO">Administrativos</SelectItem>
                <SelectItem value="VISITANTE">Visitantes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="ACTIVO">Activos</SelectItem>
                <SelectItem value="INACTIVO">Inactivos</SelectItem>
                <SelectItem value="EN FORMACION">En Formación</SelectItem>
                <SelectItem value="APLAZADO">Aplazado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
                <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
                <SelectItem value="RETIRO VOLUNTARIO">Retiro Voluntario</SelectItem>
                <SelectItem value="POR CERTIFICAR">Por Certificar</SelectItem>
                <SelectItem value="CERTIFICADO">Certificado</SelectItem>
              </SelectContent>
            </Select>

            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Persona
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de personas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Personas Registradas ({filteredPersonas.length})</span>
            <Filter className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPersonas.length > 0 ? (
              filteredPersonas.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={person.foto} />
                      <AvatarFallback>{getInitials(person.nombre)}</AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{person.nombre}</h3>
                        <Badge 
                          variant="secondary" 
                          className={getRolColor(person.rol)}
                        >
                          <span className="flex items-center gap-1">
                            {getRolIcon(person.rol)}
                            {person.rol}
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">{person.tipoDocumento}:</span> {person.documento}
                        </p>
                        {person.programa && (
                          <p>
                            <span className="font-medium">Programa:</span> {person.programa}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Tipo de Sangre:</span> {person.tipoSangre}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={['ACTIVO', 'EN FORMACION', 'POR CERTIFICAR', 'CERTIFICADO'].includes(person.estado) ? 'default' : 'secondary'}
                      className={
                        ['ACTIVO', 'EN FORMACION'].includes(person.estado) 
                          ? 'bg-green-100 text-green-800' 
                          : ['POR CERTIFICAR', 'CERTIFICADO'].includes(person.estado)
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {person.estado}
                    </Badge>
                    
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron personas con los filtros aplicados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}