# 🔧 Solución de Errores en Visual Studio Code

## 🎯 Errores Comunes y Soluciones

### 1. ❌ Muchos errores rojos en archivos .tsx

**Síntomas:**
- Líneas rojas en imports
- "Cannot find module..."
- "Type '...' is not assignable..."

**Soluciones (en orden):**

#### Solución A: Reiniciar TypeScript Server
```
1. Presiona: Ctrl + Shift + P
2. Escribe: "TypeScript: Restart TS Server"
3. Presiona Enter
4. Espera 5 segundos
```

#### Solución B: Instalar dependencias
```bash
npm install
```

#### Solución C: Limpiar caché y reinstalar
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# En Windows PowerShell:
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

#### Solución D: Cerrar y reabrir VS Code
```
1. File → Close Folder
2. Cierra VS Code completamente
3. Vuelve a abrir el proyecto
```

---

### 2. ❌ Error: "Cannot find module '../types'"

**Síntomas:**
```typescript
import { User } from '../types'; // Error rojo
```

**Soluciones:**

#### Si estás en `/src/App.tsx`:
```typescript
// ✅ Correcto
import { User } from './types';
```

#### Si estás en `/components/LoginForm.tsx`:
```typescript
// ✅ Correcto  
import { User } from '../src/types';
```

#### Verificar que existe el archivo:
```
¿Existe /src/types/index.ts?
- Si NO existe → El archivo ya fue creado, reinicia VS Code
- Si SÍ existe → Usa las rutas correctas arriba
```

---

### 3. ❌ Error: "Module not found: Can't resolve './styles/globals.css'"

**Solución:**

Verifica que `/src/main.tsx` tenga:
```typescript
import '../styles/globals.css';  // ✅ Correcto

// NO uses:
import './styles/globals.css';   // ❌ Incorrecto
```

---

### 4. ❌ Tailwind CSS no funciona (colores, estilos no se aplican)

**Soluciones:**

#### A. Verificar que los estilos se importan:
```typescript
// En /src/main.tsx debe estar:
import '../styles/globals.css';
```

#### B. Verificar que existe el archivo:
```
¿Existe /styles/globals.css?
- Sí → Continúa con C
- No → Crea el archivo (contacta para ayuda)
```

#### C. Instalar extensión Tailwind:
```
1. Ctrl + Shift + X (abrir extensiones)
2. Busca: "Tailwind CSS IntelliSense"
3. Click en "Install"
4. Reinicia VS Code
```

#### D. Verificar vite.config.ts:
El archivo debe existir y tener:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

### 5. ❌ Error: "Property 'xxx' does not exist on type..."

**Ejemplo:**
```typescript
// Error: Property 'onBulkPersonAdd' does not exist...
<AdminView onBulkPersonAdd={...} />
```

**Solución:**

Esto significa que falta agregar la propiedad en la interface del componente.

#### Para AdminView:
Busca en `/components/AdminView.tsx`:
```typescript
interface AdminViewProps {
  // ... otras propiedades
  onBulkPersonAdd?: (persons: Omit<Person, 'id'>[]) => number; // Agregar
}
```

---

### 6. ❌ Extensiones no se instalaron automáticamente

**Solución:**

Instalar manualmente:

```
1. Ctrl + Shift + X (abrir panel de extensiones)

2. Buscar e instalar una por una:
   ✅ ESLint (dbaeumer.vscode-eslint)
   ✅ Prettier (esbenp.prettier-vscode)
   ✅ Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
   ✅ ES7+ React Snippets (dsznajder.es7-react-js-snippets)
   ✅ Path Intellisense (christian-kohler.path-intellisense)

3. Reiniciar VS Code
```

---

### 7. ❌ "npm: command not found" o "npm is not recognized"

**Solución:**

Node.js no está instalado o no está en PATH.

```
1. Verificar si Node está instalado:
   → node --version
   → npm --version

2. Si no funciona:
   - Descarga Node.js: https://nodejs.org/
   - Instala la versión LTS (recomendada)
   - Reinicia la terminal/VS Code
   - Vuelve a probar
```

---

### 8. ❌ Backend no inicia / Errores de MySQL

**Ver documentación específica:**
```
📖 INICIO-RAPIDO-BACKEND.txt
📖 MYSQL-WORKBENCH-PASO-A-PASO.txt
📖 CONFIGURACION-BACKEND.md
```

**Problemas comunes del backend:**

