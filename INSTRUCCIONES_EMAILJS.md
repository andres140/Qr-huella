# Instrucciones para Configurar EmailJS - Recuperación de Contraseña

## Pasos para Configurar EmailJS

### 1. Crear cuenta en EmailJS
1. Ve a https://www.emailjs.com/
2. Crea una cuenta gratuita (permite hasta 200 emails/mes)
3. Confirma tu email

### 2. Configurar un Email Service
1. En el dashboard de EmailJS, ve a **"Email Services"**
2. Click en **"Add New Service"**
3. Selecciona tu proveedor de email:
   - **Gmail**: Requiere autenticación OAuth2
   - **Outlook**: Requiere autenticación OAuth2
   - **EmailJS**: Servicio de prueba (no requiere configuración adicional)
4. Sigue las instrucciones para conectar tu cuenta
5. **Copia el "Service ID"** (ejemplo: `service_abc123`)

### 3. Crear un Email Template
1. Ve a **"Email Templates"** en el menú
2. Click en **"Create New Template"**
3. Configura el template con estos datos:

**Subject (Asunto):**
```
Código de Recuperación - Sistema Huella
```

**Content (Contenido):**
```
Hola {{user_name}},

Has solicitado recuperar tu contraseña para el sistema Huella.

Tu código de verificación es: {{verification_code}}

Este código expirará en 10 minutos.

Si no solicitaste este código, puedes ignorar este mensaje.

Saludos,
Sistema Huella - Control de Acceso
```

4. **Variables del template** (deben coincidir exactamente):
   - `{{user_name}}` - Nombre del usuario
   - `{{verification_code}}` - Código de 6 dígitos
   - `{{to_email}}` - Email del destinatario (se envía automáticamente)

5. **Copia el "Template ID"** (ejemplo: `template_xyz789`)

### 4. Obtener tu Public Key
1. Ve a **"Account"** en el menú
2. En la sección **"API Keys"**, copia tu **"Public Key"**
   (ejemplo: `abcdefghijklmnop`)

### 5. Configurar en el Proyecto
1. Abre el archivo: `src/utils/emailConfig.ts`
2. Reemplaza los valores:

```typescript
export const EMAIL_CONFIG = {
  publicKey: 'TU_PUBLIC_KEY_AQUI',        // ← Reemplaza con tu Public Key
  serviceId: 'TU_SERVICE_ID_AQUI',         // ← Reemplaza con tu Service ID
  templateId: 'TU_TEMPLATE_ID_AQUI'        // ← Reemplaza con tu Template ID
};
```

**Ejemplo:**
```typescript
export const EMAIL_CONFIG = {
  publicKey: 'abcdefghijklmnop',
  serviceId: 'service_abc123',
  templateId: 'template_xyz789'
};
```

### 6. Verificar que Funciona
1. Reinicia el servidor de desarrollo
2. Ve a la pantalla de login
3. Click en "¿Olvidaste tu contraseña?"
4. Ingresa un email válido
5. Deberías recibir el correo con el código de verificación

## Solución de Problemas

### El email no se envía
- Verifica que las credenciales estén correctas en `emailConfig.ts`
- Revisa la consola del navegador para ver errores
- Verifica que el Service esté activo en EmailJS
- Asegúrate de que el template tenga las variables correctas

### Error: "Invalid public key"
- Verifica que copiaste correctamente el Public Key
- Asegúrate de que no haya espacios extra

### Error: "Service not found"
- Verifica que el Service ID sea correcto
- Asegúrate de que el servicio esté activo en EmailJS

### Error: "Template not found"
- Verifica que el Template ID sea correcto
- Asegúrate de que el template esté publicado (no en borrador)

## Notas Importantes

- **Límite gratuito**: 200 emails/mes
- **Seguridad**: Las credenciales están en el frontend, pero EmailJS es seguro para uso público
- **Producción**: Considera usar variables de entorno para las credenciales

