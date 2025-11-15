import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Users, UserCheck, GraduationCap, Shield, Calendar, Clock } from 'lucide-react';
import { AccessStats, AccessRecord } from '../types';

interface DashboardProps {
  stats: AccessStats;
  recentAccess: AccessRecord[];
}

export function Dashboard({ stats, recentAccess }: DashboardProps) {
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

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
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
            Accesos Recientes
          </CardTitle>
          <CardDescription>
            Últimos registros de entrada y salida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAccess.length > 0 ? (
              recentAccess.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getRolIcon(record.persona.rol)}
                      <div>
                        <p className="font-medium">{record.persona.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.persona.documento} • {record.persona.rol}
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
                      <p>{formatTime(record.fechaHora)}</p>
                      <p className="text-muted-foreground">{formatDate(record.fechaHora)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No hay registros de acceso recientes
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}