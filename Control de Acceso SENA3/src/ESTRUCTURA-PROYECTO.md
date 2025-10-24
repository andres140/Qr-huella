# 📁 Estructura del Proyecto Huella SENA

## ✅ Estructura Corregida

El proyecto ahora está organizado correctamente para trabajar con Visual Studio Code:

```
huella-sena/
│
├── 📂 backend/                      # Backend Node.js + Express + MySQL
│   ├── config/
│   │   └── database.js              # Configuración de MySQL
│   ├── database/
│   │   └── schema.sql               # Script SQL de la BD
│   ├── middleware/
│   │   └── auth.middleware.js       # Middleware JWT
│   ├── routes/                      # Rutas de la API
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── person.routes.js
│   │   ├── access.routes.js
│   │   ├── visitorQR.routes.js
│   │   ├── chat.routes.js
│   │   └── stats.routes.js
│   ├── .env                         # Variables de entorno (CREAR)
│   ├── .env.example                 # Ejemplo de configuración
│   ├── package.json
│   └── server.js                    # Servidor principal
│
├── 📂 src/                          # Frontend React + TypeScript
│   ├── App.tsx                      # Componente principal
│   ├── main.tsx                     # Punto de entrada
│   ├── types/
│   │   └── index.ts                 # Interfaces TypeScript
│   ├── data/
│   │   └── mockData.ts              # Funciones de datos
│   ├── utils/
│   │   ├── emailConfig.ts           # Config EmailJS
│   │   └── supabase/
│   │       └── info.tsx             # Config Supabase (opcional)
│
├── 📂 components/                   # Componentes React
│   ├── AdminView.tsx
│   ├── GuardView.tsx
│   ├── LoginForm.tsx
│   ├── Dashboard.tsx
│   ├── PersonManagement.tsx
│   ├── UserManagement.tsx
│   ├── QRScanner.tsx
│   ├── ReportExporter.tsx
│   ├── Chat.tsx
│   ├── figma/
│   │   └── ImageWithFallback.tsx
│   └── ui/                          # Componentes shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ... (50+ componentes)
│
├── 📂 styles/
│   └── globals.css                  # Estilos globales Tailwind
│
├── 📂 supabase/                     # Supabase Edge Functions (opcional)
│   └── functions/
│
├── 📄 index.html                    # HTML principal
├── 📄 package.json                  # Dependencias del frontend
├── 📄 tsconfig.json                 # Config TypeScript
├── 📄 vite.config.ts                # Config Vite
│
├── 📚 Documentación/
│   ├── INICIO-AQUI.txt
│   ├── INICIO-RAPIDO-BACKEND.txt
│   ├── CONFIGURACION-BACKEND.md
│   ├── MYSQL-WORKBENCH-PASO-A-PASO.txt
│   ├── RESUMEN-BACKEND.md
│   └── INSTRUCCIONES-EMAILJS.txt
│
└── 📝 README files varios

```

## 🔧 Configuración en VS Code

### Paso 1: Abrir el Proyecto

1. Abre Visual Studio Code
2. File → Open Folder
3. Selecciona la carpeta raíz del proyecto
4. VS Code cargará toda la estructura

### Paso 2: Instalar Extensiones Recomendadas

Instala estas extensiones para mejor experiencia:

- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **TypeScript and JavaScript Language Features** (viene incluido)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)
- **Path Intellisense** (christian-kohler.path-intellisense)

### Paso 3: Configurar Terminales

VS Code te permite tener múltiples terminales abiertas:

**Terminal 1 - Frontend:**
```bash
npm install    # Primera vez
npm run dev    # Para iniciar
```

**Terminal 2 - Backend:**
```bash
cd backend
npm install    # Primera vez
npm run dev    # Para iniciar
```

Para abrir nueva terminal: `Terminal` → `New Terminal` o `Ctrl + Shift + Ñ`

## 📝 Archivos Importantes

### Frontend

