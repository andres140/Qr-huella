import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-92a172dc/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// List all users endpoint (for debugging)
app.get("/make-server-92a172dc/list-users", async (c) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return c.json({ error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: usersData, error } = await supabase.auth.admin.listUsers();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    const users = usersData?.users || [];
    return c.json({ 
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at
      }))
    });
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

// User signup endpoint
app.post("/make-server-92a172dc/signup", async (c) => {
  try {
    const { email, password, nombre, rol } = await c.req.json();

    if (!email || !password || !nombre || !rol) {
      return c.json({ error: "Todos los campos son requeridos" }, 400);
    }

    // Validate email format
    if (!email.includes('@')) {
      return c.json({ error: "Email inválido" }, 400);
    }

    // Validate role
    if (rol !== 'GUARDA' && rol !== 'ADMINISTRADOR') {
      return c.json({ error: "Rol inválido" }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Error: Supabase credentials not configured');
      return c.json({ error: "Error de configuración del servidor" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate username from email
    const usuario = email.split('@')[0];

    // Check if user already exists in KV store
    const existingUserId = await kv.get(`user_by_email:${email.toLowerCase()}`);
    if (existingUserId) {
      console.log(`User already exists in KV store: ${email}`);
      return c.json({ 
        error: "Este email ya está registrado en el sistema. Por favor usa otro email o inicia sesión." 
      }, 400);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since we don't have email server configured
      user_metadata: { 
        nombre,
        rol,
        usuario
      }
    });

    if (authError) {
      console.error('Error creating user in Supabase Auth:', authError);
      
      // Handle specific error codes
      if (authError.code === 'email_exists' || authError.message.includes('already registered')) {
        // User exists in Auth but not in KV store - try to sync
        console.log(`User exists in Auth but not in KV, attempting to get user data: ${email}`);
        
        // Get the existing user from Auth
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
          // Store user data in KV store
          const userData = {
            id: existingUser.id,
            usuario,
            nombre,
            email,
            rol,
            estado: 'ACTIVO',
            fechaCreacion: new Date().toISOString()
          };

          await kv.set(`user:${existingUser.id}`, JSON.stringify(userData));
          await kv.set(`user_by_email:${email.toLowerCase()}`, existingUser.id);

          console.log(`Synced existing Auth user to KV store: ${email}`);

          return c.json({ 
            success: true,
            message: "Usuario registrado exitosamente",
            user: userData
          });
        }
        
        return c.json({ 
          error: "Este email ya está registrado. Por favor usa otro email o inicia sesión." 
        }, 400);
      }
      
      return c.json({ error: "Error al crear usuario: " + authError.message }, 500);
    }

    // Store additional user data in KV store
    const userData = {
      id: authData.user.id,
      usuario,
      nombre,
      email,
      rol,
      estado: 'ACTIVO',
      fechaCreacion: new Date().toISOString()
    };

    await kv.set(`user:${authData.user.id}`, JSON.stringify(userData));
    await kv.set(`user_by_email:${email.toLowerCase()}`, authData.user.id);

    console.log(`User registered successfully: ${email} with role ${rol}`);

    return c.json({ 
      success: true,
      message: "Usuario registrado exitosamente",
      user: userData
    });

  } catch (error) {
    console.error('Error in signup endpoint:', error);
    return c.json({ 
      error: "Error al procesar el registro: " + error.message 
    }, 500);
  }
});

// Get user data by ID
app.get("/make-server-92a172dc/user/:id", async (c) => {
  try {
    const userId = c.req.param('id');
    
    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      console.log(`User not found in KV store: ${userId}`);
      
      // Try to get user from Supabase Auth and sync
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: authUser, error } = await supabase.auth.admin.getUserById(userId);
        
        if (authUser && authUser.user) {
          console.log(`Found user in Auth, syncing to KV store: ${authUser.user.email}`);
          
          // Create user data from Auth metadata
          const syncedUserData = {
            id: authUser.user.id,
            usuario: authUser.user.user_metadata?.usuario || authUser.user.email?.split('@')[0] || 'usuario',
            nombre: authUser.user.user_metadata?.nombre || 'Usuario',
            email: authUser.user.email || '',
            rol: authUser.user.user_metadata?.rol || 'GUARDA',
            estado: 'ACTIVO',
            fechaCreacion: authUser.user.created_at || new Date().toISOString()
          };
          
          // Save to KV store
          await kv.set(`user:${authUser.user.id}`, JSON.stringify(syncedUserData));
          if (authUser.user.email) {
            await kv.set(`user_by_email:${authUser.user.email.toLowerCase()}`, authUser.user.id);
          }
          
          console.log(`Successfully synced user to KV store: ${authUser.user.email}`);
          return c.json(syncedUserData);
        }
      }
      
      return c.json({ error: "Usuario no encontrado en el sistema" }, 404);
    }

    return c.json(JSON.parse(userData));

  } catch (error) {
    console.error('Error getting user data:', error);
    return c.json({ 
      error: "Error al obtener datos del usuario: " + error.message 
    }, 500);
  }
});

