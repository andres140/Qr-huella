# 🚀 Backend API - Sistema Huella SENA

Backend API REST para el Sistema de Control de Acceso Huella - SENA, construido con Node.js, Express y MySQL.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Endpoints de la API](#endpoints-de-la-api)
- [Estructura del Proyecto](#estructura-del-proyecto)

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v16 o superior) - [Descargar](https://nodejs.org/)
- **MySQL** (v8.0 o superior) - [Descargar](https://dev.mysql.com/downloads/)
- **MySQL Workbench** (Opcional, pero recomendado) - [Descargar](https://dev.mysql.com/downloads/workbench/)

## 📦 Instalación

### Paso 1: Configurar la Base de Datos

1. Abre **MySQL Workbench**
2. Conéctate a tu servidor MySQL local
3. Abre el archivo `database/schema.sql`
4. Ejecuta todo el script (esto creará la base de datos, tablas y datos iniciales)

**Usuario Administrador por Defecto:**
- Email: `admin@huella.com`
- Contraseña: `admin123`

> ⚠️ **IMPORTANTE:** Cambia esta contraseña en producción

### Paso 2: Instalar Dependencias

```bash
# Navega a la carpeta backend
cd backend

# Instala las dependencias
npm install
```

### Paso 3: Configurar Variables de Entorno

1. Copia el archivo `.env.example` y renómbralo a `.env`:
```bash
cp .env.example .env
```

2. Edita el archivo `.env` con tus configuraciones:

```env
# Puerto del servidor
PORT=5000

# Configuración de MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=huella_sena

# JWT Secret (genera uno seguro)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=24h

# CORS - URL del frontend
CORS_ORIGIN=http://localhost:5173
```

**Para generar un JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🚀 Uso

### Modo Desarrollo (con auto-reload)

```bash
npm run dev
```

### Modo Producción

```bash
npm start
```

El servidor iniciará en: `http://localhost:5000`

## 📡 Endpoints de la API

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/forgot-password` | Recuperar contraseña | No |

### Usuarios

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | Listar usuarios | Admin |
| GET | `/api/users/:id` | Obtener usuario | Token |
| POST | `/api/users` | Crear usuario | Admin |
| PUT | `/api/users/:id` | Actualizar usuario | Admin |
| DELETE | `/api/users/:id` | Eliminar usuario | Admin |

### Personas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/persons` | Listar personas | Token |
| GET | `/api/persons/:id` | Obtener persona | Token |
| GET | `/api/persons/documento/:doc` | Buscar por documento | Token |
| POST | `/api/persons` | Crear persona | Admin |
| POST | `/api/persons/bulk` | Carga masiva Excel/CSV | Admin |
| PUT | `/api/persons/:id` | Actualizar persona | Admin |
| DELETE | `/api/persons/:id` | Eliminar persona | Admin |

### Registros de Acceso

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/access` | Listar registros | Token |
| GET | `/api/access/today` | Registros de hoy | Token |
| GET | `/api/access/person/:id` | Historial de persona | Token |
| POST | `/api/access` | Registrar acceso | Token |

### QRs de Visitantes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/visitor-qrs` | Listar QRs | Token |
| GET | `/api/visitor-qrs/active` | QRs activos | Token |
| POST | `/api/visitor-qrs` | Generar QR | Token |
| PUT | `/api/visitor-qrs/:id/status` | Actualizar estado | Token |
| DELETE | `/api/visitor-qrs/:id` | Eliminar QR | Token |

### Chat

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/chat` | Obtener mensajes | Token |
| GET | `/api/chat/unread` | Mensajes no leídos | Token |
| POST | `/api/chat` | Enviar mensaje | Token |
| PUT | `/api/chat/mark-read` | Marcar como leído | Token |
| DELETE | `/api/chat/:id` | Eliminar mensaje | Token |

### Estadísticas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/stats` | Estadísticas generales | Token |
| GET | `/api/stats/daily` | Estadísticas diarias | Token |
| GET | `/api/stats/range` | Por rango de fechas | Token |
| GET | `/api/stats/summary` | Resumen del sistema | Token |

## 🔐 Autenticación

La API utiliza **JWT (JSON Web Tokens)** para autenticación.

### Cómo autenticarse:

1. **Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@huella.com",
  "password": "admin123"
}
```

2. **Respuesta:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

3. **Usar el token en peticiones:**
```bash
GET /api/persons
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📁 Estructura del Proyecto

```
backend/
├── config/
│   └── database.js          # Configuración de MySQL
├── middleware/
│   └── auth.middleware.js   # Middleware de autenticación
├── routes/
│   ├── auth.routes.js       # Rutas de autenticación
│   ├── user.routes.js       # Rutas de usuarios
│   ├── person.routes.js     # Rutas de personas
│   ├── access.routes.js     # Rutas de accesos
│   ├── visitorQR.routes.js  # Rutas de QRs visitantes
│   ├── chat.routes.js       # Rutas del chat
│   └── stats.routes.js      # Rutas de estadísticas
├── database/
│   └── schema.sql           # Script SQL de la BD
├── .env.example             # Ejemplo de variables de entorno
├── package.json
├── server.js                # Punto de entrada
└── README.md
```

## 🧪 Probar la API

Puedes usar herramientas como:

- **Postman** - [Descargar](https://www.postman.com/downloads/)
- **Thunder Client** (Extensión de VS Code)
- **cURL** (desde la terminal)

### Ejemplo con cURL:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@huella.com","password":"admin123"}'

# Obtener personas (con token)
curl http://localhost:5000/api/persons \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 🛠️ Solución de Problemas

### Error: "Cannot connect to MySQL"
- Verifica que MySQL esté corriendo
- Revisa las credenciales en el archivo `.env`
- Asegúrate de que la base de datos `huella_sena` existe

### Error: "Port 5000 already in use"
- Cambia el puerto en `.env`: `PORT=5001`
- O detén el proceso que usa el puerto 5000

### Error: "JWT secret is not defined"
- Asegúrate de configurar `JWT_SECRET` en el archivo `.env`

## 📞 Soporte

Si tienes problemas, revisa:
1. Los logs de la consola del servidor
2. Los logs de MySQL Workbench
3. Que todas las dependencias estén instaladas: `npm install`
4. Que el archivo `.env` esté configurado correctamente

---

**¡Listo!** Tu backend API está configurado y funcionando. 🎉

Ahora puedes conectar tu frontend React con este backend.
