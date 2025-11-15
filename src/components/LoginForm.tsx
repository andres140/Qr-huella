import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Fingerprint, Lock, Mail, User as UserIcon, Eye, EyeOff, CheckCircle, ArrowLeft, Key, Send } from 'lucide-react';
import { User } from '../types';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';
import emailjs from '@emailjs/browser';
import { EMAIL_CONFIG } from '../utils/emailConfig';
import { authAPI } from '../services/api';

interface LoginFormProps {
  onLogin: (user: User) => void;
  users: User[];
  onUserAdd: (user: Omit<User, 'id'>) => void;
}

export function LoginForm({ onLogin, users, onUserAdd }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Estado para Login
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Estado para Registro
  const [registerForm, setRegisterForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: 'ADMINISTRADOR' as 'ADMINISTRADOR' | 'GUARDA'
  });

  // Estado para Recuperación de contraseña
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: '',
    verificationCode: '',
    step: 1 // 1: ingresar email, 2: ingresar código, 3: mostrar contraseña
  });
  const [generatedCode, setGeneratedCode] = useState('');
  const [retrievedPassword, setRetrievedPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Intentar login con el backend primero
      // El backend ahora acepta tanto 'usuario' como 'email'
      const response = await authAPI.login(loginForm.email, loginForm.password);
      
      if (response.success && response.token && response.usuario) {
        // El token ya se guardó automáticamente en authAPI.login
        const userFromBackend = response.usuario;
        
        // Convertir el usuario del backend al formato User
        // El backend ahora solo devuelve nombre, email, rol, estado (no tiene campo 'usuario')
        const user: User = {
          id: userFromBackend.id,
          usuario: userFromBackend.email?.split('@')[0] || userFromBackend.nombre || 'usuario', // Usar email sin @ o nombre como usuario
          nombre: userFromBackend.nombre,
          email: userFromBackend.email,
          rol: userFromBackend.rol,
          estado: userFromBackend.estado,
          password: '', // No guardamos la contraseña
          fechaCreacion: new Date()
        };
        
        toast.success(`¡Bienvenido a Huella, ${user.nombre}! 👋`, {
          description: `Accediendo al sistema como ${user.rol}`,
          duration: 4000,
          className: 'bg-green-50 border-green-200 text-green-900'
        });
        onLogin(user);
      }
    } catch (error: any) {
      // Si falla el backend, intentar login local como fallback
      console.error('Error en login backend, intentando local:', error);
      
      const user = users.find(
        u => u.email === loginForm.email && 
             u.password === loginForm.password && 
             u.estado === 'ACTIVO'
      );

      if (user) {
        toast.success(`¡Bienvenido a Huella, ${user.nombre}! 👋`, {
          description: `Accediendo al sistema como ${user.rol} (modo local)`,
          duration: 4000,
          className: 'bg-green-50 border-green-200 text-green-900'
        });
        onLogin(user);
      } else {
        toast.error('❌ Credenciales inválidas', {
          description: error.message || 'El email o la contraseña son incorrectos, o el usuario está inactivo',
          duration: 4000,
          className: 'bg-red-50 border-red-200 text-red-900'
        });
      }
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que las contraseñas coincidan
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('❌ Las contraseñas no coinciden', {
        description: 'Por favor verifica que ambas contraseñas sean iguales',
        duration: 4000,
        className: 'bg-red-50 border-red-200 text-red-900'
      });
      return;
    }

    // Validar longitud mínima de contraseña
    if (registerForm.password.length < 6) {
      toast.error('❌ Contraseña muy corta', {
        description: 'La contraseña debe tener al menos 6 caracteres',
        duration: 4000,
        className: 'bg-red-50 border-red-200 text-red-900'
      });
      return;
    }

    // Validar que el email no exista
    const emailExists = users.some(u => u.email === registerForm.email);
    if (emailExists) {
      toast.error('❌ La cuenta ya existe', {
        description: 'Este email ya está registrado. Intenta iniciar sesión.',
        duration: 4000,
        className: 'bg-orange-50 border-orange-200 text-orange-900'
      });
      return;
    }

    // Crear nuevo usuario
    const newUser: Omit<User, 'id'> = {
      usuario: registerForm.email.split('@')[0],
      nombre: registerForm.nombre,
      email: registerForm.email,
      password: registerForm.password,
      rol: registerForm.rol,
      estado: 'ACTIVO',
      fechaCreacion: new Date()
    };

    onUserAdd(newUser);
    
    // Notificación de éxito mejorada con icono
    toast.success('✅ ¡Cuenta creada con éxito!', {
      description: `Bienvenido ${registerForm.nombre}. Ahora puedes iniciar sesión con tus credenciales.`,
      duration: 5000,
      className: 'bg-green-50 border-green-200 text-green-900'
    });

    // Limpiar formulario de registro
    setRegisterForm({
      nombre: '',
      email: '',
      password: '',
      confirmPassword: '',
      rol: 'ADMINISTRADOR'
    });

    // Pre-llenar el email en el login
    setLoginForm({
      email: registerForm.email,
      password: ''
    });

    // Cambiar a tab de login con un delay para que se vea la notificación
    setTimeout(() => {
      setActiveTab('login');
      toast.info('ℹ️ Ingresa tu contraseña para acceder al sistema', {
        duration: 3000,
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });
    }, 1500);
  };

  const handleForgotPasswordStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar si el email existe
    const user = users.find(u => u.email === forgotPasswordForm.email);
    
    if (!user) {
      toast.error('❌ Email no encontrado', {
        description: 'No existe una cuenta con este email',
        duration: 4000,
        className: 'bg-red-50 border-red-200 text-red-900'
      });
      return;
    }

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setRetrievedPassword(user.password);

    // Verificar si EmailJS está configurado
    const isEmailConfigured = EMAIL_CONFIG.publicKey !== 'TU_PUBLIC_KEY_AQUI' && 
                             EMAIL_CONFIG.serviceId !== 'TU_SERVICE_ID_AQUI' && 
                             EMAIL_CONFIG.templateId !== 'TU_TEMPLATE_ID_AQUI';

    if (isEmailConfigured) {
      // Enviar email con EmailJS
      try {
        toast.info('📧 Enviando código...', {
          description: 'Enviando código de verificación a tu correo',
          duration: 3000,
          className: 'bg-blue-50 border-blue-200 text-blue-900'
        });

        await emailjs.send(
          EMAIL_CONFIG.serviceId,
          EMAIL_CONFIG.templateId,
          {
            to_email: user.email,
            user_name: user.nombre,
            verification_code: code,
            from_name: 'Sistema Huella'
          },
          EMAIL_CONFIG.publicKey
        );

        toast.success('✅ Código enviado a tu email', {
          description: `Revisa tu bandeja de entrada: ${user.email}`,
          duration: 8000,
          className: 'bg-green-50 border-green-200 text-green-900'
        });
      } catch (error) {
        console.error('Error al enviar email:', error);
        toast.warning('⚠️ Error al enviar email', {
          description: `Por favor verifica la configuración. Tu código es: ${code}`,
          duration: 10000,
          className: 'bg-orange-50 border-orange-200 text-orange-900'
        });
      }
    } else {
      // Modo desarrollo: mostrar código en notificación
      toast.warning('⚠️ EmailJS no configurado', {
        description: `Modo desarrollo - Tu código de verificación es: ${code}`,
        duration: 10000,
        className: 'bg-orange-50 border-orange-200 text-orange-900'
      });
      
      toast.info('ℹ️ Configurar EmailJS', {
        description: 'Para enviar emails reales, configura EmailJS en /utils/emailConfig.ts',
        duration: 8000,
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });
    }

    setForgotPasswordForm(prev => ({ ...prev, step: 2 }));
  };

  const handleForgotPasswordStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (forgotPasswordForm.verificationCode !== generatedCode) {
      toast.error('❌ Código incorrecto', {
        description: 'El código ingresado no es válido',
        duration: 4000,
        className: 'bg-red-50 border-red-200 text-red-900'
      });
      return;
    }

    toast.success('✅ Código verificado', {
      description: 'Mostrando tu contraseña...',
      duration: 3000,
      className: 'bg-green-50 border-green-200 text-green-900'
    });

    setForgotPasswordForm(prev => ({ ...prev, step: 3 }));
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotPasswordForm({
      email: '',
      verificationCode: '',
      step: 1
    });
    setGeneratedCode('');
    setRetrievedPassword('');
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Fingerprint className="h-16 w-16 text-indigo-600" />
                <div className="absolute inset-0 bg-indigo-600 blur-xl opacity-20"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Huella
                </h1>
                <p className="text-sm text-gray-600">Control de Acceso Biométrico</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToLogin}
                className="mb-2 w-fit"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio de sesión
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Recuperar Contraseña
              </CardTitle>
              <CardDescription>
                {forgotPasswordForm.step === 1 && 'Ingresa tu email para recibir un código de verificación'}
                {forgotPasswordForm.step === 2 && 'Ingresa el código que recibiste'}
                {forgotPasswordForm.step === 3 && 'Esta es tu contraseña guardada'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forgotPasswordForm.step === 1 && (
                <form onSubmit={handleForgotPasswordStep1} className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Send className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Ingresa tu email y te enviaremos un código de verificación para recuperar tu contraseña.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="tu-email@ejemplo.com"
                        value={forgotPasswordForm.email}
                        onChange={(e) => setForgotPasswordForm({...forgotPasswordForm, email: e.target.value})}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Código al Email
                  </Button>
                </form>
              )}

              {forgotPasswordForm.step === 2 && (
                <form onSubmit={handleForgotPasswordStep2} className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Revisa tu email ({forgotPasswordForm.email}) e ingresa el código de 6 dígitos que recibiste.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Código de Verificación</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={forgotPasswordForm.verificationCode}
                      onChange={(e) => setForgotPasswordForm({...forgotPasswordForm, verificationCode: e.target.value})}
                      className="text-center text-2xl tracking-widest"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Verificar Código
                  </Button>
                </form>
              )}

              {forgotPasswordForm.step === 3 && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      Tu contraseña ha sido recuperada exitosamente
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label>Tu contraseña es:</Label>
                    <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                      <p className="text-2xl font-mono font-bold text-center tracking-wider">
                        {retrievedPassword}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleBackToLogin} className="w-full">
                    Ir a Iniciar Sesión
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Fingerprint className="h-16 w-16 text-indigo-600" />
              <div className="absolute inset-0 bg-indigo-600 blur-xl opacity-20"></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Huella
              </h1>
              <p className="text-sm text-gray-600">Control de Acceso Biométrico</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          {/* Tab de Login */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Iniciar Sesión
                </CardTitle>
                <CardDescription>
                  Ingrese sus credenciales para acceder al sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu-email@ejemplo.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="pl-9 pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>

                  <Button type="submit" className="w-full">
                    Ingresar al Sistema
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    ¿No tienes cuenta?{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto font-semibold"
                      onClick={() => setActiveTab('register')}
                    >
                      Regístrate aquí
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Registro */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Crear Cuenta Nueva
                </CardTitle>
                <CardDescription>
                  Completa el formulario para crear tu cuenta en Huella
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-nombre">Nombre Completo</Label>
                    <Input
                      id="reg-nombre"
                      type="text"
                      placeholder="Juan Pérez"
                      value={registerForm.nombre}
                      onChange={(e) => setRegisterForm({...registerForm, nombre: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="tu-email@ejemplo.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-rol">Rol en el Sistema</Label>
                    <select
                      id="reg-rol"
                      value={registerForm.rol}
                      onChange={(e) => setRegisterForm({...registerForm, rol: e.target.value as 'ADMINISTRADOR' | 'GUARDA'})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="ADMINISTRADOR">Administrador</option>
                      <option value="GUARDA">Guarda</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        className="pl-9 pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm-password">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Crear Cuenta
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    ¿Ya tienes cuenta?{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto font-semibold"
                      onClick={() => setActiveTab('login')}
                    >
                      Inicia sesión aquí
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
