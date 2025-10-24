# 🚀 Iniciar Proyecto con Visual Studio Code

## ✅ Pasos Rápidos

### 1️⃣ Abrir en VS Code

```bash
# Si tienes VS Code instalado, desde la terminal:
code .

# O manualmente:
# File → Open Folder → Selecciona la carpeta del proyecto
```

### 2️⃣ Instalar Extensiones Recomendadas

Cuando abras el proyecto, VS Code te preguntará:

```
"Do you want to install the recommended extensions for this repository?"
```

✅ **Click en "Install"** o "Install All"

Esto instalará automáticamente:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- React snippets
- Path Intellisense
- Auto Rename Tag

### 3️⃣ Abrir Dos Terminales

En VS Code:

**Terminal 1 - Frontend:**
```bash
# En la raíz del proyecto
npm install      # Primera vez
npm run dev      # Iniciar frontend
```

**Terminal 2 - Backend:**
```bash
cd backend
npm install      # Primera vez
npm run dev      # Iniciar backend
```

Para abrir terminal nueva: 
- `Ctrl + Ñ` (nueva)
- `Ctrl + Shift + Ñ` (dividir)
- O: `Terminal` → `New Terminal`

### 4️⃣ Verificar que Todo Funciona

✅ **Frontend:**
- Debería abrir automáticamente: http://localhost:5173
- O manual: http://localhost:3000 (según configuración)

✅ **Backend:**
- Verifica en la terminal que diga:
  ```
  🟢 SERVIDOR HUELLA SENA - INICIADO CORRECTAMENTE
  🚀 Servidor corriendo en: http://localhost:5000
  ```

## 🐛 Solucionar Errores en VS Code

### ❌ Muchos errores rojos en archivos TypeScript

**Solución 1: Reiniciar TypeScript Server**
1. `Ctrl + Shift + P`
2. Escribe: "TypeScript: Restart TS Server"
3. Presiona Enter

**Solución 2: Instalar dependencias**
```bash
npm install
```

**Solución 3: Cerrar y volver a abrir VS Code**

### ❌ "Cannot find module" en imports

**Solución:**
1. Verifica que instalaste las dependencias: `npm install`
2. Reinicia TypeScript Server (Ctrl + Shift + P → TypeScript: Restart)

### ❌ Error: "Module not found: Can't resolve '@/...'"

Este error no debería aparecer. Si aparece:
```bash
# Ejecuta en la raíz:
npm install
```

### ❌ Tailwind CSS no funciona

**Solución:**
1. Verifica que existe `/styles/globals.css`
2. Verifica que `/src/main.tsx` importa: `import '../styles/globals.css'`
3. Ejecuta: `npm install`

### ❌ Backend no inicia

**Solución:**
1. Verifica que MySQL esté corriendo
2. Verifica que creaste el archivo `/backend/.env`:
   ```bash
   cd backend
   copy .env.example .env     # Windows
   cp .env.example .env       # Mac/Linux
   ```
3. Edita `.env` con tus credenciales de MySQL

## ⚙️ Configuración Personalizada de VS Code

Si deseas configurar manualmente:

**Settings JSON** (`Ctrl + ,` → ⚙️ arriba derecha → "Open Settings (JSON)")

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 🎨 Temas Recomendados

Para mejor experiencia visual:

1. `Ctrl + K` → `Ctrl + T` (abrir selector de temas)
2. Recomendados:
   - **One Dark Pro**
   - **Dracula Official**
   - **Night Owl**
   - **Material Theme**

## 📁 Explorador de Archivos

VS Code muestra la estructura del proyecto a la izquierda.

**Carpetas importantes:**
- 📂 `src/` → Código React principal
- 📂 `components/` → Componentes UI
- 📂 `backend/` → API y servidor
- 📂 `styles/` → CSS global

**Ocultar carpetas en el explorador:**
- Click derecho → "Collapse All"
- O `Ctrl + Click` en la flecha

## 🔍 Buscar en el Proyecto

- **Buscar archivo:** `Ctrl + P`
- **Buscar texto:** `Ctrl + Shift + F`
- **Buscar y reemplazar:** `Ctrl + H`

## 🏃‍♂️ Atajos Útiles de VS Code

| Atajo | Acción |
|-------|--------|
| `Ctrl + P` | Buscar archivo por nombre |
| `Ctrl + Shift + P` | Paleta de comandos |
| `Ctrl + B` | Mostrar/Ocultar sidebar |
| `Ctrl + Ñ` | Abrir/Cerrar terminal |
| `Ctrl + Shift + Ñ` | Nueva terminal |
| `Ctrl + /` | Comentar línea |
| `Alt + ↑/↓` | Mover línea arriba/abajo |
| `Ctrl + D` | Seleccionar siguiente ocurrencia |
| `Ctrl + F` | Buscar en archivo |
| `F2` | Renombrar símbolo |
| `Ctrl + .` | Quick Fix (arreglos rápidos) |

## 🔄 Actualizar Dependencias

Si el proyecto está desactualizado:

```bash
# Frontend
npm update

# Backend
cd backend
npm update
```

## 📦 Estado del Proyecto

✅ **Listo para trabajar:**
- Estructura organizada
- TypeScript configurado
- Componentes separados
- Backend configurado
- Documentación completa

⏳ **Pendiente:**
- Configurar MySQL (ver INICIO-RAPIDO-BACKEND.txt)
- Conectar frontend con backend
- Crear archivo .env en /backend

## 💡 Consejos Pro

1. **Split Editor:** `Ctrl + \` para dividir el editor
2. **Multi-Cursor:** `Alt + Click` para editar múltiples líneas
3. **Zen Mode:** `Ctrl + K` → `Z` para modo sin distracciones
4. **Terminal dividida:** En terminal, click en ➕ con split

---

**¡Todo listo para empezar a desarrollar!** 🎉

Si tienes problemas, revisa:
- `ESTRUCTURA-PROYECTO.md` - Estructura completa
- `INICIO-RAPIDO-BACKEND.txt` - Configurar backend
- `CONFIGURACION-BACKEND.md` - Conectar frontend + backend
