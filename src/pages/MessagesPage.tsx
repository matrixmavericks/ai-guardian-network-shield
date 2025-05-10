
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import DashboardNav from '@/components/DashboardNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getMessages, getUsers, saveMessage, markMessageAsRead, User, Message } from '@/services/localStorageService';

const MessagesPage = () => {
  const { user } = useAuth();
  const [activeContact, setActiveContact] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get all users for contacts list
  const allUsers = getUsers().filter(u => u.id !== user?.id);
  
  // Filter contacts based on search query
  const filteredContacts = allUsers.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get messages between current user and active contact
  const messages: Message[] = user && activeContact 
    ? getMessages().filter(msg => 
        (msg.senderId === user.id && msg.receiverId === activeContact.id) ||
        (msg.senderId === activeContact.id && msg.receiverId === user.id)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];
    
  // Mark received messages as read when viewing conversation
  React.useEffect(() => {
    if (user && activeContact) {
      messages.forEach(msg => {
        if (msg.senderId === activeContact.id && !msg.read) {
          markMessageAsRead(msg.id);
        }
      });
    }
  }, [messages, activeContact, user]);
  
  // Get unread message count for a contact
  const getUnreadCount = (contactId: string): number => {
    if (!user) return 0;
    
    return getMessages().filter(
      msg => msg.senderId === contactId && msg.receiverId === user.id && !msg.read
    ).length;
  };
  
  // Send a new message
  const handleSendMessage = () => {
    if (!user || !activeContact || !messageText.trim()) return;
    
    saveMessage({
      senderId: user.id,
      receiverId: activeContact.id,
      content: messageText.trim(),
      read: false
    });
    
    setMessageText('');
  };
  
  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
            
            <Card className="shadow-md">
              <div className="grid md:grid-cols-3 h-[calc(80vh-2rem)]">
                <div className="border-r border-slate-200">
                  <CardHeader className="py-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                      <Input 
                        type="search" 
                        placeholder="Search contacts..." 
                        className="pl-9 bg-slate-50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <div className="overflow-y-auto h-[calc(80vh-8rem)]">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <div 
                          key={contact.id}
                          className={`flex items-center px-4 py-3 cursor-pointer hover:bg-slate-100 ${activeContact?.id === contact.id ? 'bg-blue-50' : ''}`}
                          onClick={() => setActiveContact(contact)}
                        >
                          <div className={`h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-3`}>
                            {getInitials(contact.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{contact.name}</p>
                              {getUnreadCount(contact.id) > 0 && (
                                <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                  {getUnreadCount(contact.id)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {contact.role.charAt(0).toUpperCase() + contact.role.slice(1)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500">
                        No contacts found
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2 flex flex-col">
                  {activeContact ? (
                    <>
                      <CardHeader className="py-3 border-b">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-3`}>
                            {getInitials(activeContact.name)}
                          </div>
                          <div>
                            <CardTitle>{activeContact.name}</CardTitle>
                            <p className="text-sm text-slate-500">
                              {activeContact.role.charAt(0).toUpperCase() + activeContact.role.slice(1)}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length > 0 ? (
                          messages.map((message) => {
                            const isOutgoing = user && message.senderId === user.id;
                            
                            return (
                              <div 
                                key={message.id} 
                                className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                    isOutgoing 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-slate-200 text-slate-800'
                                  }`}
                                >
                                  <p>{message.content}</p>
                                  <p className={`text-xs ${isOutgoing ? 'text-blue-100' : 'text-slate-500'} text-right mt-1`}>
                                    {formatTime(message.timestamp)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-500">
                            No messages yet. Start a conversation!
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 border-t">
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Type a message..." 
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          <Button 
                            onClick={handleSendMessage}
                            disabled={!messageText.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Select a contact to start messaging
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MessagesPage;
