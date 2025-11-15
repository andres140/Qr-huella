-- Migración: Agregar campos zona y foto a la tabla personas
-- Fecha: 2024
-- Descripción: Agrega los campos zona (destino de la persona/visitante) y foto (ruta del archivo de foto)

USE sena_acceso;

-- Verificar si la columna zona existe antes de agregarla
SET @zona_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'sena_acceso' 
    AND TABLE_NAME = 'personas' 
    AND COLUMN_NAME = 'zona'
);

SET @sql_zona = IF(@zona_exists = 0,
  'ALTER TABLE personas ADD COLUMN zona VARCHAR(200) NULL COMMENT ''Zona o destino donde va la persona o visitante'' AFTER ficha',
  'SELECT ''La columna zona ya existe'' AS mensaje'
);

PREPARE stmt FROM @sql_zona;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar si la columna foto existe antes de agregarla
SET @foto_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'sena_acceso' 
    AND TABLE_NAME = 'personas' 
    AND COLUMN_NAME = 'foto'
);

SET @sql_foto = IF(@foto_exists = 0,
  'ALTER TABLE personas ADD COLUMN foto VARCHAR(500) NULL COMMENT ''Ruta del archivo de foto (formato: uploads/fotos/[documento]-[timestamp].jpg)'' AFTER zona',
  'SELECT ''La columna foto ya existe'' AS mensaje'
);

PREPARE stmt FROM @sql_foto;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Mostrar confirmación
SELECT 'Migración completada: Campos zona y foto agregados a la tabla personas' AS resultado;

