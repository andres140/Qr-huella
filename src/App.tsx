import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { GuardView } from './components/GuardView';
import { AdminView } from './components/AdminView';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { Fingerprint, LogOut, User as UserIcon } from 'lucide-react';
import { Person, AccessRecord, AccessStats, User, VisitorQR, ChatMessage } from './types';
import { Chat } from './components/Chat';
import { 
  mockPersonas, 
  generateMockAccessRecords, 
  calculateAccessStats,
  generateMockVisitorQRs
} from './data/mockData';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [personas, setPersonas] = useState<Person[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([]);
  const [visitorQRs, setVisitorQRs] = useState<VisitorQR[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<AccessStats>({
    totalPersonasDentro: 0,
    accesosDia: 0,
    estudiantesDentro: 0,
    instructoresDentro: 0,
    administrativosDentro: 0,
    visitantesDentro: 0
  });

  // Cargar usuarios desde localStorage al iniciar
  useEffect(() => {
    const savedUsers = localStorage.getItem('sena_users');
    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers);
        // Convertir fechas de string a Date
        const usersWithDates = parsedUsers.map((u: any) => ({
          ...u,
          fechaCreacion: new Date(u.fechaCreacion)
        }));
        setUsers(usersWithDates);
      } catch (error) {
        console.error('Error loading users from localStorage:', error);
      }
    }
  }, []);

  // Cargar personas desde localStorage al iniciar
  useEffect(() => {
    const savedPersonas = localStorage.getItem('sena_personas');
    if (savedPersonas) {
      try {
        const parsedPersonas = JSON.parse(savedPersonas);
        setPersonas(parsedPersonas);
      } catch (error) {
        console.error('Error loading personas from localStorage:', error);
      }
    }
  }, []);

  // Cargar registros de acceso desde localStorage al iniciar
  useEffect(() => {
    const savedRecords = localStorage.getItem('sena_access_records');
    if (savedRecords) {
      try {
        const parsedRecords = JSON.parse(savedRecords);
        // Convertir fechas de string a Date
        const recordsWithDates = parsedRecords.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
          fechaHora: r.fechaHora ? new Date(r.fechaHora) : undefined
        }));
        setAccessRecords(recordsWithDates);
      } catch (error) {
        console.error('Error loading access records from localStorage:', error);
      }
    }
  }, []);

  // Cargar QRs de visitantes desde localStorage al iniciar
  useEffect(() => {
    const savedQRs = localStorage.getItem('sena_visitor_qrs');
    if (savedQRs) {
      try {
        const parsedQRs = JSON.parse(savedQRs);
        // Convertir fechas de string a Date
        const qrsWithDates = parsedQRs.map((q: any) => ({
          ...q,
          fechaGeneracion: new Date(q.fechaGeneracion),
          fechaExpiracion: new Date(q.fechaExpiracion)
        }));
        setVisitorQRs(qrsWithDates);
      } catch (error) {
        console.error('Error loading visitor QRs from localStorage:', error);
      }
    }
  }, []);

  // Guardar usuarios en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_users', JSON.stringify(users));
  }, [users]);

  // Guardar personas en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_personas', JSON.stringify(personas));
  }, [personas]);

  // Guardar registros de acceso en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_access_records', JSON.stringify(accessRecords));
  }, [accessRecords]);

  // Guardar QRs de visitantes en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('sena_visitor_qrs', JSON.stringify(visitorQRs));
  }, [visitorQRs]);

  // Recalcular estadísticas cuando cambien los registros
  useEffect(() => {
    const newStats = calculateAccessStats(personas, accessRecords);
    setStats(newStats);
  }, [personas, accessRecords]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleAccessGranted = (newRecord: AccessRecord) => {
    setAccessRecords(prev => [newRecord, ...prev]);
  };

  const handlePersonUpdate = (updatedPerson: Person) => {
    setPersonas(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
  };

  const handlePersonDelete = (personId: string) => {
    setPersonas(prev => prev.filter(p => p.id !== personId));
  };

  const handlePersonAdd = (newPersonData: Omit<Person, 'id'>) => {
    const newPerson: Person = {
      ...newPersonData,
      id: Date.now().toString()
    };
    setPersonas(prev => [...prev, newPerson]);
  };

  // Nuevo: Función para agregar múltiples personas (desde carga de archivo)
  const handleBulkPersonAdd = (newPersonsData: Omit<Person, 'id'>[]) => {
    const newPersons = newPersonsData.map((personData, index) => ({
      ...personData,
      id: (Date.now() + index).toString()
    }));
    
    // Evitar duplicados por número de documento
    setPersonas(prev => {
      const existingDocs = new Set(prev.map(p => p.documento));
      const personsToAdd = newPersons.filter(p => !existingDocs.has(p.documento));
      return [...prev, ...personsToAdd];
    });
    
    return newPersons.length;
  };

  const handleVisitorRegistered = (newPerson: Person) => {
    setPersonas(prev => [...prev, newPerson]);
  };

  const handleGenerateVisitorQR = (newQR: VisitorQR) => {
    setVisitorQRs(prev => [...prev, newQR]);
  };

  const handleUserAdd = (newUserData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...newUserData,
      id: Date.now().toString()
    };
    setUsers(prev => [...prev, newUser]);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleUserDelete = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSendMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  // Si no hay usuario logueado, mostrar formulario de login
  if (!user) {
    return (
      <LoginForm 
        onLogin={handleLogin} 
        users={users}
        onUserAdd={handleUserAdd}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Fingerprint className="h-10 w-10 text-indigo-600" />
                <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-20"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Huella
                </h1>
                <p className="text-sm text-gray-600">
                  Control de Acceso Biométrico con QR
                </p>
              </div>
            </div>

            {/* Info del usuario y logout */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="h-4 w-4" />
                <div className="text-right">
                  <p className="font-medium">{user.nombre}</p>
                  <p className="text-gray-500">{user.rol}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal según el rol del usuario */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.rol === 'GUARDA' ? (
          <GuardView
            personas={personas}
            accessRecords={accessRecords}
            stats={stats}
            user={user}
            visitorQRs={visitorQRs}
            onAccessGranted={handleAccessGranted}
            onVisitorRegistered={handleVisitorRegistered}
            onGenerateVisitorQR={handleGenerateVisitorQR}
          />
        ) : (
          <AdminView
            personas={personas}
            accessRecords={accessRecords}
            stats={stats}
            user={user}
            visitorQRs={visitorQRs}
            users={users}
            onPersonUpdate={handlePersonUpdate}
            onPersonDelete={handlePersonDelete}
            onPersonAdd={handlePersonAdd}
            onBulkPersonAdd={handleBulkPersonAdd}
            onUserAdd={handleUserAdd}
            onUserUpdate={handleUserUpdate}
            onUserDelete={handleUserDelete}
          />
        )}
      </main>

      {/* Chat flotante */}
      <Chat 
        currentUser={user} 
        messages={chatMessages} 
        onSendMessage={handleSendMessage} 
      />
    </div>
  );
}