// Password recovery endpoint
app.post("/make-server-92a172dc/recover-password", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email es requerido" }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Error: Supabase credentials not configured');
      return c.json({ error: "Error de configuración del servidor" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from email
    const userId = await kv.get(`user_by_email:${email.toLowerCase()}`);
    
    if (!userId) {
      // Don't reveal if user exists or not for security
      return c.json({ 
        success: true,
        message: "Si el email existe en nuestro sistema, recibirás un correo con instrucciones" 
      });
    }

    // Get user data
    const userDataStr = await kv.get(`user:${userId}`);
    if (!userDataStr) {
      return c.json({ 
        success: true,
        message: "Si el email existe en nuestro sistema, recibirás un correo con instrucciones" 
      });
    }

    const userData = JSON.parse(userDataStr);

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey || resendApiKey === '') {
      console.error('Error: RESEND_API_KEY not configured or empty');
      return c.json({ 
        error: "El servicio de correo no está configurado. Por favor, contacta al administrador del sistema para configurar RESEND_API_KEY." 
      }, 500);
    }

    // Validate API key format (Resend keys start with 're_')
    if (!resendApiKey.startsWith('re_')) {
      console.error('Error: RESEND_API_KEY appears to be invalid (should start with re_)');
      return c.json({ 
        error: "La API key de correo no es válida. Por favor, contacta al administrador del sistema." 
      }, 500);
    }

    // Update user password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return c.json({ 
        error: "Error al actualizar la contraseña" 
      }, 500);
    }

    // Send email with Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SENA - Control de Acceso <onboarding@resend.dev>',
        to: [email],
        subject: 'Recuperación de Contraseña - SENA Control de Acceso',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                .credentials { background-color: #fff; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Recuperación de Contraseña</h1>
                  <p>SENA - Control de Acceso</p>
                </div>
                <div class="content">
                  <h2>Hola ${userData.nombre},</h2>
                  <p>Hemos recibido una solicitud para recuperar la contraseña de tu cuenta.</p>
                  
                  <div class="credentials">
                    <h3>Tus credenciales de acceso:</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Contraseña temporal:</strong> <code style="background: #e9ecef; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${tempPassword}</code></p>
                  </div>
                  
                  <p><strong>⚠️ Importante:</strong></p>
                  <ul>
                    <li>Por seguridad, te recomendamos cambiar esta contraseña temporal después de iniciar sesión.</li>
                    <li>Esta contraseña es válida inmediatamente.</li>
                    <li>Si no solicitaste este cambio, por favor contacta al administrador del sistema.</li>
                  </ul>
                  
                  <p>Si tienes alguna pregunta o necesitas ayuda adicional, no dudes en contactar al departamento de soporte.</p>
                  
                  <p>Saludos,<br>
                  <strong>Equipo SENA - Control de Acceso</strong></p>
                </div>
                <div class="footer">
                  <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                  <p>© ${new Date().getFullYear()} SENA - Servicio Nacional de Aprendizaje</p>
                </div>
              </div>
            </body>
          </html>
        `
      })
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Error sending email via Resend:', errorData);
      
      // Provide specific error message
      if (errorData.statusCode === 401 || errorData.name === 'validation_error') {
        return c.json({ 
          error: "La API key de Resend no es válida. Por favor, configura una API key válida de Resend." 
        }, 500);
      }
      
      return c.json({ 
        error: "Error al enviar el correo electrónico: " + (errorData.message || 'Error desconocido') 
      }, 500);
    }

    console.log(`Password recovery email sent successfully to ${email}`);
    
    return c.json({ 
      success: true,
      message: "Correo de recuperación enviado exitosamente" 
    });

  } catch (error) {
    console.error('Error in password recovery endpoint:', error);
    return c.json({ 
      error: "Error al procesar la solicitud de recuperación de contraseña: " + error.message 
    }, 500);
  }
});

// Emergency password reset endpoint (when email is not configured)
app.post("/make-server-92a172dc/emergency-reset", async (c) => {
  try {
    const { email, newPassword } = await c.req.json();

    if (!email || !newPassword) {
      return c.json({ error: "Email y nueva contraseña son requeridos" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Error: Supabase credentials not configured');
      return c.json({ error: "Error de configuración del servidor" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from email
    const userId = await kv.get(`user_by_email:${email.toLowerCase()}`);
    
    if (!userId) {
      return c.json({ 
        error: "No se encontró una cuenta con este email" 
      }, 404);
    }

    // Update user password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return c.json({ 
        error: "Error al actualizar la contraseña: " + updateError.message 
      }, 500);
    }

    console.log(`Password reset successfully for ${email}`);
    
    return c.json({ 
      success: true,
      message: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña." 
    });

  } catch (error) {
    console.error('Error in emergency reset endpoint:', error);
    return c.json({ 
      error: "Error al procesar la solicitud: " + error.message 
    }, 500);
  }
});

// Delete all users endpoint (DANGER: This will delete ALL users)
app.delete("/make-server-92a172dc/delete-all-users", async (c) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Error: Supabase credentials not configured');
      return c.json({ error: "Error de configuración del servidor" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting to delete all users...');

    // Get all users from Supabase Auth
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ 
        error: "Error al listar usuarios: " + listError.message 
      }, 500);
    }

    const users = usersData?.users || [];
    console.log(`Found ${users.length} users to delete`);
    
    let deletedCount = 0;
    const errors: string[] = [];

    // Delete each user
    for (const user of users) {
      try {
        console.log(`Deleting user: ${user.email} (${user.id})`);
        
        // Delete from Supabase Auth
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Error deleting user ${user.email}:`, deleteError);
          errors.push(`${user.email || user.id}: ${deleteError.message}`);
          continue;
        }

        // Delete from KV store
        try {
          await kv.del(`user:${user.id}`);
          if (user.email) {
            await kv.del(`user_by_email:${user.email.toLowerCase()}`);
          }
        } catch (kvError) {
          console.error(`Error deleting KV data for ${user.email}:`, kvError);
          // Continue anyway as Auth user is already deleted
        }

        deletedCount++;
        console.log(`Successfully deleted user: ${user.email}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error deleting user ${user.email}:`, errorMessage);
        errors.push(`${user.email || 'unknown'}: ${errorMessage}`);
      }
    }

    console.log(`Deletion complete: ${deletedCount} users deleted, ${errors.length} errors`);

    return c.json({ 
      success: true,
      message: `Eliminados ${deletedCount} de ${users.length} usuarios`,
      deletedCount: deletedCount,
      totalUsers: users.length,
      errors: errors.length > 0 ? errors : []
    }, 200);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in delete all users endpoint:', errorMessage);
    return c.json({ 
      error: "Error al eliminar usuarios: " + errorMessage 
    }, 500);
  }
});

Deno.serve(app.fetch);