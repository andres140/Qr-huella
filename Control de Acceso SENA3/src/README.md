# 🎯 Huella - Sistema de Control de Acceso SENA

Sistema completo de control de acceso con códigos QR, gestión de personas, reportes y estadísticas en tiempo real.

## 🚀 Inicio Rápido

### 1. Abrir en Visual Studio Code

```bash
code .
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Iniciar Aplicación

```bash
npm run dev
```

La aplicación se abrirá en: `http://localhost:5173`

## 📚 Documentación

| Archivo | Descripción |
|---------|-------------|
| **[📖 LEEME-PRIMERO-VSCODE.txt](LEEME-PRIMERO-VSCODE.txt)** | ⭐ Empieza aquí - Guía rápida |
| [INICIO-CON-VSCODE.md](INICIO-CON-VSCODE.md) | Guía completa de VS Code |
| [ESTRUCTURA-PROYECTO.md](ESTRUCTURA-PROYECTO.md) | Estructura del proyecto |
| [SOLUCION-ERRORES-VSCODE.md](SOLUCION-ERRORES-VSCODE.md) | Solución de problemas |
| [CAMBIOS-REALIZADOS.md](CAMBIOS-REALIZADOS.md) | Registro de cambios |

### Backend con MySQL

| Archivo | Descripción |
|---------|-------------|
| [INICIO-RAPIDO-BACKEND.txt](INICIO-RAPIDO-BACKEND.txt) | Inicio rápido del backend |
| [CONFIGURACION-BACKEND.md](CONFIGURACION-BACKEND.md) | Configuración completa |
| [MYSQL-WORKBENCH-PASO-A-PASO.txt](MYSQL-WORKBENCH-PASO-A-PASO.txt) | Guía MySQL visual |
| [backend/README.md](backend/README.md) | Documentación del backend |

## ✨ Características

### Frontend (React + TypeScript)
- ✅ Sistema de autenticación (Admin/Guarda)
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de personas (CRUD completo)
- ✅ Gestión de usuarios
- ✅ Escaneo de códigos QR
- ✅ Generación de QR para visitantes
- ✅ Chat entre Admin y Guarda
- ✅ Reportes exportables (PDF/Excel)
- ✅ Carga masiva desde Excel/CSV
- ✅ LocalStorage para persistencia

### Backend (Node.js + Express + MySQL)
- ✅ API REST completa (42 endpoints)
- ✅ Autenticación JWT
- ✅ Base de datos MySQL
- ✅ Seguridad robusta (bcrypt, helmet, cors)
- ✅ Carga masiva de datos
- ✅ Sistema de roles y permisos

## 🛠️ Tecnologías

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS 4
- shadcn/ui
- Lucide React (iconos)
- html5-qrcode
- xlsx
- jsPDF

### Backend
- Node.js
- Express.js
- MySQL 8
- JWT (jsonwebtoken)
- bcrypt
- helmet
- cors

## 📂 Estructura del Proyecto

```
huella-sena/
├── src/                    # Código React principal
│   ├── App.tsx
│   ├── main.tsx
│   ├── types/              # Interfaces TypeScript
│   ├── data/               # Funciones de datos
│   └── utils/              # Utilidades
├── components/             # Componentes React
│   ├── AdminView.tsx
│   ├── GuardView.tsx
│   ├── LoginForm.tsx
│   └── ui/                 # Componentes shadcn/ui
├── backend/                # Backend Node.js + MySQL
│   ├── routes/             # Endpoints API
│   ├── config/             # Configuración
│   ├── database/           # SQL scripts
│   └── server.js
├── styles/                 # Estilos Tailwind
└── .vscode/               # Configuración VS Code
```

## 🎯 Modos de Uso

### Modo 1: Solo Frontend (LocalStorage)

**Ideal para:** Desarrollo, pruebas, demostración

```bash
npm install
npm run dev
```

Los datos se guardan en localStorage del navegador.

### Modo 2: Frontend + Backend (MySQL)

**Ideal para:** Producción, múltiples usuarios, persistencia real

**Frontend:**
```bash
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

Requiere configurar MySQL. Ver [INICIO-RAPIDO-BACKEND.txt](INICIO-RAPIDO-BACKEND.txt)

## 👥 Usuarios de Prueba

Cuando uses el backend con MySQL, se crea un usuario por defecto:

- **Email:** `admin@huella.com`
- **Contraseña:** `admin123`
- **Rol:** Administrador

⚠️ Cambia esta contraseña en producción.

## 🔧 Scripts Disponibles

### Frontend

```bash
npm run dev         # Modo desarrollo
npm run build       # Compilar para producción
npm run preview     # Vista previa de producción
```

### Backend

```bash
npm run dev         # Modo desarrollo (con nodemon)
npm start           # Modo producción
```

## 🌟 Funcionalidades Destacadas

### Dashboard Inteligente
- Estadísticas en tiempo real
- Contador de personas dentro
- Gráficos de accesos
- Filtros por rol y fecha

### Escáner QR
- Escaneo con cámara o subida de imagen
- Registro automático de entrada/salida
- Validación de permisos
- Historial completo

### Gestión Avanzada
- Carga masiva desde Excel/CSV
- Exportación de reportes
- Sistema de estados múltiples
- Búsqueda y filtros avanzados

### Seguridad
- Autenticación JWT
- Roles y permisos
- Encriptación de contraseñas
- Validación de datos

## 📱 Responsive Design

La aplicación funciona perfectamente en:
- 💻 Desktop
- 📱 Tablet
- 📱 Móvil

## 🐛 Solución de Problemas

### Errores comunes:

**Errores de TypeScript:**
```
Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

**Dependencias faltantes:**
```bash
npm install
```

**Puerto en uso:**
Cambia el puerto en `vite.config.ts` o cierra la app que lo usa.

Ver documentación completa: [SOLUCION-ERRORES-VSCODE.md](SOLUCION-ERRORES-VSCODE.md)

## 📄 Licencia

Este proyecto fue desarrollado para el SENA.

## 🤝 Contribuir

1. Revisa la estructura del proyecto
2. Haz tus cambios
3. Prueba que todo funcione
4. Documenta cambios importantes

## 📞 Soporte

Revisa la documentación:
- `LEEME-PRIMERO-VSCODE.txt` - Inicio rápido
- `SOLUCION-ERRORES-VSCODE.md` - Errores comunes
- `ESTRUCTURA-PROYECTO.md` - Estructura completa

---

**Desarrollado con ❤️ para SENA**

**Stack:** React + TypeScript + Vite + Tailwind CSS + Node.js + Express + MySQL

**Estado:** ✅ Producción Ready
