CREATE DATABASE IF NOT EXISTS sena_acceso;
USE sena_acceso;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  email VARCHAR(100),
  passwords VARCHAR(255),
  rol ENUM('GUARDA', 'ADMINISTRADOR') DEFAULT 'GUARDA',
  estado ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS estados_personas (
  id_estado_persona INT AUTO_INCREMENT PRIMARY KEY,
  nombre_estado VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS roles_personas (
  id_rol_persona INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol_persona VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS personas (
  id_persona INT AUTO_INCREMENT PRIMARY KEY,
  tipo_documento ENUM('CC', 'TI', 'CE', 'PASAPORTE') NOT NULL DEFAULT 'CC',
  documento VARCHAR(50) UNIQUE,
  nombres VARCHAR(100),
  apellidos VARCHAR(100),
  codigo_qr VARCHAR(255),
  programa VARCHAR(200),
  ficha VARCHAR(50),
  zona VARCHAR(200) COMMENT 'Zona o destino donde va la persona o visitante',
  foto VARCHAR(500) COMMENT 'Ruta del archivo de foto (formato: uploads/fotos/[documento]-[timestamp].jpg)',
  estado ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
  fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Hora exacta de registro de la persona',
  id_usuario INT,
  id_estado_persona INT,
  id_rol_persona INT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE SET NULL,
  FOREIGN KEY (id_estado_persona) REFERENCES estados_personas (id_estado_persona) ON DELETE SET NULL,
  FOREIGN KEY (id_rol_persona) REFERENCES roles_personas (id_rol_persona) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS registros_entrada_salida (
  id_registro_entrada_salida INT AUTO_INCREMENT PRIMARY KEY,
  id_persona INT,
  tipo ENUM('ENTRADA', 'SALIDA') NOT NULL,
  fecha_entrada TIMESTAMP NULL COMMENT 'Fecha y hora exacta de entrada',
  fecha_salida TIMESTAMP NULL COMMENT 'Fecha y hora exacta de salida',
  FOREIGN KEY (id_persona) REFERENCES personas (id_persona) ON DELETE CASCADE
);

