# 🔧 Guía Completa: Conectar Frontend con Backend MySQL

Esta guía te ayudará a migrar tu aplicación de localStorage a MySQL con backend.

## 📋 Índice

1. [Configurar Backend](#1-configurar-backend)
2. [Configurar Base de Datos](#2-configurar-base-de-datos)
3. [Modificar Frontend](#3-modificar-frontend)
4. [Probar Integración](#4-probar-integración)

---

## 1. Configurar Backend

### Paso 1.1: Instalar MySQL

1. Descarga MySQL desde: https://dev.mysql.com/downloads/mysql/
2. Durante la instalación, configura:
   - **Password**: Elige una contraseña segura (la necesitarás después)
   - **Puerto**: Deja el predeterminado (3306)
   - **Usuario**: root

3. Descarga MySQL Workbench: https://dev.mysql.com/downloads/workbench/

### Paso 1.2: Crear Base de Datos

1. Abre **MySQL Workbench**
2. Crea una nueva conexión:
   - Host: `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: (la que configuraste)

3. Conéctate y ejecuta el script:
   - Abre el archivo `/backend/database/schema.sql`
   - Clic en ⚡ (Execute)
   - Verifica que se crearon las tablas

### Paso 1.3: Configurar Variables de Entorno

1. Navega a la carpeta `backend`:
```bash
cd backend
```

2. Crea el archivo `.env` (copia de `.env.example`):
```bash
copy .env.example .env
```

3. Edita `.env` con tus datos:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_PASSWORD_MYSQL_AQUI
DB_NAME=huella_sena

JWT_SECRET=cambia_esto_por_algo_super_seguro_y_aleatorio_12345
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:5173

MAX_FILE_SIZE=10485760
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Paso 1.4: Instalar Dependencias del Backend

```bash
# En la carpeta backend
npm install
```

### Paso 1.5: Iniciar el Backend

```bash
npm run dev
```

Deberías ver:
```
╔═══════════════════════════════════════════════════════════════╗
║       🟢 SERVIDOR HUELLA SENA - INICIADO CORRECTAMENTE       ║
╚═══════════════════════════════════════════════════════════════╝
🚀 Servidor corriendo en: http://localhost:5000
```

✅ **¡Backend funcionando!** Deja esta terminal abierta.

---

## 2. Configurar Base de Datos

### Paso 2.1: Verificar Tablas Creadas

En MySQL Workbench, ejecuta:
```sql
USE huella_sena;
SHOW TABLES;
```

Deberías ver:
- `users`
- `persons`
- `access_records`
- `visitor_qrs`
- `chat_messages`

### Paso 2.2: Verificar Usuario Administrador

```sql
SELECT * FROM users;
```

Debe existir:
- Email: `admin@huella.com`
- Rol: `ADMINISTRADOR`
- Estado: `ACTIVO`

**Contraseña por defecto:** `admin123`

### Paso 2.3: (Opcional) Migrar Datos de localStorage

Si ya tienes datos en localStorage y quieres migrarlos:

1. Abre la aplicación actual (con localStorage)
2. Abre la consola del navegador (F12)
3. Ejecuta:
```javascript
// Obtener personas
console.log(JSON.parse(localStorage.getItem('sena_personas')));

// Obtener usuarios
console.log(JSON.parse(localStorage.getItem('sena_users')));

// Obtener registros de acceso
console.log(JSON.parse(localStorage.getItem('sena_access_records')));
```

4. Copia los datos e insértalos manualmente en la BD usando MySQL Workbench

---

## 3. Modificar Frontend

Ahora vamos a conectar el frontend React con el backend.

### Paso 3.1: Crear Servicio API

Voy a crear un archivo de servicios API que manejará todas las peticiones al backend.

El archivo se creará en: `/utils/api.ts`

Este archivo contendrá funciones para:
- Autenticación (login, register)
- CRUD de usuarios
- CRUD de personas
- Registros de acceso
- QRs de visitantes
- Chat
- Estadísticas

### Paso 3.2: Modificar App.tsx

Cambiaremos:
- ❌ `localStorage` 
- ✅ Llamadas a la API del backend

### Paso 3.3: Agregar Manejo de Tokens

Implementaremos:
- Almacenamiento del token JWT
- Interceptor para agregar token a peticiones
- Manejo de sesión expirada
- Auto-logout si el token es inválido

---

## 4. Probar Integración

### Paso 4.1: Iniciar Backend y Frontend

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd ..
npm run dev
```

### Paso 4.2: Probar Login

1. Abre `http://localhost:5173`
2. Inicia sesión con:
   - Email: `admin@huella.com`
   - Password: `admin123`

3. Si funciona, verás el dashboard

### Paso 4.3: Probar Funcionalidades

✅ **Registrar Usuario:**
- Crear un usuario Guarda
- Cerrar sesión
- Iniciar con el nuevo usuario

✅ **Gestión de Personas:**
- Agregar una persona
- Editar persona
- Eliminar persona

✅ **Escaneo QR:**
- Generar QR para visitante
- Escanear código
- Verificar registro de acceso

✅ **Chat:**
- Enviar mensaje como Admin
- Cerrar sesión e iniciar como Guarda
- Ver mensaje sin leer
- Responder

✅ **Estadísticas:**
- Ver dashboard
- Verificar que las tarjetas muestran datos reales

### Paso 4.4: Verificar en la Base de Datos

En MySQL Workbench:
```sql
-- Ver usuarios
SELECT * FROM users;

-- Ver personas
SELECT * FROM persons;

-- Ver registros de acceso
SELECT * FROM access_records ORDER BY timestamp DESC LIMIT 10;

-- Ver estadísticas
SELECT * FROM vista_estadisticas;
```

---

## 🎯 Siguiente Paso

¿Quieres que proceda a:

**Opción A:** Crear el servicio API (`/utils/api.ts`) y modificar el frontend para conectarlo con el backend?

**Opción B:** Primero probar que el backend funciona correctamente con herramientas como Postman?

**Opción C:** Ambas cosas paso a paso?

---

## 📞 Solución de Problemas Comunes

### Backend no inicia

**Error:** `Cannot connect to database`
- Verifica que MySQL esté corriendo
- Revisa el archivo `.env`, especialmente `DB_PASSWORD`

**Error:** `Port 5000 already in use`
- Cambia el puerto en `.env`: `PORT=5001`

### Frontend no conecta con Backend

**Error:** `CORS error`
- Verifica `CORS_ORIGIN` en `.env` del backend
- Debe ser: `http://localhost:5173`

**Error:** `Network Error`
- Verifica que el backend esté corriendo
- Revisa la URL en el código del frontend

### Autenticación no funciona

**Error:** `Invalid credentials`
- Verifica el email y password
- Comprueba en MySQL: `SELECT * FROM users;`

**Error:** `Token invalid`
- El token expiró (24h por defecto)
- Cierra sesión e inicia de nuevo

---

## 🔄 Diagrama de Flujo

```
┌─────────────────┐
│  Frontend React │
│  (Puerto 5173)  │
└────────┬────────┘
         │
         │ HTTP Requests
         │ (con JWT Token)
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  (Puerto 5000)  │
│  Express.js     │
└────────┬────────┘
         │
         │ SQL Queries
         │
         ▼
┌─────────────────┐
│  MySQL Database │
│  huella_sena    │
│  (Puerto 3306)  │
└─────────────────┘
```

---

**¿Listo para continuar?** Dime qué opción prefieres (A, B o C) y procederemos. 🚀
