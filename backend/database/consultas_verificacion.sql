-- Consultas SQL para verificar datos en la base de datos
-- Ejecutar estas consultas en MySQL Workbench para verificar el contenido

-- 1. Ver todos los usuarios
SELECT 
  id_usuario,
  nombre,
  email,
  rol,
  estado,
  fecha_creacion,
  ultimo_acceso
FROM usuarios
ORDER BY id_usuario;

-- 2. Ver todos los roles de personas
SELECT * FROM roles_personas ORDER BY id_rol_persona;

-- 3. Ver todos los estados de personas
SELECT * FROM estados_personas ORDER BY id_estado_persona;

-- 4. Ver todas las personas con sus roles y estados
SELECT 
  p.id_persona,
  p.tipo_documento,
  p.documento,
  p.nombres,
  p.apellidos,
  p.codigo_qr,
  p.programa,
  p.ficha,
  p.estado,
  rp.nombre_rol_persona as rol,
  ep.nombre_estado as estado_persona
FROM personas p
LEFT JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
LEFT JOIN estados_personas ep ON p.id_estado_persona = ep.id_estado_persona
ORDER BY p.id_persona DESC;

-- 5. Ver aprendices (personas con rol APRENDIZ o ESTUDIANTE)
SELECT 
  p.id_persona,
  p.nombres,
  p.apellidos,
  p.documento,
  p.codigo_qr,
  p.programa,
  p.ficha,
  p.estado,
  rp.nombre_rol_persona as rol
FROM personas p
INNER JOIN roles_personas rp ON p.id_rol_persona = rp.id_rol_persona
WHERE LOWER(rp.nombre_rol_persona) LIKE '%aprendiz%' 
   OR LOWER(rp.nombre_rol_persona) LIKE '%estudiante%'
ORDER BY p.nombres;

-- 6. Ver registros de entrada/salida
SELECT 
  r.id_registro_entrada_salida,
  r.id_persona,
  r.tipo,
  r.fecha_entrada,
  r.fecha_salida,
  p.nombres,
  p.apellidos,
  p.documento,
  p.codigo_qr
FROM registros_entrada_salida r
INNER JOIN personas p ON r.id_persona = p.id_persona
ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC
LIMIT 50;

-- 7. Ver registros de entrada/salida de hoy
SELECT 
  r.id_registro_entrada_salida,
  r.id_persona,
  r.tipo,
  r.fecha_entrada,
  r.fecha_salida,
  p.nombres,
  p.apellidos,
  p.documento
FROM registros_entrada_salida r
INNER JOIN personas p ON r.id_persona = p.id_persona
WHERE DATE(r.fecha_entrada) = CURDATE() OR DATE(r.fecha_salida) = CURDATE()
ORDER BY COALESCE(r.fecha_entrada, r.fecha_salida) DESC;

-- 8. Contar personas por rol
SELECT 
  rp.nombre_rol_persona as rol,
  COUNT(p.id_persona) as total
FROM roles_personas rp
LEFT JOIN personas p ON rp.id_rol_persona = p.id_rol_persona
GROUP BY rp.id_rol_persona, rp.nombre_rol_persona
ORDER BY total DESC;

-- 9. Contar registros de entrada/salida por tipo
SELECT 
  tipo,
  COUNT(*) as total
FROM registros_entrada_salida
GROUP BY tipo;

-- 10. Ver último registro de cada persona
SELECT 
  p.id_persona,
  p.nombres,
  p.apellidos,
  p.documento,
  r.tipo as ultimo_tipo,
  r.fecha_entrada as ultima_fecha_entrada,
  r.fecha_salida as ultima_fecha_salida
FROM personas p
LEFT JOIN (
  SELECT 
    id_persona,
    tipo,
    fecha_entrada,
    fecha_salida,
    ROW_NUMBER() OVER (PARTITION BY id_persona ORDER BY COALESCE(fecha_entrada, fecha_salida) DESC) as rn
  FROM registros_entrada_salida
) r ON p.id_persona = r.id_persona AND r.rn = 1
ORDER BY p.nombres;

