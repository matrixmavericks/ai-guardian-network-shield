
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bell, 
  Shield, 
  User, 
  Lock, 
  Settings as SettingsIcon, 
  Globe,
  Eye,
  Key,
  Palette,
  Languages,
  MenuSquare
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DashboardNav from '@/components/DashboardNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser, saveUser } from '@/services/localStorageService';

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  
  // Form states
  const [userInfo, setUserInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    class: user?.class || '',
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    receiveAlerts: true,
    loginNotifications: true,
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    assignmentReminders: true,
    systemUpdates: true,
    securityAlerts: true,
  });
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'system',
    fontSize: 'medium',
    language: 'english',
    compactMode: false,
  });

  // Update user info
  const handleUserInfoUpdate = () => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      name: userInfo.name,
      email: userInfo.email,
      department: userInfo.department,
      class: userInfo.class,
    };
    
    saveUser(updatedUser);
    
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully.",
    });
  };
  
  // Update security settings
  const handleSecurityUpdate = () => {
    toast({
      title: "Security settings updated",
      description: "Your security preferences have been saved.",
    });
  };
  
  // Update notification settings
  const handleNotificationUpdate = () => {
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };
  
  // Update appearance settings
  const handleAppearanceUpdate = () => {
    toast({
      title: "Appearance settings updated",
      description: "Your appearance preferences have been saved.",
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-4 gap-2">
                <TabsTrigger value="account" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Appearance
                </TabsTrigger>
              </TabsList>
              
              {/* Account Settings */}
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                      Update your account information and profile details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name" 
                            value={userInfo.name} 
                            onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            value={userInfo.email} 
                            onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Input 
                            id="department" 
                            value={userInfo.department} 
                            onChange={(e) => setUserInfo({...userInfo, department: e.target.value})}
                          />
                          <p className="text-sm text-slate-500">For teachers and admins</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="class">Class</Label>
                          <Input 
                            id="class" 
                            value={userInfo.class} 
                            onChange={(e) => setUserInfo({...userInfo, class: e.target.value})}
                          />
                          <p className="text-sm text-slate-500">For students</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={handleUserInfoUpdate}>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Security Settings */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and privacy
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Two-Factor Authentication</Label>
                          <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                        </div>
                        <Switch 
                          checked={securitySettings.twoFactorEnabled}
                          onCheckedChange={(checked) => 
                            setSecuritySettings({...securitySettings, twoFactorEnabled: checked})
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Security Alerts</Label>
                          <p className="text-sm text-slate-500">Receive alerts about suspicious activity</p>
                        </div>
                        <Switch 
                          checked={securitySettings.receiveAlerts}
                          onCheckedChange={(checked) => 
                            setSecuritySettings({...securitySettings, receiveAlerts: checked})
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Login Notifications</Label>
                          <p className="text-sm text-slate-500">Get notified when someone logs into your account</p>
                        </div>
                        <Switch 
                          checked={securitySettings.loginNotifications}
                          onCheckedChange={(checked) => 
                            setSecuritySettings({...securitySettings, loginNotifications: checked})
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 space-y-4">
                      <Label className="text-base">Password</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input id="current-password" type="password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input id="new-password" type="password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input id="confirm-password" type="password" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={handleSecurityUpdate}>Save Security Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Notification Settings */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose how you want to be notified
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Email Notifications</Label>
                          <p className="text-sm text-slate-500">Receive updates via email</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={(checked) => 
                            setNotificationSettings({...notificationSettings, emailNotifications: checked})
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Assignment Reminders</Label>
                          <p className="text-sm text-slate-500">Get notified about upcoming assignments and due dates</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.assignmentReminders}
                          onCheckedChange={(checked) => 
                            setNotificationSettings({...notificationSettings, assignmentReminders: checked})
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">System Updates</Label>
                          <p className="text-sm text-slate-500">Receive notifications about system changes and updates</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.systemUpdates}
                          onCheckedChange={(checked) => 
                            setNotificationSettings({...notificationSettings, systemUpdates: checked})
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Security Alerts</Label>
                          <p className="text-sm text-slate-500">Get important security-related notifications</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.securityAlerts}
                          onCheckedChange={(checked) => 
                            setNotificationSettings({...notificationSettings, securityAlerts: checked})
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={handleNotificationUpdate}>Save Notification Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Appearance Settings */}
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                      Customize how AI Conditioner looks and feels
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="theme">Theme</Label>
                          <Select 
                            value={appearanceSettings.theme}
                            onValueChange={(value) => 
                              setAppearanceSettings({...appearanceSettings, theme: value})
                            }
                          >
                            <SelectTrigger id="theme">
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="system">System Default</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="font-size">Font Size</Label>
                          <Select 
                            value={appearanceSettings.fontSize}
                            onValueChange={(value) => 
                              setAppearanceSettings({...appearanceSettings, fontSize: value})
                            }
                          >
                            <SelectTrigger id="font-size">
                              <SelectValue placeholder="Select font size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="language">Language</Label>
                          <Select 
                            value={appearanceSettings.language}
                            onValueChange={(value) => 
                              setAppearanceSettings({...appearanceSettings, language: value})
                            }
                          >
                            <SelectTrigger id="language">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="english">English</SelectItem>
                              <SelectItem value="spanish">Spanish</SelectItem>
                              <SelectItem value="french">French</SelectItem>
                              <SelectItem value="german">German</SelectItem>
                              <SelectItem value="chinese">Chinese</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pt-8">
                            <Label htmlFor="compact-mode" className="cursor-pointer">Compact Mode</Label>
                            <Switch 
                              id="compact-mode"
                              checked={appearanceSettings.compactMode}
                              onCheckedChange={(checked) => 
                                setAppearanceSettings({...appearanceSettings, compactMode: checked})
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={handleAppearanceUpdate}>Save Appearance Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
