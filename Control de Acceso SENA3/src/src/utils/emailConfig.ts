// Configuración de EmailJS
// Para obtener estas credenciales:
// 1. Regístrate en https://www.emailjs.com/
// 2. Crea un servicio de email (Gmail, Outlook, etc.)
// 3. Crea una plantilla de email
// 4. Reemplaza estos valores con tus credenciales reales

export const EMAIL_CONFIG = {
  // Tu Public Key de EmailJS (se encuentra en Account > API Keys)
  publicKey: 'TU_PUBLIC_KEY_AQUI',
  
  // Tu Service ID (se encuentra en Email Services)
  serviceId: 'TU_SERVICE_ID_AQUI',
  
  // Tu Template ID para recuperación de contraseña
  templateId: 'TU_TEMPLATE_ID_AQUI'
};

// INSTRUCCIONES PARA CONFIGURAR EMAILJS:
// 
// 1. Ir a https://www.emailjs.com/ y crear una cuenta gratuita
// 
// 2. Agregar un Email Service:
//    - Click en "Email Services" en el menú
//    - Click en "Add New Service"
//    - Selecciona tu proveedor (Gmail, Outlook, etc.)
//    - Sigue las instrucciones para conectar tu email
//    - Copia el "Service ID"
// 
// 3. Crear un Email Template:
//    - Click en "Email Templates" en el menú
//    - Click en "Create New Template"
//    - Usa este contenido para la plantilla:
//
//    Subject: Código de Recuperación - Huella
//    
//    Body:
//    Hola {{user_name}},
//    
//    Has solicitado recuperar tu contraseña para el sistema Huella.
//    
//    Tu código de verificación es: {{verification_code}}
//    
//    Este código expirará en 10 minutos.
//    
//    Si no solicitaste este código, puedes ignorar este mensaje.
//    
//    Saludos,
//    Sistema Huella - Control de Acceso
//
//    - Copia el "Template ID"
// 
// 4. Obtener tu Public Key:
//    - Click en "Account" en el menú
//    - Copia tu "Public Key"
// 
// 5. Reemplazar los valores en este archivo:
//    - publicKey: Tu Public Key
//    - serviceId: Tu Service ID  
//    - templateId: Tu Template ID
