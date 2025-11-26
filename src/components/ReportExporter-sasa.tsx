import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  BarChart3,
  Clock,
  CheckCircle,
  Upload,
  X,
  FileSpreadsheet,
  File
} from 'lucide-react';
import { Person, AccessRecord, AccessStats, User } from '../types';

interface ReportExporterProps {
  personas: Person[];
  accessRecords: AccessRecord[];
  stats: AccessStats;
  currentUser: User;
  onBulkPersonAdd: (persons: Omit<Person, 'id'>[]) => number;
}

export function ReportExporter({ 
  personas, 
  accessRecords, 
  stats, 
  currentUser,
  onBulkPersonAdd
}: ReportExporterProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [juiciosData, setJuiciosData] = useState<Array<{
    ficha: string;
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    apellido: string;
    estado: string;
  }>>([]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (fileExtension === 'csv') {
        // Procesar archivo CSV
        const text = await file.text();
        const lines = text.split(/[\n\r]+/).filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('❌ Archivo Vacío', {
            description: 'El archivo CSV no contiene datos',
            duration: 4000,
          });
          setUploadedFileName('');
          return;
        }
        
        const headerLine = lines[0];
        const headers = headerLine.split(/[,;\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        console.log('Columnas encontradas en CSV:', headers);
        
        const findColumnIndex = (patterns: string[]) => {
          return headers.findIndex(h => {
            const headerNorm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return patterns.some(pattern => {
              const regex = new RegExp(pattern, 'i');
              return regex.test(headerNorm);
            });
          });
        };
        
        const fichaIdx = findColumnIndex(['ficha', '^ficha$', 'numero.*ficha', 'nro.*ficha']);
        const tipoDocIdx = findColumnIndex(['tipo.*documento', 'tipo.*doc', 'tipodoc', 'tipo.*identific']);
        const numDocIdx = findColumnIndex(['numero.*documento', 'num.*documento', 'documento', 'identificacion', 'cedula', 'nro.*doc', 'n.*doc']);
        const nombreIdx = findColumnIndex(['^nombre$', '^nombres$', 'primer.*nombre']);
        const apellidoIdx = findColumnIndex(['apellido', 'apellidos', 'primer.*apellido']);
        const estadoIdx = findColumnIndex(['^estado$', 'estado.*aprendiz']);
        
        if (numDocIdx === -1) {
          toast.error('❌ Columna No Encontrada', {
            description: 'No se encontró la columna de Número de Documento',
            duration: 4000,
          });
          setUploadedFileName('');
          return;
        }
        
        const data: typeof juiciosData = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(/[,;\t]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
          
          if (values.length > 1 && values[numDocIdx] && values[numDocIdx].trim()) {
            data.push({
              ficha: fichaIdx >= 0 && values[fichaIdx] ? values[fichaIdx].trim() : 'N/A',
              tipoDocumento: tipoDocIdx >= 0 && values[tipoDocIdx] ? values[tipoDocIdx].trim() : 'CC',
              numeroDocumento: values[numDocIdx].trim(),
              nombre: nombreIdx >= 0 && values[nombreIdx] ? values[nombreIdx].trim() : '',
              apellido: apellidoIdx >= 0 && values[apellidoIdx] ? values[apellidoIdx].trim() : '',
              estado: estadoIdx >= 0 && values[estadoIdx] ? values[estadoIdx].trim() : 'EN FORMACION'
            });
          }
        }
        
        const uniqueData = Array.from(
          new Map(data.map(item => [item.numeroDocumento, item])).values()
        );
        
        setJuiciosData(uniqueData);
        
        // Guardar personas en la base de datos automáticamente
        const personasToAdd: Omit<Person, 'id'>[] = uniqueData.map(dato => ({
          nombre: dato.nombre,
          apellido: dato.apellido,
          documento: dato.numeroDocumento,
          tipoDocumento: dato.tipoDocumento as 'CC' | 'TI' | 'CE' | 'PASAPORTE',
          ficha: dato.ficha,
          rol: 'ESTUDIANTE' as const,
          estado: dato.estado as any || 'EN FORMACION',
          tipoSangre: 'O+' as const, // Por defecto, se puede actualizar manualmente después
        }));
        
        const addedCount = onBulkPersonAdd(personasToAdd);
        
        toast.success('✅ Archivo CSV Procesado y Guardado', {
          description: `${uniqueData.length} registros cargados, ${addedCount} nuevos guardados en BD`,
          duration: 6000,
        });
        
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
        
        console.log('Primeras 15 filas del Excel:', rawData.slice(0, 15));
        
        let fichaGlobal = 'N/A';
        for (let i = 0; i < Math.min(15, rawData.length); i++) {
          const row = rawData[i];
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j]).toLowerCase();
            if (cell.includes('ficha') && (cell.includes('caracterizacion') || cell.includes('caracterización'))) {
              if (j + 1 < row.length && row[j + 1]) {
                fichaGlobal = String(row[j + 1]).trim();
                console.log('Ficha encontrada en metadata:', fichaGlobal);
                break;
              }
            }
          }
        }
        
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          const rowStr = row.join('|').toLowerCase();
          if (rowStr.includes('tipo') && rowStr.includes('documento') && rowStr.includes('nombre')) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          toast.error('❌ Error de Formato', {
            description: 'No se encontró la fila de encabezados en el archivo',
            duration: 4000,
          });
          setUploadedFileName('');
          return;
        }
        
        const headers = rawData[headerRowIndex].map(h => String(h).trim());
        
        const findColumnIndex = (patterns: string[]) => {
          return headers.findIndex(h => {
            const headerNorm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return patterns.some(pattern => {
              const regex = new RegExp(pattern, 'i');
              return regex.test(headerNorm);
            });
          });
        };
        
        const tipoDocIdx = findColumnIndex(['tipo.*documento', 'tipo.*doc', 'tipodoc']);
        const numDocIdx = findColumnIndex(['numero.*documento', 'num.*documento', '^documento$', 'nro.*doc']);
        const nombreIdx = findColumnIndex(['^nombre$', '^nombres$']);
        const apellidoIdx = findColumnIndex(['apellido', 'apellidos']);
        const estadoIdx = findColumnIndex(['^estado$']);
        
        if (numDocIdx === -1) {
          toast.error('❌ Columna No Encontrada', {
            description: 'No se encontró la columna de Número de Documento',
            duration: 4000,
          });
          setUploadedFileName('');
          return;
        }
        
        const processedData: typeof juiciosData = [];
        
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          
          if (!row || row.length === 0) continue;
          
          const numDoc = row[numDocIdx];
          
          if (numDoc && String(numDoc).trim() && String(numDoc).trim() !== '') {
            processedData.push({
              ficha: fichaGlobal,
              tipoDocumento: tipoDocIdx >= 0 && row[tipoDocIdx] ? String(row[tipoDocIdx]).trim() : 'CC',
              numeroDocumento: String(numDoc).trim(),
              nombre: nombreIdx >= 0 && row[nombreIdx] ? String(row[nombreIdx]).trim() : '',
              apellido: apellidoIdx >= 0 && row[apellidoIdx] ? String(row[apellidoIdx]).trim() : '',
              estado: estadoIdx >= 0 && row[estadoIdx] ? String(row[estadoIdx]).trim() : 'EN FORMACION'
            });
          }
        }
        
        const uniqueData = Array.from(
          new Map(processedData.map(item => [item.numeroDocumento, item])).values()
        );
        
        if (uniqueData.length === 0) {
          toast.error('❌ Sin Datos', {
            description: 'No se pudieron extraer datos del archivo',
            duration: 4000,
          });
          setUploadedFileName('');
          return;
        }
        
        setJuiciosData(uniqueData);
        
        // Guardar personas en la base de datos automáticamente
        const personasToAdd: Omit<Person, 'id'>[] = uniqueData.map(dato => ({
          nombre: dato.nombre,
          apellido: dato.apellido,
          documento: dato.numeroDocumento,
          tipoDocumento: dato.tipoDocumento as 'CC' | 'TI' | 'CE' | 'PASAPORTE',
          ficha: dato.ficha,
          rol: 'ESTUDIANTE' as const,
          estado: dato.estado as any || 'EN FORMACION',
          tipoSangre: 'O+' as const, // Por defecto, se puede actualizar manualmente después
        }));
        
        const addedCount = onBulkPersonAdd(personasToAdd);
        
        toast.success('✅ Archivo Excel Procesado y Guardado', {
          description: `${uniqueData.length} registros cargados, ${addedCount} nuevos guardados en BD (Ficha: ${fichaGlobal})`,
          duration: 6000,
        });
        
      } else {
        toast.error('❌ Formato No Soportado', {
          description: 'Use archivos CSV o Excel (.xlsx, .xls)',
          duration: 4000,
        });
        setUploadedFileName('');
      }
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      toast.error('❌ Error de Procesamiento', {
        description: (error as Error).message,
        duration: 5000,
      });
      setUploadedFileName('');
      setJuiciosData([]);
    }

    event.target.value = '';
  };

  const clearUploadedFile = () => {
    setUploadedFileName('');
    setJuiciosData([]);
    toast.info('ℹ️ Archivo Eliminado', {
      description: 'Los datos cargados han sido removidos',
      duration: 3000,
    });
  };

  const generateReport = async (tipo: string, formato: 'PDF' | 'Excel') => {
    const reportId = `${tipo}_${formato}_${Date.now()}`;
    setIsGenerating(reportId);

    toast.info('⏳ Generando Reporte', {
      description: `Preparando ${tipo} en formato ${formato}...`,
      duration: 3000,
    });

    setTimeout(() => {
      setIsGenerating(null);
      
      let contenido = '';
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      if (tipo === 'juicios-evaluativos') {
        const datosReporte = juiciosData.length > 0 
          ? juiciosData 
          : personas
              .filter(p => p.rol === 'ESTUDIANTE')
              .map(e => ({
                ficha: e.ficha || 'N/A',
                tipoDocumento: e.tipoDocumento,
                numeroDocumento: e.documento,
                nombre: e.nombre,
                apellido: e.apellido || '',
                estado: e.estado
              }));
        
        const datosUnicos = Array.from(
          new Map(datosReporte.map(item => [item.numeroDocumento, item])).values()
        );
        
        if (formato === 'Excel') {
          contenido = 'REPORTE DE JUICIOS EVALUATIVOS\n';
          contenido += `Generado el: ${formatDate(now)}\n`;
          contenido += `Total de Aprendices: ${datosUnicos.length}\n\n`;
          contenido += 'Ficha,Tipo Documento,Número Documento,Nombre,Apellido,Estado\n';
          datosUnicos.forEach(dato => {
            contenido += `"${dato.ficha}","${dato.tipoDocumento}","${dato.numeroDocumento}","${dato.nombre}","${dato.apellido}","${dato.estado}"\n`;
          });
        } else {
          contenido = `╔════════════════════════════════════════════════════════════════╗\n`;
          contenido += `║         SENA - REPORTE DE JUICIOS EVALUATIVOS                 ║\n`;
          contenido += `╚════════════════════════════════════════════════════════════════╝\n\n`;
          contenido += `Fecha de Generación: ${formatDate(now)}\n`;
          contenido += `Generado por: ${currentUser.nombre}\n`;
          contenido += `Total de Aprendices: ${datosUnicos.length}\n\n`;
          contenido += `${'─'.repeat(100)}\n`;
          contenido += `FICHA    | TIPO DOC | NÚMERO DOC  | NOMBRE                    | APELLIDO                 | ESTADO\n`;
          contenido += `${'─'.repeat(100)}\n`;
          datosUnicos.forEach(dato => {
            contenido += `${dato.ficha.padEnd(8)} | ${dato.tipoDocumento.padEnd(8)} | ${dato.numeroDocumento.padEnd(11)} | ${dato.nombre.padEnd(25).substring(0, 25)} | ${dato.apellido.padEnd(24).substring(0, 24)} | ${dato.estado}\n`;
          });
          contenido += `${'─'.repeat(100)}\n\n`;
          contenido += `Fin del reporte\n`;
        }
      } else if (tipo === 'accesos-dia') {
        const accesosDia = accessRecords.filter(r => {
          const recordDate = r.timestamp || r.fechaHora || new Date(0);
          return recordDate.toDateString() === now.toDateString();
        });
        
        if (formato === 'Excel') {
          contenido = 'REPORTE DE ACCESOS DEL DÍA\n';
          contenido += `Fecha: ${formatDate(now)}\n`;
          contenido += `Total de Accesos: ${accesosDia.length}\n\n`;
          contenido += 'Hora,Tipo,Nombre,Documento,Rol,Ubicación\n';
          accesosDia.forEach(acc => {
            const ts = acc.timestamp || acc.fechaHora || new Date();
            contenido += `"${formatDate(ts)}","${acc.tipo}","${acc.persona.nombre}","${acc.persona.documento}","${acc.persona.rol === 'ESTUDIANTE' ? 'APRENDIZ' : acc.persona.rol}","${acc.ubicacion}"\n`;
          });
        } else {
          contenido = `╔════════════════════════════════════════════════════════════════╗\n`;
          contenido += `║         SENA - REPORTE DE ACCESOS DEL DÍA                     ║\n`;
          contenido += `╚════════════════════════════════════════════════════════════════╝\n\n`;
          contenido += `Fecha: ${formatDate(now)}\n`;
          contenido += `Total de Accesos: ${accesosDia.length}\n\n`;
          contenido += `${'─'.repeat(100)}\n`;
          contenido += `HORA          | TIPO    | NOMBRE                 | DOCUMENTO   | ROL\n`;
          contenido += `${'─'.repeat(100)}\n`;
          accesosDia.forEach(acc => {
            const ts = acc.timestamp || acc.fechaHora || new Date();
            contenido += `${formatDate(ts).padEnd(13)} | ${acc.tipo.padEnd(7)} | ${acc.persona.nombre.padEnd(22).substring(0, 22)} | ${acc.persona.documento.padEnd(11)} | ${(acc.persona.rol === 'ESTUDIANTE' ? 'APRENDIZ' : acc.persona.rol)}\n`;
          });
          contenido += `${'─'.repeat(100)}\n`;
        }
      } else if (tipo === 'personas-dentro') {
        const personasDentro = accessRecords
          .filter(r => r.tipo === 'ENTRADA')
          .filter(r => !accessRecords.find(r2 => r2.personaId === r.personaId && r2.tipo === 'SALIDA' && (r2.timestamp || r2.fechaHora || new Date(0)) > (r.timestamp || r.fechaHora || new Date(0))))
          .map(r => r.persona);
        
        if (formato === 'Excel') {
          contenido = 'REPORTE DE PERSONAS DENTRO DE LAS INSTALACIONES\n';
          contenido += `Fecha y Hora: ${formatDate(now)}\n`;
          contenido += `Total Dentro: ${personasDentro.length}\n\n`;
          contenido += 'Nombre,Documento,Rol,Tipo Sangre,Estado\n';
          personasDentro.forEach(p => {
            contenido += `"${p.nombre}","${p.documento}","${p.rol === 'ESTUDIANTE' ? 'APRENDIZ' : p.rol}","${p.tipoSangre}","${p.estado}"\n`;
          });
        } else {
          contenido = `╔════════════════════════════════════════════════════════════════╗\n`;
          contenido += `║    SENA - PERSONAS DENTRO DE LAS INSTALACIONES                ║\n`;
          contenido += `╚════════════════════════════════════════════════════════════════╝\n\n`;
          contenido += `Fecha y Hora: ${formatDate(now)}\n`;
          contenido += `Total Dentro: ${personasDentro.length}\n\n`;
          contenido += `${'─'.repeat(90)}\n`;
          contenido += `NOMBRE                    | DOCUMENTO   | ROL              | TIPO SANGRE\n`;
          contenido += `${'─'.repeat(90)}\n`;
          personasDentro.forEach(p => {
            contenido += `${p.nombre.padEnd(25).substring(0, 25)} | ${p.documento.padEnd(11)} | ${(p.rol === 'ESTUDIANTE' ? 'APRENDIZ' : p.rol).padEnd(16)} | ${p.tipoSangre}\n`;
          });
          contenido += `${'─'.repeat(90)}\n`;
        }
      } else if (tipo === 'visitantes') {
        const visitantes = personas.filter(p => p.rol === 'VISITANTE');
        
        if (formato === 'Excel') {
          contenido = 'REPORTE DE VISITANTES\n';
          contenido += `Generado el: ${formatDate(now)}\n`;
          contenido += `Total de Visitantes: ${visitantes.length}\n\n`;
          contenido += 'Nombre,Documento,Tipo Sangre,Estado\n';
          visitantes.forEach(v => {
            contenido += `"${v.nombre}","${v.documento}","${v.tipoSangre}","${v.estado}"\n`;
          });
        } else {
          contenido = `╔════════════════════════════════════════════════════════════════╗\n`;
          contenido += `║         SENA - REPORTE DE VISITANTES                          ║\n`;
          contenido += `╚════════════════════════════════════════════════════════════════╝\n\n`;
          contenido += `Fecha: ${formatDate(now)}\n`;
          contenido += `Total: ${visitantes.length}\n\n`;
          contenido += `${'─'.repeat(80)}\n`;
          contenido += `NOMBRE                    | DOCUMENTO   | TIPO SANGRE | ESTADO\n`;
          contenido += `${'─'.repeat(80)}\n`;
          visitantes.forEach(v => {
            contenido += `${v.nombre.padEnd(25).substring(0, 25)} | ${v.documento.padEnd(11)} | ${v.tipoSangre.padEnd(11)} | ${v.estado}\n`;
          });
          contenido += `${'─'.repeat(80)}\n`;
        }
      } else if (tipo === 'estadisticas-uso') {
        if (formato === 'Excel') {
          contenido = 'REPORTE DE ESTADÍSTICAS DE USO\n';
          contenido += `Generado el: ${formatDate(now)}\n\n`;
          contenido += 'Métrica,Valor\n';
          contenido += `"Total Personas Dentro","${stats.totalPersonasDentro}"\n`;
          contenido += `"Accesos del Día","${stats.accesosDia}"\n`;
          contenido += `"Aprendices Dentro","${stats.estudiantesDentro}"\n`;
          contenido += `"Instructores Dentro","${stats.instructoresDentro}"\n`;
          contenido += `"Administrativos Dentro","${stats.administrativosDentro}"\n`;
          contenido += `"Visitantes Dentro","${stats.visitantesDentro}"\n`;
          contenido += `"Total de Personas Registradas","${personas.length}"\n`;
          contenido += `"Total de Accesos Históricos","${accessRecords.length}"\n`;
        } else {
          contenido = `╔════════════════════════════════════════════════════════════════╗\n`;
          contenido += `║         SENA - ESTADÍSTICAS DE USO DEL SISTEMA                ║\n`;
          contenido += `╚════════════════════════════════════════════════════════════════╝\n\n`;
          contenido += `Fecha de Generación: ${formatDate(now)}\n\n`;
          contenido += `ESTADÍSTICAS ACTUALES:\n`;
          contenido += `${'─'.repeat(60)}\n`;
          contenido += `Personas Dentro:           ${stats.totalPersonasDentro}\n`;
          contenido += `Accesos del Día:           ${stats.accesosDia}\n`;
          contenido += `Aprendices Dentro:         ${stats.estudiantesDentro}\n`;
          contenido += `Instructores Dentro:       ${stats.instructoresDentro}\n`;
          contenido += `Administrativos Dentro:    ${stats.administrativosDentro}\n`;
          contenido += `Visitantes Dentro:         ${stats.visitantesDentro}\n\n`;
          contenido += `ESTADÍSTICAS GENERALES:\n`;
          contenido += `${'─'.repeat(60)}\n`;
          contenido += `Total Personas Registradas:  ${personas.length}\n`;
          contenido += `Total Accesos Históricos:    ${accessRecords.length}\n`;
          contenido += `${'─'.repeat(60)}\n`;
        }
      } else {
        contenido = `Reporte ${tipo} - Generado el ${formatDate(now)}`;
      }
      
      const mimeType = formato === 'PDF' ? 'application/pdf;charset=utf-8' : 'text/csv;charset=utf-8';
      const extension = formato === 'PDF' ? 'txt' : 'csv';
      const blob = new Blob(['\uFEFF' + contenido], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SENA_${tipo}_${today}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('✅ Reporte Generado', {
        description: `${tipo} descargado exitosamente en formato ${formato}`,
        duration: 5000,
      });
    }, 2000);
  };

  const reportTypes = [
    {
      id: 'juicios-evaluativos',
      nombre: 'Juicios Evaluativos',
      descripcion: 'Reporte de aprendices para juicios evaluativos',
      icon: FileText
    },
    {
      id: 'accesos-dia',
      nombre: 'Accesos del Día',
      descripcion: 'Todos los accesos registrados hoy',
      icon: Calendar
    },
    {
      id: 'personas-dentro',
      nombre: 'Personas Dentro',
      descripcion: 'Listado de personas actualmente en la institución',
      icon: Users
    },
    {
      id: 'estadisticas-uso',
      nombre: 'Estadísticas de Uso',
      descripcion: 'Métricas y análisis de acceso por tipo de usuario',
      icon: BarChart3
    },
    {
      id: 'visitantes',
      nombre: 'Registro de Visitantes',
      descripcion: 'Historial completo de visitantes',
      icon: FileText
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Exportación de Reportes</h2>
        <p className="text-muted-foreground">
          Genera reportes actualizados en tiempo real
        </p>
      </div>

      {/* Carga de archivo para Juicios Evaluativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cargar Datos de Juicios Evaluativos
          </CardTitle>
          <CardDescription>
            Cargue un archivo Excel o CSV con los datos de aprendices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="upload-juicios">
              Seleccionar Archivo
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="upload-juicios"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('upload-juicios')?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadedFileName ? 'Cambiar archivo' : 'Seleccionar archivo'}
              </Button>
              {uploadedFileName && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearUploadedFile}
                  title="Eliminar archivo"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {uploadedFileName && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-green-800 font-medium">{uploadedFileName}</p>
                    <p className="text-xs text-green-700">{juiciosData.length} registros únicos cargados</p>
                  </div>
                </div>
                
                {juiciosData.length > 0 && (
                  <div className="border rounded-md p-3 bg-gray-50 max-h-48 overflow-auto">
                    <p className="text-sm font-medium mb-2">Vista previa (primeros 5 registros):</p>
                    <div className="space-y-1 text-xs font-mono">
                      {juiciosData.slice(0, 5).map((dato, idx) => (
                        <div key={idx} className="p-2 bg-white border rounded">
                          <span className="font-semibold">Ficha:</span> {dato.ficha} | 
                          <span className="font-semibold"> Doc:</span> {dato.tipoDocumento} {dato.numeroDocumento} | 
                          <span className="font-semibold"> Nombre:</span> {dato.nombre} {dato.apellido} | 
                          <span className="font-semibold"> Estado:</span> {dato.estado}
                        </div>
                      ))}
                      {juiciosData.length > 5 && (
                        <p className="text-muted-foreground text-center pt-1">
                          ... y {juiciosData.length - 5} registros más
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800 font-medium mb-1">
                📋 Columnas del archivo:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4">
                <li>• Ficha - Tipo Documento - Número Documento</li>
                <li>• Nombre - Apellido - Estado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de descarga de datos cargados */}
      {juiciosData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Descargar Datos Cargados
            </CardTitle>
            <CardDescription>
              Descargue los datos cargados en formato PDF o Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  const now = new Date();
                  let contenido = `╔════════════════════════════════════════════════════════════════╗\n`;
                  contenido += `║         SENA - REPORTE DE JUICIOS EVALUATIVOS                 ║\n`;
                  contenido += `╚════════════════════════════════════════════════════════════════╝\n\n`;
                  contenido += `Fecha de Generación: ${formatDate(now)}\n`;
                  contenido += `Generado por: ${currentUser.nombre}\n`;
                  contenido += `Total de Aprendices: ${juiciosData.length}\n\n`;
                  contenido += `${'─'.repeat(100)}\n`;
                  contenido += `FICHA    | TIPO DOC | NÚMERO DOC  | NOMBRE                    | APELLIDO                 | ESTADO\n`;
                  contenido += `${'─'.repeat(100)}\n`;
                  juiciosData.forEach(dato => {
                    contenido += `${dato.ficha.padEnd(8)} | ${dato.tipoDocumento.padEnd(8)} | ${dato.numeroDocumento.padEnd(11)} | ${dato.nombre.padEnd(25).substring(0, 25)} | ${dato.apellido.padEnd(24).substring(0, 24)} | ${dato.estado}\n`;
                  });
                  contenido += `${'─'.repeat(100)}\n\n`;
                  contenido += `Fin del reporte\n`;
                  
                  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `SENA_Juicios_Evaluativos_${now.toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  toast.success('✅ Reporte PDF Descargado', {
                    description: 'El archivo se ha descargado exitosamente',
                    duration: 3000,
                  });
                }}
                className="flex-1"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
              <Button
                onClick={() => {
                  const now = new Date();
                  let contenido = 'REPORTE DE JUICIOS EVALUATIVOS\n';
                  contenido += `Generado el: ${formatDate(now)}\n`;
                  contenido += `Total de Aprendices: ${juiciosData.length}\n\n`;
                  contenido += 'Ficha,Tipo Documento,Número Documento,Nombre,Apellido,Estado\n';
                  juiciosData.forEach(dato => {
                    contenido += `"${dato.ficha}","${dato.tipoDocumento}","${dato.numeroDocumento}","${dato.nombre}","${dato.apellido}","${dato.estado}"\n`;
                  });
                  
                  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `SENA_Juicios_Evaluativos_${now.toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  toast.success('✅ Reporte Excel Descargado', {
                    description: 'El archivo CSV se ha descargado exitosamente',
                    duration: 3000,
                  });
                }}
                className="flex-1"
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Descargar Excel (CSV)
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Total de registros disponibles para descarga: <strong>{juiciosData.length}</strong></p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
