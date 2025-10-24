-- ============================================
-- SISTEMA DE CONTROL DE ACCESO SENA - HUELLA
-- Base de Datos MySQL
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS huella_sena CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE huella_sena;

-- ============================================
-- TABLA: users (Usuarios del Sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('GUARDA', 'ADMINISTRADOR') NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: persons (Personas Autorizadas)
-- ============================================
CREATE TABLE IF NOT EXISTS persons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200),
    documento VARCHAR(50) NOT NULL UNIQUE,
    tipo_documento ENUM('CC', 'TI', 'CE', 'PASAPORTE') NOT NULL,
    programa VARCHAR(255),
    ficha VARCHAR(100),
    rol ENUM('ESTUDIANTE', 'INSTRUCTOR', 'ADMINISTRATIVO', 'VISITANTE') NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO', 'EN FORMACION', 'APLAZADO', 'CANCELADO', 'SUSPENDIDO', 'RETIRO VOLUNTARIO', 'POR CERTIFICAR', 'CERTIFICADO') DEFAULT 'ACTIVO',
    tipo_sangre ENUM('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-') NOT NULL,
    foto TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_documento (documento),
    INDEX idx_rol (rol),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: access_records (Registros de Acceso)
-- ============================================
CREATE TABLE IF NOT EXISTS access_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    persona_id INT NOT NULL,
    tipo ENUM('ENTRADA', 'SALIDA') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ubicacion VARCHAR(255) NOT NULL,
    codigo_qr VARCHAR(500) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_persona_id (persona_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_tipo (tipo),
    FOREIGN KEY (persona_id) REFERENCES persons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: visitor_qrs (Códigos QR de Visitantes)
-- ============================================
CREATE TABLE IF NOT EXISTS visitor_qrs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitante_id INT NOT NULL,
    codigo_qr TEXT NOT NULL,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    estado ENUM('ACTIVO', 'EXPIRADO', 'USADO') DEFAULT 'ACTIVO',
    generado_por INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_visitante_id (visitante_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_expiracion (fecha_expiracion),
    FOREIGN KEY (visitante_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY (generado_por) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: chat_messages (Mensajes del Chat)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    sender_name VARCHAR(200) NOT NULL,
    sender_role ENUM('GUARDA', 'ADMINISTRADOR') NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    INDEX idx_sender_id (sender_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_leido (leido),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS INICIALES: Usuario Administrador por defecto
-- ============================================
-- Contraseña: admin123 (debes cambiarla en producción)
INSERT INTO users (usuario, nombre, email, password, rol, estado) 
VALUES ('admin', 'Administrador Principal', 'admin@huella.com', '$2b$10$rBV2KlXa6fRJZPz5v.Pz7.XvkqHPPw9pRU8JzGZQKHjXqKVQp7GKm', 'ADMINISTRADOR', 'ACTIVO')
ON DUPLICATE KEY UPDATE usuario=usuario;

-- ============================================
-- VISTA: Estadísticas de Acceso
-- ============================================
CREATE OR REPLACE VIEW vista_estadisticas AS
SELECT 
    DATE(ar.timestamp) as fecha,
    COUNT(*) as total_accesos,
    COUNT(DISTINCT ar.persona_id) as personas_unicas,
    SUM(CASE WHEN ar.tipo = 'ENTRADA' THEN 1 ELSE 0 END) as total_entradas,
    SUM(CASE WHEN ar.tipo = 'SALIDA' THEN 1 ELSE 0 END) as total_salidas,
    SUM(CASE WHEN p.rol = 'ESTUDIANTE' AND ar.tipo = 'ENTRADA' THEN 1 ELSE 0 END) as entradas_estudiantes,
    SUM(CASE WHEN p.rol = 'INSTRUCTOR' AND ar.tipo = 'ENTRADA' THEN 1 ELSE 0 END) as entradas_instructores,
    SUM(CASE WHEN p.rol = 'ADMINISTRATIVO' AND ar.tipo = 'ENTRADA' THEN 1 ELSE 0 END) as entradas_administrativos,
    SUM(CASE WHEN p.rol = 'VISITANTE' AND ar.tipo = 'ENTRADA' THEN 1 ELSE 0 END) as entradas_visitantes
FROM access_records ar
INNER JOIN persons p ON ar.persona_id = p.id
GROUP BY DATE(ar.timestamp);

-- ============================================
-- PROCEDIMIENTO: Limpiar QRs Expirados
-- ============================================
DELIMITER $$

CREATE PROCEDURE limpiar_qrs_expirados()
BEGIN
    UPDATE visitor_qrs 
    SET estado = 'EXPIRADO' 
    WHERE fecha_expiracion < NOW() AND estado = 'ACTIVO';
END$$

DELIMITER ;

-- ============================================
-- EVENTO: Ejecutar limpieza automática cada hora
-- ============================================
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS evento_limpiar_qrs
ON SCHEDULE EVERY 1 HOUR
DO CALL limpiar_qrs_expirados();

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
