import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardNav from '@/components/DashboardNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_profile?: { full_name: string };
}

interface Contact {
  user_id: string;
  full_name: string;
  role?: string;
}

const MessagesPage = () => {
  const { user } = useAuth();
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Fetch contacts (all users except current user)
  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .neq('user_id', user.id);

      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }

      setContacts(data || []);
      
      // Fetch unread counts for each contact
      if (data) {
        const counts: Record<string, number> = {};
        for (const contact of data) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', contact.user_id)
            .eq('receiver_id', user.id)
            .eq('read', false);
          
          counts[contact.user_id] = count || 0;
        }
        setUnreadCounts(counts);
      }
    };

    fetchContacts();
  }, [user]);

  // Fetch messages for active contact
  useEffect(() => {
    if (!user || !activeContact) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.user_id}),and(sender_id.eq.${activeContact.user_id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
      
      // Mark messages as read
      const unreadIds = data
        ?.filter(msg => msg.sender_id === activeContact.user_id && !msg.read)
        .map(msg => msg.id) || [];
      
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadIds);
        
        setUnreadCounts(prev => ({ ...prev, [activeContact.user_id]: 0 }));
      }
    };

    fetchMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`messages:${user.id}:${activeContact.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.user_id}),and(sender_id.eq.${activeContact.user_id},receiver_id.eq.${user.id}))`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          
          // Mark as read if message is from active contact
          if (payload.new.sender_id === activeContact.user_id) {
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', payload.new.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeContact]);

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact => 
    contact.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!user || !activeContact || !messageText.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: activeContact.user_id,
        content: messageText.trim(),
        read: false
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return;
    }

    setMessageText('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <h1 className="text-2xl font-bold">Messages</h1>
              
              <Card className="shadow-md">
                <div className="grid md:grid-cols-3 h-[calc(80vh-2rem)]">
                  <div className="border-r border-border">
                    <CardHeader className="py-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="search" 
                          placeholder="Search contacts..." 
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </CardHeader>
                    <div className="overflow-y-auto h-[calc(80vh-8rem)]">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact) => (
                          <div 
                            key={contact.user_id}
                            className={`flex items-center px-4 py-3 cursor-pointer hover:bg-accent ${activeContact?.user_id === contact.user_id ? 'bg-accent' : ''}`}
                            onClick={() => setActiveContact(contact)}
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium mr-3 shrink-0">
                              {getInitials(contact.full_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">{contact.full_name}</p>
                                {unreadCounts[contact.user_id] > 0 && (
                                  <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                                    {unreadCounts[contact.user_id]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-muted-foreground">
                          No contacts found
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex flex-col">
                    {activeContact ? (
                      <>
                        <CardHeader className="py-3 border-b border-border">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium mr-3">
                              {getInitials(activeContact.full_name)}
                            </div>
                            <div>
                              <CardTitle>{activeContact.full_name}</CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {messages.length > 0 ? (
                            messages.map((message) => {
                              const isOutgoing = user && message.sender_id === user.id;
                              
                              return (
                                <div 
                                  key={message.id} 
                                  className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div 
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                      isOutgoing 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted text-foreground'
                                    }`}
                                  >
                                    <p>{message.content}</p>
                                    <p className={`text-xs ${isOutgoing ? 'opacity-80' : 'text-muted-foreground'} text-right mt-1`}>
                                      {formatTime(message.created_at)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                              No messages yet. Start a conversation!
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4 border-t border-border">
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
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Select a contact to start messaging
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default MessagesPage;
