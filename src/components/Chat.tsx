import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, Send, User as UserIcon, Shield } from 'lucide-react';
import { User, ChatMessage } from '../types';
import { toast } from 'sonner@2.0.3';

interface ChatProps {
  currentUser: User;
  messages: ChatMessage[];
  onSendMessage: (message: ChatMessage) => void;
}

const STORAGE_KEY = 'sena_chat_messages';

export function Chat({ currentUser, messages, onSendMessage }: ChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousMessagesLength = useRef(0);

  // Cargar mensajes del localStorage al iniciar
  useEffect(() => {
    const loadMessages = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convertir timestamps de string a Date
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setLocalMessages(messagesWithDates);
          previousMessagesLength.current = messagesWithDates.length;
        }
      } catch (error) {
        console.error('Error cargando mensajes:', error);
      }
    };

    loadMessages();
    
    // Polling para sincronización en tiempo real (cada 1 segundo)
    const pollInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          // Solo actualizar si hay cambios en la cantidad de mensajes
          if (messagesWithDates.length !== previousMessagesLength.current) {
            setLocalMessages(messagesWithDates);
            
            // Incrementar contador de no leídos si el chat está cerrado y hay un mensaje nuevo del otro usuario
            if (!isOpen && messagesWithDates.length > previousMessagesLength.current) {
              const lastMessage = messagesWithDates[messagesWithDates.length - 1];
              if (lastMessage && lastMessage.senderId !== currentUser.id) {
                setUnreadCount(prev => prev + 1);
              }
            }
            
            previousMessagesLength.current = messagesWithDates.length;
          }
        }
      } catch (error) {
        console.error('Error en polling de mensajes:', error);
      }
    }, 1000);
    
    // Escuchar cambios en localStorage (para sincronización entre tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setLocalMessages(messagesWithDates);
          
          // Incrementar contador de no leídos si el chat está cerrado y el mensaje no es del usuario actual
          if (!isOpen) {
            const lastMessage = messagesWithDates[messagesWithDates.length - 1];
            if (lastMessage && lastMessage.senderId !== currentUser.id) {
              setUnreadCount(prev => prev + 1);
            }
          }
          
          previousMessagesLength.current = messagesWithDates.length;
        } catch (error) {
          console.error('Error procesando cambio de storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser.id, isOpen]);

  // Resetear contador cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Notificar cuando lleguen mensajes nuevos
  useEffect(() => {
    if (localMessages.length > previousMessagesLength.current && previousMessagesLength.current > 0) {
      const lastMessage = localMessages[localMessages.length - 1];
      
      // Solo notificar si el mensaje no es del usuario actual
      if (lastMessage.senderId !== currentUser.id) {
        const senderLabel = lastMessage.senderRole === 'ADMINISTRADOR' ? 'Admin' : 'Guarda';
        
        toast.success(`Nuevo mensaje de ${senderLabel}`, {
          description: lastMessage.message.substring(0, 50) + (lastMessage.message.length > 50 ? '...' : ''),
          duration: 3000,
        });
      }
    }
    
    previousMessagesLength.current = localMessages.length;
  }, [localMessages, currentUser.id]);

  useEffect(() => {
    // Scroll automático al final cuando haya nuevos mensajes
    const scrollContainer = document.getElementById('chat-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [localMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.nombre,
      senderRole: currentUser.rol,
      message: newMessage.trim(),
      timestamp: new Date()
    };

    // Guardar en localStorage para sincronización
    try {
      const updatedMessages = [...localMessages, message];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));
      setLocalMessages(updatedMessages);
      previousMessagesLength.current = updatedMessages.length;
      
      // También llamar al callback original
      onSendMessage(message);
    } catch (error) {
      console.error('Error guardando mensaje:', error);
    }

    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Hoy';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit'
    }).format(messageDate);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full h-14 w-14 shadow-lg"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center p-0 bg-red-500 text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96">
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat {currentUser.rol === 'GUARDA' ? 'con Administración' : 'con Guardas'}
              </CardTitle>
              <CardDescription>Comunicación en tiempo real</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <ScrollArea className="h-96 px-4">
            <div id="chat-scroll-container" className="space-y-4 py-4">
              {localMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No hay mensajes aún</p>
                  <p className="text-xs">Inicia la conversación</p>
                </div>
              ) : (
                localMessages.map((msg, index) => {
                  const isCurrentUser = msg.senderId === currentUser.id;
                  const showDate = index === 0 || 
                    formatDate(localMessages[index - 1].timestamp) !== formatDate(msg.timestamp);
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <Badge variant="secondary" className="text-xs">
                            {formatDate(msg.timestamp)}
                          </Badge>
                        </div>
                      )}
                      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div className={`flex gap-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                            msg.senderRole === 'ADMINISTRADOR' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {msg.senderRole === 'ADMINISTRADOR' ? (
                              <Shield className="h-4 w-4" />
                            ) : (
                              <UserIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                            {!isCurrentUser && (
                              <span className="text-xs font-medium text-muted-foreground mb-1">
                                {msg.senderName}
                              </span>
                            )}
                            <div className={`rounded-lg px-3 py-2 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <p className="text-sm break-words">{msg.message}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