| Archivo | Descripción |
|---------|-------------|
| `/src/App.tsx` | Componente principal de la app |
| `/src/main.tsx` | Punto de entrada React |
| `/src/types/index.ts` | Todas las interfaces TypeScript |
| `/components/*.tsx` | Componentes de UI |
| `/styles/globals.css` | Estilos Tailwind |
| `/package.json` | Dependencias del frontend |
| `/vite.config.ts` | Configuración de Vite |
| `/tsconfig.json` | Configuración TypeScript |

### Backend

| Archivo | Descripción |
|---------|-------------|
| `/backend/server.js` | Servidor Express |
| `/backend/.env` | Variables de entorno (crear desde .env.example) |
| `/backend/database/schema.sql` | Base de datos MySQL |
| `/backend/routes/*.js` | Endpoints de la API |
| `/backend/package.json` | Dependencias del backend |

## 🚀 Comandos Útiles

### Frontend (Raíz del Proyecto)

```bash
# Instalar dependencias
npm install

# Modo desarrollo (con hot-reload)
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

### Backend (Carpeta /backend)

```bash
# Instalar dependencias
npm install

# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

## 🐛 Solución de Errores Comunes

### ❌ Error: "Cannot find module '../types'"

**Solución:** Los archivos ya están en la ubicación correcta (`/src/types/`)

### ❌ Error: "Cannot find module '../components/...'"

**Solución:** Los componentes están en `/components/` (raíz) y se importan desde `/src/App.tsx` con rutas relativas `../components/`

### ❌ Error en VS Code: "Cannot find name 'React'"

**Solución:** 
1. Cierra y vuelve a abrir VS Code
2. En VS Code: `Ctrl + Shift + P` → "TypeScript: Restart TS Server"

### ❌ Errores de TypeScript en todos los archivos

**Solución:**
1. Ejecuta `npm install` en la raíz
2. Reinicia VS Code
3. Asegúrate de que `tsconfig.json` existe

### ❌ Error: "Module not found: Can't resolve './styles/globals.css'"

**Solución:** El archivo `/src/main.tsx` ya importa correctamente: `import '../styles/globals.css'`

## 📦 Dependencias del Proyecto

### Frontend (React + TypeScript + Vite)
- React 18
- TypeScript
- Vite (bundler)
- Tailwind CSS 4
- shadcn/ui components
- Lucide React (iconos)
- html5-qrcode (escáner QR)
- qrcode (generador QR)
- xlsx (Excel)
- EmailJS
- Y más...

### Backend (Node.js + Express + MySQL)
- Express.js
- MySQL2
- bcrypt (encriptación)
- jsonwebtoken (JWT)
- helmet (seguridad)
- cors
- multer (upload archivos)
- xlsx (Excel)
- Y más...

## 🎯 Flujo de Trabajo Recomendado

1. **Primera vez:**
   ```bash
   # Instalar frontend
   npm install
   
   # Instalar backend
   cd backend
   npm install
   cd ..
   ```

2. **Desarrollo diario:**
   
   **Terminal 1:**
   ```bash
   npm run dev
   ```
   
   **Terminal 2:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Hacer cambios:**
   - Edita archivos en `/src` para frontend
   - Edita archivos en `/backend` para backend
   - Guarda y verás los cambios en tiempo real

## 🔄 Rutas de Importación

En archivos dentro de `/src`:
```typescript
// ✅ Correcto
import { User } from './types';
import { mockData } from './data/mockData';
import { EMAIL_CONFIG } from './utils/emailConfig';
```

En archivos dentro de `/components`:
```typescript
// ✅ Correcto
import { User } from '../src/types';
import { Button } from './ui/button';
```

En `/src/App.tsx`:
```typescript
// ✅ Correcto
import { LoginForm } from '../components/LoginForm';
import { User } from './types';
```

## 📖 Próximos Pasos

1. ✅ Estructura organizada
2. ⏳ Configurar backend MySQL (ver INICIO-RAPIDO-BACKEND.txt)
3. ⏳ Conectar frontend con backend
4. ⏳ Probar toda la aplicación

---

**¿Necesitas ayuda?** Revisa los archivos de documentación en la raíz del proyecto.