| Error | Solución |
|-------|----------|
| Cannot connect to MySQL | MySQL Server no está corriendo |
| Access denied | Password incorrecto en .env |
| Database doesn't exist | Ejecuta schema.sql en MySQL Workbench |
| Port 5000 in use | Cambia PORT en .env |

---

### 9. ❌ Formateo automático no funciona

**Síntomas:**
- Código no se formatea al guardar
- Prettier no funciona

**Soluciones:**

#### A. Verificar que Prettier está instalado:
```
1. Ctrl + Shift + X
2. Busca "Prettier"
3. Si no está, instálalo
```

#### B. Configurar como formateador por defecto:
```
1. Ctrl + Shift + P
2. Escribe: "Format Document With..."
3. Selecciona "Prettier - Code formatter"
4. Marca "Configure Default Formatter"
```

#### C. Verificar settings:
```
1. Ctrl + ,
2. Busca "Format On Save"
3. Activa la checkbox
```

---

### 10. ❌ IntelliSense no funciona (no aparecen sugerencias)

**Soluciones:**

#### A. Reiniciar TypeScript:
```
Ctrl + Shift + P → TypeScript: Restart TS Server
```

#### B. Verificar que estás en un archivo .tsx:
```
IntelliSense solo funciona en archivos TypeScript/JavaScript
```

#### C. Verificar que el proyecto está abierto correctamente:
```
File → Open Folder → Abre la carpeta RAÍZ del proyecto
NO abras carpetas individuales como /src o /components
```

---

### 11. ❌ "import React from 'react'" aparece como innecesario

**Esto es normal en React 18+**

Puedes eliminar esa línea:
```typescript
// ❌ Ya no es necesario (pero no da error)
import React from 'react';

// ✅ Solo necesitas importar lo que uses
import { useState, useEffect } from 'react';
```

---

### 12. ❌ Terminal no se abre en VS Code

**Soluciones:**

#### A. Atajo de teclado:
```
Ctrl + Ñ
o
Ctrl + `  (tilde)
```

#### B. Desde el menú:
```
Terminal → New Terminal
```

#### C. Si sigue sin funcionar:
```
1. View → Terminal
2. O reinicia VS Code
```

---

### 13. ❌ Los cambios no se reflejan en el navegador

**Soluciones:**

#### A. Verifica que el servidor esté corriendo:
```bash
npm run dev

# Deberías ver:
# VITE v6.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

#### B. Refresca el navegador:
```
Ctrl + F5 (hard refresh)
```

#### C. Limpia la caché de Vite:
```bash
rm -rf .vite
npm run dev
```

---

### 14. ❌ "ReferenceError: process is not defined"

**Solución:**

Esto sucede si intentas usar `process.env` en el frontend.

```typescript
// ❌ NO funciona en el frontend
const apiUrl = process.env.VITE_API_URL;

// ✅ Usa import.meta.env
const apiUrl = import.meta.env.VITE_API_URL;
```

Para definir variables de entorno en Vite, crea `.env`:
```
VITE_API_URL=http://localhost:5000
```

---

## 🆘 Si Nada Funciona

### Última opción: Resetear todo

```bash
# 1. Cerrar VS Code completamente

# 2. Eliminar todo y reinstalar
rm -rf node_modules .vite dist package-lock.json
npm install

# 3. Volver a abrir VS Code
code .

# 4. Reiniciar TypeScript Server
# Ctrl + Shift + P → TypeScript: Restart TS Server

# 5. Iniciar proyecto
npm run dev
```

---

## 📞 Obtener Más Ayuda

### Ver documentación:
- `INICIO-CON-VSCODE.md` - Guía completa de VS Code
- `ESTRUCTURA-PROYECTO.md` - Estructura del proyecto
- `LEEME-PRIMERO-VSCODE.txt` - Inicio rápido

### Verificar logs:
```
1. En VS Code: View → Output
2. Selecciona "TypeScript" en el dropdown
3. Lee los errores detallados
```

### Captura de pantalla del error:
Si nada funciona, toma screenshot del error completo incluyendo:
- El código que genera el error
- El mensaje de error en la terminal
- La ruta del archivo

---

## ✅ Checklist de Verificación

Antes de reportar un error, verifica:

- [ ] Node.js instalado (`node --version`)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Proyecto abierto correctamente en VS Code (carpeta raíz)
- [ ] Extensiones recomendadas instaladas
- [ ] TypeScript Server reiniciado
- [ ] VS Code reiniciado
- [ ] Terminal corriendo `npm run dev`

---

**¡La mayoría de errores se resuelven con estas soluciones!** 🎉
