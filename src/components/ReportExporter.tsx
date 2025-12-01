import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
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
  File,
  GraduationCap
} from 'lucide-react';
import { accesosAPI } from '../services/api';
import { Person, AccessRecord, AccessStats, User } from '../types';

interface ReportExporterProps {
  personas: Person[];
  accessRecords: AccessRecord[];
  stats: AccessStats;
  currentUser: User;
  onBulkPersonAdd: (persons: Omit<Person, 'id'>[]) => Promise<number>;
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
    programa: string;
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    apellido: string;
    estado: string;
  }>>([]);
  
  // Estado para guardar los resultados de la carga masiva
  const [cargaMasivaResultados, setCargaMasivaResultados] = useState<{
    totalProcesados: number;
    totalHojas: number;
    exitosos: number;
    duplicadosEnArchivo: number;
    duplicadosEnBD: number;
    fallidos: number;
    errores?: Array<{ documento: string; error: string }>;
  } | null>(null);
  
  // Filtros de fecha para reportes
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '--/--/----';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '--/--/----';
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(dateObj);
    } catch (error) {
      return '--/--/----';
    }
  };

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return '--:--:--';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '--:--:--';
      return new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(dateObj);
    } catch (error) {
      return '--:--:--';
    }
  };

  const formatDateOnly = (date: Date | string | null | undefined) => {
    if (!date) return '--/--/----';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '--/--/----';
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
      return '--/--/----';
    }
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
        const programaIdx = findColumnIndex(['programa', '^programa$', 'nombre.*programa', 'programa.*formacion']);
        const tipoDocIdx = findColumnIndex(['tipo.*documento', 'tipo.*doc', 'tipodoc', 'tipo.*identific']);
        const numDocIdx = findColumnIndex(['numero.*documento', 'num.*documento', 'documento', 'identificacion', 'cedula', 'nro.*doc', 'n.*doc']);
        const nombreIdx = findColumnIndex(['^nombre$', '^nombres$', 'primer.*nombre']);
        const apellidoIdx = findColumnIndex(['apellido', 'apellidos', 'primer.*apellido']);
        const estadoIdx = findColumnIndex(['^estado$', 'estado.*aprendiz']);
        
        if (numDocIdx === -1) {
          toast.error('❌ Columna No Encontrada', {
            description: 'No se encontró la columna de Número de Documento. Busque columnas como: "Documento", "Número Documento", "Identificación", "Cédula"',
            duration: 6000,
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
              programa: programaIdx >= 0 && values[programaIdx] ? values[programaIdx].trim() : '',
              tipoDocumento: tipoDocIdx >= 0 && values[tipoDocIdx] ? values[tipoDocIdx].trim().toUpperCase() : 'CC',
              numeroDocumento: values[numDocIdx].trim(),
              nombre: nombreIdx >= 0 && values[nombreIdx] ? values[nombreIdx].trim() : '',
              apellido: apellidoIdx >= 0 && values[apellidoIdx] ? values[apellidoIdx].trim() : '',
              estado: estadoIdx >= 0 && values[estadoIdx] ? values[estadoIdx].trim().toUpperCase() : 'ACTIVO'
            });
          }
        }
        
        // Deduplicación mejorada: normalizar documentos antes de comparar
        const uniqueData = Array.from(
          new Map(
            data.map(item => {
              // Normalizar documento: solo números, sin espacios
              const docNormalizado = String(item.numeroDocumento).replace(/\D/g, '').trim();
              return [docNormalizado, item];
            })
          ).values()
        );
        
        setJuiciosData(uniqueData);
        
        // Guardar personas en la base de datos automáticamente
        const personasToAdd: Omit<Person, 'id'>[] = uniqueData.map(dato => ({
          nombre: dato.nombre || 'Aprendiz',
          apellido: dato.apellido || '',
          documento: dato.numeroDocumento,
          tipoDocumento: (dato.tipoDocumento || 'CC').toUpperCase() as 'CC' | 'TI' | 'CE' | 'PASAPORTE',
          ficha: dato.ficha || null,
          rol: 'ESTUDIANTE' as const,
          estado: (dato.estado || 'ACTIVO').toUpperCase() as any,
          tipoSangre: 'O+' as const, // Por defecto, se puede actualizar manualmente después
        }));
        
        const addedCount = await onBulkPersonAdd(personasToAdd);
        
        const duplicados = uniqueData.length - addedCount;
        const mensaje = duplicados > 0 
          ? `${uniqueData.length} registros procesados, ${addedCount} nuevos guardados, ${duplicados} duplicados omitidos`
          : `${uniqueData.length} registros procesados, ${addedCount} nuevos guardados en BD`;
        
        toast.success('✅ Archivo CSV Procesado', {
          description: mensaje,
          duration: 6000,
        });
        
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        const totalHojas = workbook.SheetNames.length;
        console.log(`📊 Total de hojas encontradas: ${totalHojas}`);
        console.log(`📋 Nombres de hojas:`, workbook.SheetNames);
        
        // Procesar TODAS las hojas del Excel
        const allProcessedData: typeof juiciosData = [];
        let hojasProcesadas = 0;
        let hojasConErrores = 0;
        
        for (let sheetIndex = 0; sheetIndex < workbook.SheetNames.length; sheetIndex++) {
          const sheetName = workbook.SheetNames[sheetIndex];
          console.log(`\n📄 [${sheetIndex + 1}/${totalHojas}] Procesando hoja: "${sheetName}"`);
          
          try {
            const sheet = workbook.Sheets[sheetName];
            
            if (!sheet) {
              console.log(`❌ Hoja "${sheetName}" no existe en el workbook, saltando...`);
              hojasConErrores++;
              continue;
            }
            
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
            
            if (!rawData || rawData.length === 0) {
              console.log(`⚠️ Hoja "${sheetName}" está vacía o no tiene datos, saltando...`);
              continue;
            }
            
            console.log(`📊 Hoja "${sheetName}": ${rawData.length} filas encontradas`);
        
            let fichaGlobal = 'N/A';
            let programaGlobal = '';
            // Buscar ficha y programa en las primeras filas (metadata) o en una columna específica
            // IMPORTANTE: Buscar más agresivamente en más filas
            for (let i = 0; i < Math.min(20, rawData.length); i++) {
              const row = rawData[i];
              for (let j = 0; j < row.length; j++) {
                const cell = String(row[j]).toLowerCase().trim();
                if (cell.includes('ficha') && fichaGlobal === 'N/A') {
                  // Si la celda siguiente tiene un valor, usarlo como ficha
                  if (j + 1 < row.length && row[j + 1] !== null && row[j + 1] !== undefined && String(row[j + 1]).trim() !== '') {
                    const fichaValue = String(row[j + 1]).trim();
                    // Validar que no sea 'N/A', 'null', etc.
                    if (fichaValue && fichaValue !== 'N/A' && fichaValue !== 'null' && fichaValue !== 'undefined') {
                      fichaGlobal = fichaValue;
                      console.log(`✅ Ficha encontrada en metadata de "${sheetName}" (fila ${i + 1}, columna ${j + 1}):`, fichaGlobal);
                    }
                  }
                }
                if (cell.includes('programa') && programaGlobal === '') {
                  // Si la celda siguiente tiene un valor, usarlo como programa
                  if (j + 1 < row.length && row[j + 1] !== null && row[j + 1] !== undefined && String(row[j + 1]).trim() !== '') {
                    const programaValue = String(row[j + 1]).trim();
                    if (programaValue && programaValue !== 'N/A' && programaValue !== 'null' && programaValue !== 'undefined') {
                      programaGlobal = programaValue;
                      console.log(`✅ Programa encontrado en metadata de "${sheetName}" (fila ${i + 1}, columna ${j + 1}):`, programaGlobal);
                    }
                  }
                }
              }
            }
        
        let headerRowIndex = -1;
        // Buscar fila de encabezado con diferentes criterios
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          const rowStr = row.join('|').toLowerCase();
          // Buscar filas que contengan palabras clave de encabezado
          const tieneTipoDoc = rowStr.includes('tipo') && (rowStr.includes('documento') || rowStr.includes('doc'));
          const tieneDocumento = rowStr.includes('documento') || rowStr.includes('cedula') || rowStr.includes('identificacion');
          const tieneNombre = rowStr.includes('nombre') || rowStr.includes('nombres');
          
          // Si tiene documento Y (tipo o nombre), probablemente es el encabezado
          if (tieneDocumento && (tieneTipoDoc || tieneNombre)) {
            headerRowIndex = i;
            console.log(`   ✅ Encabezado encontrado en fila ${i + 1} de "${sheetName}"`);
            break;
          }
        }
        
        // Si no se encontró con criterios estrictos, buscar cualquier fila que tenga "documento"
        if (headerRowIndex === -1) {
          for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;
            const rowStr = row.join('|').toLowerCase();
            if (rowStr.includes('documento') || rowStr.includes('cedula') || rowStr.includes('identificacion')) {
              headerRowIndex = i;
              console.log(`   ✅ Encabezado encontrado (criterio flexible) en fila ${i + 1} de "${sheetName}"`);
              break;
            }
          }
        }
        
        if (headerRowIndex === -1) {
          console.log(`⚠️ No se encontró encabezado en hoja "${sheetName}", intentando usar primera fila...`);
          // Intentar usar la primera fila como encabezado si tiene datos
          if (rawData.length > 0 && rawData[0].some(cell => String(cell).trim())) {
            headerRowIndex = 0;
            console.log(`   ✅ Usando primera fila como encabezado`);
          } else {
            console.log(`❌ Hoja "${sheetName}" no tiene formato válido, saltando...`);
            hojasConErrores++;
            continue;
          }
        }
        
        const headers = rawData[headerRowIndex].map(h => String(h).trim());
        
        const findColumnIndex = (patterns: string[]) => {
              // Buscar primero coincidencia exacta, luego parcial
              for (const pattern of patterns) {
              const regex = new RegExp(pattern, 'i');
                const exactMatch = headers.findIndex(h => {
                  const headerNorm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return regex.test(headerNorm);
            });
                if (exactMatch >= 0) {
                  return exactMatch;
                }
              }
              return -1;
        };
        
            const tipoDocIdx = findColumnIndex(['tipo.*documento', 'tipo.*doc', 'tipodoc', 'tipo.*identific']);
            // Mejorar detección de documento con más patrones y búsqueda manual
            let numDocIdx = findColumnIndex(['numero.*documento', 'num.*documento', '^documento$', 'nro.*doc', 'identificacion', 'cedula', 'cedula.*ciudadania', 'documento.*identidad']);
            
            // Si no se encontró con patrones, buscar manualmente con más variaciones
            if (numDocIdx === -1) {
              headers.forEach((h, idx) => {
                const headerLower = String(h).toLowerCase().trim();
                // Buscar más variaciones de documento
                if ((headerLower.includes('documento') || 
                     headerLower.includes('cedula') || 
                     headerLower.includes('identificacion') ||
                     headerLower.includes('identidad') ||
                     headerLower.includes('numero') ||
                     headerLower.includes('nro') ||
                     headerLower.includes('num') ||
                     headerLower === 'doc' ||
                     headerLower === 'nro doc' ||
                     headerLower === 'nro. doc' ||
                     headerLower === 'número' ||
                     headerLower === 'número documento') && numDocIdx === -1) {
                  numDocIdx = idx;
                }
              });
              if (numDocIdx >= 0) {
                console.log(`   ✅ Columna documento encontrada manualmente: "${headers[numDocIdx]}" (índice ${numDocIdx})`);
              }
            }
            
            const nombreIdx = findColumnIndex(['^nombre$', '^nombres$', 'primer.*nombre']);
            const apellidoIdx = findColumnIndex(['apellido', 'apellidos', 'primer.*apellido']);
            const estadoIdx = findColumnIndex(['^estado$', 'estado.*aprendiz']);
            // Mejorar detección de ficha con más patrones - buscar más agresivamente
            // Buscar en todos los headers posibles
            const fichaIdx = findColumnIndex([
              '^ficha$',           // Exacto: "ficha"
              'ficha',              // Contiene "ficha"
              'numero.*ficha',      // "numero ficha", "número ficha"
              'nro.*ficha',         // "nro ficha"
              'ficha.*caracterizacion', 
              'ficha.*caracterización', 
              'codigo.*ficha', 
              'cod.*ficha',
              'ficha.*numero',
              'num.*ficha',
              '^ficha.*$'           // Empieza con "ficha"
            ]);
            
            // Si no se encontró con los patrones, buscar manualmente en los headers
            let fichaIdxManual = -1;
            if (fichaIdx === -1) {
              headers.forEach((h, idx) => {
                const headerLower = String(h).toLowerCase().trim();
                if (headerLower.includes('ficha') && fichaIdxManual === -1) {
                  fichaIdxManual = idx;
                }
              });
              if (fichaIdxManual >= 0) {
                console.log(`   ✅ Ficha encontrada manualmente en columna "${headers[fichaIdxManual]}" (índice ${fichaIdxManual})`);
              }
            }
            const fichaIdxFinal = fichaIdx >= 0 ? fichaIdx : fichaIdxManual;
            const programaIdx = findColumnIndex(['programa', '^programa$', 'nombre.*programa', 'programa.*formacion']);
            
            console.log(`📋 Índices de columnas en "${sheetName}":`);
            console.log(`   - Documento: ${numDocIdx}, Ficha: ${fichaIdxFinal}, Programa: ${programaIdx}`);
            console.log(`   - Headers completos:`, headers.map((h, i) => `${i}: "${h}"`).join(', '));
            if (fichaIdxFinal >= 0) {
              console.log(`   ✅ Columna ficha encontrada: "${headers[fichaIdxFinal]}" (índice ${fichaIdxFinal})`);
            } else {
              console.log(`   ⚠️ Columna ficha NO encontrada. Se usará ficha global: "${fichaGlobal}"`);
            }
            
            if (numDocIdx === -1) {
              console.log(`⚠️ No se encontró columna de documento en hoja "${sheetName}"`);
              console.log(`   Headers disponibles:`, headers.map((h, i) => `${i}: "${h}"`).join(', '));
              console.log(`   Saltando esta hoja...`);
              hojasConErrores++;
              continue;
            }
            
            let sheetProcessedCount = 0;
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          
          if (!row || row.length === 0) continue;
          
          const numDoc = row[numDocIdx];
          
          if (numDoc && String(numDoc).trim() && String(numDoc).trim() !== '') {
                // Obtener ficha de la columna con mejor validación
                let fichaFila = null;
                if (fichaIdxFinal >= 0 && fichaIdxFinal < row.length) {
                  const fichaValue = row[fichaIdxFinal];
                  
                  // Debug: mostrar el valor crudo para las primeras filas
                  if (sheetProcessedCount < 3) {
                    console.log(`   🔍 Fila ${i + 1} - Valor crudo de ficha:`, fichaValue, `(tipo: ${typeof fichaValue})`);
                  }
                  // Verificar si el valor existe y no está vacío
                  // IMPORTANTE: Manejar valores numéricos y strings correctamente
                  if (fichaValue !== null && fichaValue !== undefined) {
                    // Convertir a string, manejando números correctamente
                    let fichaStr = '';
                    if (typeof fichaValue === 'number') {
                      // Si es un número, convertirlo directamente (incluso si es 0, pero lo validamos después)
                      fichaStr = String(fichaValue).trim();
                    } else if (typeof fichaValue === 'string') {
                      fichaStr = fichaValue.trim();
                    } else {
                      fichaStr = String(fichaValue).trim();
                    }
                    
                    // Aceptar cualquier valor que no sea 'N/A', 'null', 'undefined', 'NaN' o vacío
                    // IMPORTANTE: Aceptar números como "2928088" incluso si vienen como string o número
                    if (fichaStr && 
                        fichaStr !== '' && 
                        fichaStr !== 'N/A' && 
                        fichaStr !== 'null' && 
                        fichaStr !== 'undefined' && 
                        fichaStr !== 'NaN' &&
                        fichaStr !== '0') { // 0 no es una ficha válida
                      fichaFila = fichaStr;
                    }
                  }
                }
                
                // Si no hay ficha en la fila, usar la global de la hoja
                // IMPORTANTE: Priorizar ficha de la fila, luego la global
                let fichaFinal = fichaFila;
                if (!fichaFinal) {
                  // Usar la ficha global si existe y es válida
                  if (fichaGlobal && 
                      fichaGlobal !== 'N/A' && 
                      fichaGlobal !== 'null' && 
                      fichaGlobal !== 'undefined' && 
                      fichaGlobal !== '' &&
                      fichaGlobal !== '0') {
                    fichaFinal = fichaGlobal;
                    if (sheetProcessedCount < 3) {
                      console.log(`   📋 Usando ficha global de la hoja: "${fichaFinal}"`);
                    }
                  } else {
                    // Si no hay ficha global válida, usar 'N/A' (se convertirá a undefined más tarde)
                    fichaFinal = 'N/A';
                    if (sheetProcessedCount < 3) {
                      console.log(`   ⚠️ No se encontró ficha para fila ${i + 1}, usando 'N/A'`);
                    }
                  }
                } else {
                  if (sheetProcessedCount < 3) {
                    console.log(`   ✅ Ficha encontrada en columna: "${fichaFinal}"`);
                  }
                }
                
                // Obtener programa de la columna con mejor validación
                let programaFila = null;
                if (programaIdx >= 0 && programaIdx < row.length) {
                  const programaValue = row[programaIdx];
                  if (programaValue !== null && programaValue !== undefined && programaValue !== '') {
                    const programaStr = String(programaValue).trim();
                    if (programaStr && programaStr !== '' && programaStr !== 'null' && programaStr !== 'undefined') {
                      programaFila = programaStr;
                    }
                  }
                }
                // Si no hay programa en la fila, usar el global
                const programaFinal = programaFila || programaGlobal || '';
                
                // Solo mostrar logs para las primeras 5 filas para no saturar la consola
                if (sheetProcessedCount < 5) {
                  console.log(`📝 Fila ${i + 1}: Doc=${String(numDoc).trim()}, Ficha=${fichaFinal}, Programa=${programaFinal}`);
                }
                
                allProcessedData.push({
                  ficha: fichaFinal,
                  programa: programaFinal,
              tipoDocumento: tipoDocIdx >= 0 && row[tipoDocIdx] ? String(row[tipoDocIdx]).trim().toUpperCase() : 'CC',
              numeroDocumento: String(numDoc).trim(),
              nombre: nombreIdx >= 0 && row[nombreIdx] ? String(row[nombreIdx]).trim() : '',
              apellido: apellidoIdx >= 0 && row[apellidoIdx] ? String(row[apellidoIdx]).trim() : '',
              estado: estadoIdx >= 0 && row[estadoIdx] ? String(row[estadoIdx]).trim().toUpperCase() : 'ACTIVO'
            });
                sheetProcessedCount++;
              }
            }
            
            // Mostrar resumen de fichas encontradas en esta hoja
            const datosHoja = allProcessedData.slice(-sheetProcessedCount);
            const fichasEnHoja = new Set(datosHoja.map((d: any) => d.ficha).filter((f: any) => f && f !== 'N/A'));
            const aprendicesSinFicha = datosHoja.filter((d: any) => !d.ficha || d.ficha === 'N/A').length;
            console.log(`📊 Resumen de "${sheetName}":`);
            console.log(`   - Fichas únicas encontradas:`, Array.from(fichasEnHoja));
            console.log(`   - Aprendices sin ficha: ${aprendicesSinFicha}`);
            
            console.log(`✅ Hoja "${sheetName}": ${sheetProcessedCount} registros procesados y agregados`);
            hojasProcesadas++;
          } catch (error: any) {
            console.error(`❌ Error al procesar hoja "${sheetName}":`, error);
            hojasConErrores++;
            // Continuar con la siguiente hoja aunque esta falle
            continue;
          }
        }
        
        console.log(`\n📊 RESUMEN DE PROCESAMIENTO:`);
        console.log(`   - Total de hojas: ${totalHojas}`);
        console.log(`   - Hojas procesadas exitosamente: ${hojasProcesadas}`);
        console.log(`   - Hojas con errores o vacías: ${hojasConErrores}`);
        console.log(`   - Total de registros extraídos: ${allProcessedData.length}`);
        
        const processedData = allProcessedData;
        
        if (processedData.length === 0) {
          toast.error('❌ Sin Datos Válidos', {
            description: `No se pudieron extraer datos válidos de ninguna hoja. Se procesaron ${totalHojas} hoja(s), pero ninguna contenía datos válidos.`,
            duration: 8000,
          });
          setUploadedFileName('');
          return;
        }
        
        console.log(`📊 Total de registros procesados de todas las hojas: ${processedData.length}`);
        
        // Deduplicación mejorada: normalizar documentos antes de comparar
        const uniqueData = Array.from(
          new Map(
            processedData.map(item => {
              // Normalizar documento: solo números, sin espacios
              const docNormalizado = String(item.numeroDocumento).replace(/\D/g, '').trim();
              return [docNormalizado, item];
            })
          ).values()
        );
        
        const duplicadosEnArchivo = processedData.length - uniqueData.length;
        console.log(`📊 Registros únicos: ${uniqueData.length}, duplicados en archivo: ${duplicadosEnArchivo}`);
        
        // Mostrar resumen de fichas encontradas
        const fichasUnicas = new Set(uniqueData.map((d: any) => d.ficha).filter((f: any) => f && f !== 'N/A'));
        const aprendicesSinFicha = uniqueData.filter((d: any) => !d.ficha || d.ficha === 'N/A').length;
        console.log(`\n📊 RESUMEN DE FICHAS ENCONTRADAS EN EL EXCEL:`);
        console.log(`   - Total de registros únicos: ${uniqueData.length}`);
        console.log(`   - Fichas únicas encontradas:`, Array.from(fichasUnicas).sort());
        console.log(`   - Total de aprendices sin ficha: ${aprendicesSinFicha}`);
        if (fichasUnicas.size > 0) {
          console.log(`\n   📋 Distribución por ficha:`);
          fichasUnicas.forEach((ficha: any) => {
            const count = uniqueData.filter((d: any) => d.ficha === ficha).length;
            console.log(`      - Ficha "${ficha}": ${count} aprendices`);
          });
        } else {
          console.log(`   ⚠️ ADVERTENCIA: No se encontraron fichas válidas en el Excel!`);
        }
        
        if (uniqueData.length === 0) {
          toast.error('❌ Sin Datos Válidos', {
            description: 'No se pudieron extraer datos válidos del archivo. Verifique que el archivo contenga columnas: Número Documento, Nombre, y opcionalmente: Ficha, Programa, Tipo Documento, Apellido, Estado',
            duration: 6000,
          });
          setUploadedFileName('');
          return;
        }
        
        setJuiciosData(uniqueData);
        
        // Guardar personas en la base de datos automáticamente
        const personasToAdd: Omit<Person, 'id'>[] = uniqueData.map(dato => {
          // Validar y limpiar ficha
          let fichaFinal: string | undefined = undefined;
          if (dato.ficha) {
            const fichaStr = String(dato.ficha).trim();
            // Solo usar ficha si no es 'N/A', 'null', 'undefined' o vacío
            if (fichaStr && fichaStr !== 'N/A' && fichaStr !== 'null' && fichaStr !== 'undefined' && fichaStr !== '') {
              fichaFinal = fichaStr;
            }
          }
          
          // Validar y limpiar programa
          let programaFinal: string | undefined = undefined;
          if (dato.programa) {
            const programaStr = String(dato.programa).trim();
            if (programaStr && programaStr !== 'null' && programaStr !== 'undefined' && programaStr !== '') {
              programaFinal = programaStr;
            }
          }
          
          // IMPORTANTE: Solo enviar ficha si es válida, de lo contrario enviar undefined (no 'N/A')
          // El backend rechazará 'N/A' pero aceptará undefined/null
          const fichaParaEnviar = (fichaFinal && fichaFinal !== 'N/A') ? fichaFinal : undefined;
          
          console.log(`📦 Preparando: Doc=${dato.numeroDocumento}, Ficha=${fichaParaEnviar || 'null'}, Programa=${programaFinal || 'null'}`);
          
          return {
          nombre: dato.nombre || 'Aprendiz',
          apellido: dato.apellido || '',
          documento: dato.numeroDocumento,
          tipoDocumento: (dato.tipoDocumento || 'CC').toUpperCase() as 'CC' | 'TI' | 'CE' | 'PASAPORTE',
            ficha: fichaParaEnviar, // undefined si no hay ficha válida
            programa: programaFinal,
          rol: 'ESTUDIANTE' as const,
          estado: (dato.estado || 'ACTIVO').toUpperCase() as any,
          tipoSangre: 'O+' as const, // Por defecto, se puede actualizar manualmente después
          };
        });
        
        const response = await onBulkPersonAdd(personasToAdd);
        
        // El backend devuelve un objeto con exitosos, duplicados, fallidos
        let addedCount = 0;
        let duplicadosEnBD = 0;
        let fallidos = 0;
        
        if (typeof response === 'object' && response !== null && 'exitosos' in response) {
          addedCount = (response as any).exitosos || 0;
          duplicadosEnBD = (response as any).duplicados || 0;
          fallidos = (response as any).fallidos || 0;
        } else if (typeof response === 'number') {
          // Compatibilidad con versiones anteriores
          addedCount = response;
          duplicadosEnBD = uniqueData.length - addedCount;
        }
        
        const totalDuplicados = duplicadosEnArchivo + duplicadosEnBD;
        const totalProcesados = processedData.length;
        
        // Guardar resultados de la carga masiva para mostrarlos en la tabla
        const erroresBackend = typeof response === 'object' && response !== null && 'errores' in response 
          ? (response as any).errores || []
          : [];
        
        setCargaMasivaResultados({
          totalProcesados,
          totalHojas,
          exitosos: addedCount,
          duplicadosEnArchivo,
          duplicadosEnBD,
          fallidos,
          errores: erroresBackend,
        });
        
        let mensaje = '';
        if (totalDuplicados > 0 || fallidos > 0) {
          mensaje = `${totalProcesados} registros procesados de ${totalHojas} hoja(s). `;
          mensaje += `✅ ${addedCount} nuevos guardados. `;
          if (duplicadosEnArchivo > 0) {
            mensaje += `⚠️ ${duplicadosEnArchivo} duplicados en el archivo (no guardados). `;
          }
          if (duplicadosEnBD > 0) {
            mensaje += `⚠️ ${duplicadosEnBD} ya existían en la BD (no guardados). `;
          }
          if (fallidos > 0) {
            mensaje += `❌ ${fallidos} con errores.`;
          }
        } else {
          mensaje = `${totalProcesados} registros procesados de ${totalHojas} hoja(s), ${addedCount} nuevos guardados exitosamente`;
        }
        
        if (totalDuplicados > 0 || fallidos > 0) {
          toast.warning('⚠️ Archivo Excel Procesado con Advertencias', {
            description: mensaje,
            duration: 10000,
          });
        } else {
        toast.success('✅ Archivo Excel Procesado', {
          description: mensaje,
          duration: 6000,
        });
        }
        
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
    setCargaMasivaResultados(null);
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

    // Si es reporte de accesos y hay filtros de fecha, cargar datos del backend
    let accesosFiltrados = accessRecords;
    if (tipo === 'accesos-dia' && (fechaDesde || fechaHasta)) {
      try {
        const response = await accesosAPI.getAll({
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          limit: 10000
        });
        if (response.success && response.data) {
          accesosFiltrados = response.data.map((acc: any) => ({
            id: acc.id,
            personaId: acc.personaId,
            tipo: acc.tipo,
            timestamp: acc.timestamp ? new Date(acc.timestamp) : (acc.fecha_entrada ? new Date(acc.fecha_entrada) : new Date(acc.fecha_salida)),
            fechaHora: acc.timestamp ? new Date(acc.timestamp) : (acc.fecha_entrada ? new Date(acc.fecha_entrada) : new Date(acc.fecha_salida)),
            fecha_entrada: acc.fecha_entrada,
            fecha_salida: acc.fecha_salida,
            persona: {
              id: acc.personaId,
              nombre: acc.nombres,
              apellido: acc.apellidos,
              documento: acc.documento,
              tipoDocumento: 'CC' as const,
              rol: 'ESTUDIANTE' as const,
              estado: 'ACTIVO' as const,
              tipoSangre: 'O+' as const
            },
            ubicacion: acc.ubicacion || 'Entrada Principal',
            codigoQR: acc.codigoQR || ''
          }));
        }
      } catch (error) {
        console.error('Error al cargar accesos filtrados:', error);
        toast.warning('⚠️ Error al cargar datos', {
          description: 'Se generará el reporte con los datos locales disponibles',
          duration: 4000,
        });
      }
    }

    setTimeout(() => {
      setIsGenerating(null);
      
      let contenido = '';
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      if (tipo === 'juicios-evaluativos') {
        // Usar solo juiciosData si está disponible, evitar duplicar con personas
        const datosReporte = juiciosData.length > 0 
          ? juiciosData 
          : personas
              .filter(p => p.rol === 'ESTUDIANTE')
              .map(e => ({
                ficha: e.ficha || 'N/A',
                programa: e.programa || '',
                tipoDocumento: e.tipoDocumento,
                numeroDocumento: e.documento,
                nombre: e.nombre,
                apellido: e.apellido || '',
                estado: e.estado
              }));
        
        // Deduplicación mejorada: usar documento normalizado (solo números) como clave
        const datosUnicos = Array.from(
          new Map(
            datosReporte.map(item => {
              // Normalizar documento: solo números, sin espacios
              const docNormalizado = String(item.numeroDocumento).replace(/\D/g, '').trim();
              return [docNormalizado, item];
            })
          ).values()
        );
        
        if (formato === 'Excel') {
          contenido = 'REPORTE DE JUICIOS EVALUATIVOS\n';
          contenido += `Generado el: ${formatDate(now)}\n`;
          contenido += `Total de Aprendices: ${datosUnicos.length}\n\n`;
          contenido += 'Ficha,Programa,Tipo Documento,Número Documento,Nombre,Apellido,Estado\n';
          datosUnicos.forEach(dato => {
            contenido += `"${dato.ficha}","${dato.programa || ''}","${dato.tipoDocumento}","${dato.numeroDocumento}","${dato.nombre}","${dato.apellido}","${dato.estado}"\n`;
          });
        } else {
          contenido = `╔════════════════════════════════════════════════════════════════╗\n`;
          contenido += `║         SENA - REPORTE DE JUICIOS EVALUATIVOS                 ║\n`;
          contenido += `╚════════════════════════════════════════════════════════════════╝\n\n`;
          contenido += `Fecha de Generación: ${formatDate(now)}\n`;
          contenido += `Generado por: ${currentUser.nombre}\n`;
          contenido += `Total de Aprendices: ${datosUnicos.length}\n\n`;
          contenido += `${'─'.repeat(130)}\n`;
          contenido += `FICHA    | PROGRAMA                    | TIPO DOC | NÚMERO DOC  | NOMBRE                    | APELLIDO                 | ESTADO\n`;
          contenido += `${'─'.repeat(130)}\n`;
          datosUnicos.forEach(dato => {
            const programa = (dato.programa || '').padEnd(27).substring(0, 27);
            contenido += `${dato.ficha.padEnd(8)} | ${programa} | ${dato.tipoDocumento.padEnd(8)} | ${dato.numeroDocumento.padEnd(11)} | ${dato.nombre.padEnd(25).substring(0, 25)} | ${dato.apellido.padEnd(24).substring(0, 24)} | ${dato.estado}\n`;
          });
          contenido += `${'─'.repeat(130)}\n\n`;
          contenido += `Fin del reporte\n`;
        }
      } else if (tipo === 'accesos-dia') {
        // Usar accesos filtrados si se cargaron del backend, sino usar los locales
        let accesosDia = accesosFiltrados;

        // Si hay filtros de fecha, aplicar siempre el rango sobre los datos disponibles
        if (fechaDesde || fechaHasta) {
          accesosDia = accesosDia.filter((r) => {
            const rawDate =
              (r as any).fecha_entrada ||
              (r as any).fecha_salida ||
              r.timestamp ||
              r.fechaHora ||
              new Date(0);
            const recordDateObj = rawDate instanceof Date ? rawDate : new Date(rawDate);
            const dateStr = recordDateObj.toISOString().split('T')[0];

            if (fechaDesde && dateStr < fechaDesde) return false;
            if (fechaHasta && dateStr > fechaHasta) return false;
            return true;
          });
        } else {
          // Si no hay filtros de fecha, mostrar solo los de hoy
          accesosDia = accesosDia.filter((r) => {
          const recordDate = r.timestamp || r.fechaHora || new Date(0);
          return recordDate.toDateString() === now.toDateString();
        });
        }
        
        const rangoFechas = fechaDesde || fechaHasta 
          ? (fechaDesde && fechaHasta 
              ? `Del ${new Date(fechaDesde).toLocaleDateString('es-CO')} al ${new Date(fechaHasta).toLocaleDateString('es-CO')}`
              : fechaDesde 
                ? `Desde ${new Date(fechaDesde).toLocaleDateString('es-CO')}`
                : `Hasta ${new Date(fechaHasta).toLocaleDateString('es-CO')}`)
          : `Fecha: ${formatDate(now)}`;
        
        if (formato === 'Excel') {
          contenido = 'REPORTE DE ACCESOS\n';
          contenido += `${rangoFechas}\n`;
          contenido += `Total de Accesos: ${accesosDia.length}\n\n`;
          contenido += 'Fecha y Hora,Hora Entrada,Hora Salida,Tipo,Nombre,Documento,Rol,Ubicación\n';
          accesosDia.forEach(acc => {
            // Usar fecha_entrada y fecha_salida si están disponibles, sino usar timestamp/fechaHora según el tipo
            let fechaEntrada: Date | string | null = null;
            let fechaSalida: Date | string | null = null;
            
            if ((acc as any).fecha_entrada) {
              fechaEntrada = (acc as any).fecha_entrada instanceof Date ? (acc as any).fecha_entrada : new Date((acc as any).fecha_entrada);
            } else if (acc.tipo === 'ENTRADA') {
              fechaEntrada = acc.timestamp || acc.fechaHora || new Date();
            }
            
            if ((acc as any).fecha_salida) {
              fechaSalida = (acc as any).fecha_salida instanceof Date ? (acc as any).fecha_salida : new Date((acc as any).fecha_salida);
            } else if (acc.tipo === 'SALIDA') {
              fechaSalida = acc.timestamp || acc.fechaHora || new Date();
            }
            
            const horaEntrada = fechaEntrada ? formatTime(fechaEntrada) : '--:--:--';
            const horaSalida = fechaSalida ? formatTime(fechaSalida) : '--:--:--';
            const fechaCompleta = fechaEntrada || fechaSalida || acc.timestamp || acc.fechaHora || new Date();
            const fechaHoraCompleta = formatDate(fechaCompleta);
            
            contenido += `"${fechaHoraCompleta}","${horaEntrada}","${horaSalida}","${acc.tipo}","${acc.persona.nombre}","${acc.persona.documento}","${acc.persona.rol === 'ESTUDIANTE' ? 'APRENDIZ' : acc.persona.rol}","${acc.ubicacion}"\n`;
          });
        } else {
          contenido = `╔════════════════════════════════════════════════════════════════════════════════════════╗\n`;
          contenido += `║                    SENA - REPORTE DE ACCESOS                                        ║\n`;
          contenido += `╚════════════════════════════════════════════════════════════════════════════════════════╝\n\n`;
          contenido += `${rangoFechas}\n`;
          contenido += `Total de Accesos: ${accesosDia.length}\n\n`;
          contenido += `${'─'.repeat(140)}\n`;
          contenido += `FECHA Y HORA        | HORA ENTRADA  | HORA SALIDA   | TIPO    | NOMBRE                 | DOCUMENTO   | ROL\n`;
          contenido += `${'─'.repeat(140)}\n`;
          accesosDia.forEach(acc => {
            // Usar fecha_entrada y fecha_salida si están disponibles, sino usar timestamp/fechaHora según el tipo
            let fechaEntrada: Date | string | null = null;
            let fechaSalida: Date | string | null = null;
            
            if ((acc as any).fecha_entrada) {
              fechaEntrada = (acc as any).fecha_entrada instanceof Date ? (acc as any).fecha_entrada : new Date((acc as any).fecha_entrada);
            } else if (acc.tipo === 'ENTRADA') {
              fechaEntrada = acc.timestamp || acc.fechaHora || new Date();
            }
            
            if ((acc as any).fecha_salida) {
              fechaSalida = (acc as any).fecha_salida instanceof Date ? (acc as any).fecha_salida : new Date((acc as any).fecha_salida);
            } else if (acc.tipo === 'SALIDA') {
              fechaSalida = acc.timestamp || acc.fechaHora || new Date();
            }
            
            const horaEntrada = fechaEntrada ? formatTime(fechaEntrada) : '--:--:--';
            const horaSalida = fechaSalida ? formatTime(fechaSalida) : '--:--:--';
            const fechaCompleta = fechaEntrada || fechaSalida || acc.timestamp || acc.fechaHora || new Date();
            const fechaHoraCompleta = formatDate(fechaCompleta);
            
            contenido += `${fechaHoraCompleta.padEnd(19)} | ${horaEntrada.padEnd(13)} | ${horaSalida.padEnd(13)} | ${acc.tipo.padEnd(7)} | ${acc.persona.nombre.padEnd(22).substring(0, 22)} | ${acc.persona.documento.padEnd(11)} | ${(acc.persona.rol === 'ESTUDIANTE' ? 'APRENDIZ' : acc.persona.rol)}\n`;
          });
          contenido += `${'─'.repeat(120)}\n`;
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
      
      // Ajustar tipos y extensiones para que la descarga sea correcta
      // Para PDF generamos HTML que se puede imprimir como PDF o guardar como PDF
      let mimeType: string;
      let extension: string;
      let blobContent: string | BlobPart[];
      
      if (formato === 'PDF') {
        // Generar HTML que se puede imprimir como PDF
        // Escapar caracteres HTML especiales en el contenido
        const contenidoEscapado = contenido
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        
        const tituloReporte = tipo === 'juicios-evaluativos' 
          ? 'REPORTE DE JUICIOS EVALUATIVOS'
          : tipo === 'accesos-dia'
          ? 'REPORTE DE ACCESOS DEL DÍA'
          : tipo === 'visitantes'
          ? 'REPORTE DE VISITANTES'
          : tipo === 'estadisticas-uso'
          ? 'ESTADÍSTICAS DE USO DEL SISTEMA'
          : 'REPORTE SENA';
        
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte SENA - ${tituloReporte}</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      margin: 20px;
      line-height: 1.4;
      color: #000;
    }
    .header {
      text-align: center;
      border: 2px solid #000;
      padding: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 14pt;
      font-weight: bold;
    }
    .info {
      margin-bottom: 15px;
    }
    .info p {
      margin: 5px 0;
    }
    pre {
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      line-height: 1.3;
      margin: 0;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 8pt;
      border-top: 1px solid #000;
      padding-top: 10px;
    }
    @media print {
      body { margin: 10px; }
      @page {
        margin: 1cm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SENA - ${tituloReporte}</h1>
  </div>
  <div class="info">
    <p><strong>Fecha de Generación:</strong> ${formatDate(now)}</p>
    <p><strong>Generado por:</strong> ${currentUser.nombre}</p>
  </div>
  <pre>${contenidoEscapado}</pre>
  <div class="footer">
    <p>Fin del reporte</p>
  </div>
</body>
</html>`;
        mimeType = 'text/html;charset=utf-8';
        extension = 'html';
        blobContent = [htmlContent];
      } else {
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
        blobContent = ['\uFEFF' + contenido];
      }
      
      const blob = new Blob(blobContent, { type: mimeType });
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
                          <span className="font-semibold"> Programa:</span> {dato.programa || 'N/A'} | 
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
                
                {/* Tabla de resultados de carga masiva */}
                {cargaMasivaResultados && (
                  <div className="border rounded-md p-4 bg-white">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Resumen de Carga Masiva
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Concepto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Total de hojas procesadas</TableCell>
                          <TableCell className="text-right">{cargaMasivaResultados.totalHojas}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">Info</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Total de registros procesados</TableCell>
                          <TableCell className="text-right">{cargaMasivaResultados.totalProcesados}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">Info</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-green-50">
                          <TableCell className="font-medium text-green-800">✅ Registros guardados exitosamente</TableCell>
                          <TableCell className="text-right font-semibold text-green-800">{cargaMasivaResultados.exitosos}</TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-100 text-green-800 border-green-300">Exitoso</Badge>
                          </TableCell>
                        </TableRow>
                        {cargaMasivaResultados.duplicadosEnArchivo > 0 && (
                          <TableRow className="bg-yellow-50">
                            <TableCell className="font-medium text-yellow-800">⚠️ Duplicados en el archivo</TableCell>
                            <TableCell className="text-right font-semibold text-yellow-800">{cargaMasivaResultados.duplicadosEnArchivo}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Duplicado</Badge>
                            </TableCell>
                          </TableRow>
                        )}
                        {cargaMasivaResultados.duplicadosEnBD > 0 && (
                          <TableRow className="bg-orange-50">
                            <TableCell className="font-medium text-orange-800">⚠️ Ya existían en la base de datos</TableCell>
                            <TableCell className="text-right font-semibold text-orange-800">{cargaMasivaResultados.duplicadosEnBD}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300">Existente</Badge>
                            </TableCell>
                          </TableRow>
                        )}
                        {cargaMasivaResultados.fallidos > 0 && (
                          <TableRow className="bg-red-50">
                            <TableCell className="font-medium text-red-800">❌ Registros con errores</TableCell>
                            <TableCell className="text-right font-semibold text-red-800">{cargaMasivaResultados.fallidos}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-red-100 text-red-800 border-red-300">Error</Badge>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Mostrar detalles de errores si hay */}
                    {cargaMasivaResultados.errores && cargaMasivaResultados.errores.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-2 text-red-800">Detalles de Errores:</h4>
                        <div className="max-h-48 overflow-auto space-y-2">
                          {cargaMasivaResultados.errores.map((error: any, idx: number) => (
                            <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                              <span className="font-semibold text-red-800">Documento:</span> {error.documento || 'N/A'} - 
                              <span className="text-red-700 ml-1">{error.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800 font-medium mb-1">
                📋 Columnas del archivo:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4">
                <li>• Ficha - Programa - Tipo Documento - Número Documento</li>
                <li>• Nombre - Apellido - Estado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de descarga de datos de la Base de Datos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Aprendices Registrados en el Sistema
          </CardTitle>
          <CardDescription>
            Descargue el listado de aprendices registrados en formato PDF o Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Total de aprendices registrados</p>
              <p className="text-2xl font-bold mt-1">{personas.filter(p => p.rol === 'ESTUDIANTE').length}</p>
            </div>
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => generateReport('juicios-evaluativos', 'PDF')}
              variant="default"
              className="flex-1"
              disabled={isGenerating === 'juicios-evaluativos_PDF'}
            >
              {isGenerating === 'juicios-evaluativos_PDF' ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar PDF
                </>
              )}
            </Button>
            <Button
              onClick={() => generateReport('juicios-evaluativos', 'Excel')}
              variant="outline"
              className="flex-1"
              disabled={isGenerating === 'juicios-evaluativos_Excel'}
            >
              {isGenerating === 'juicios-evaluativos_Excel' ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Descargar Excel
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reportes con Filtros de Fecha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reportes por Rango de Fechas
            </CardTitle>
            <CardDescription>
            Genere reportes de accesos filtrados por rango de fechas personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha-desde">Fecha Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                min={fechaDesde}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                if (!fechaDesde && !fechaHasta) {
                  toast.warning('⚠️ Fechas Requeridas', {
                    description: 'Seleccione al menos una fecha para generar el reporte',
                    duration: 4000,
                  });
                  return;
                }
                generateReport('accesos-dia', 'PDF');
              }}
              variant="default"
                className="flex-1"
              disabled={isGenerating === 'accesos-dia_PDF'}
            >
              {isGenerating === 'accesos-dia_PDF' ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                <FileText className="h-4 w-4 mr-2" />
                  Reporte Accesos (PDF)
                </>
              )}
              </Button>
              <Button
                onClick={() => {
                if (!fechaDesde && !fechaHasta) {
                  toast.warning('⚠️ Fechas Requeridas', {
                    description: 'Seleccione al menos una fecha para generar el reporte',
                    duration: 4000,
                  });
                  return;
                }
                generateReport('accesos-dia', 'Excel');
              }}
                variant="outline"
              className="flex-1"
              disabled={isGenerating === 'accesos-dia_Excel'}
            >
              {isGenerating === 'accesos-dia_Excel' ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Reporte Accesos (Excel)
                </>
              )}
              </Button>
            {(fechaDesde || fechaHasta) && (
              <Button
                onClick={() => {
                  setFechaDesde('');
                  setFechaHasta('');
                  toast.info('ℹ️ Filtros Limpiados', {
                    description: 'Los filtros de fecha han sido removidos',
                    duration: 3000,
                  });
                }}
                variant="ghost"
                size="icon"
                title="Limpiar filtros"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            </div>
          
          {(fechaDesde || fechaHasta) && (
            <div className="text-sm text-muted-foreground p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="font-medium text-blue-900">Filtro activo:</p>
              <p className="text-blue-700">
                {fechaDesde && fechaHasta 
                  ? `Del ${new Date(fechaDesde).toLocaleDateString('es-CO')} al ${new Date(fechaHasta).toLocaleDateString('es-CO')}`
                  : fechaDesde 
                    ? `Desde ${new Date(fechaDesde).toLocaleDateString('es-CO')}`
                    : `Hasta ${new Date(fechaHasta).toLocaleDateString('es-CO')}`
                }
              </p>
            </div>
          )}
          </CardContent>
        </Card>

    </div>
  );
}

