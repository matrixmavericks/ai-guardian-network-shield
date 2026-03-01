import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Shield, User, Palette } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DashboardNav from '@/components/DashboardNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  
  const [userInfo, setUserInfo] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false, receiveAlerts: true, loginNotifications: true,
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true, assignmentReminders: true, systemUpdates: true, securityAlerts: true,
  });
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'system', fontSize: 'medium', language: 'english', compactMode: false,
  });

  const handleUserInfoUpdate = () => {
    toast({ title: "Profile updated", description: "Your profile information has been updated successfully." });
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
                <TabsTrigger value="account" className="flex items-center"><User className="h-4 w-4 mr-2" />Account</TabsTrigger>
                <TabsTrigger value="security" className="flex items-center"><Shield className="h-4 w-4 mr-2" />Security</TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center"><Bell className="h-4 w-4 mr-2" />Notifications</TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center"><Palette className="h-4 w-4 mr-2" />Appearance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Update your account information and profile details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={userInfo.name} onChange={(e) => setUserInfo({...userInfo, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={userInfo.email} disabled />
                        <p className="text-sm text-slate-500">Email cannot be changed here</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleUserInfoUpdate}>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your account security and privacy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {[
                        { label: "Two-Factor Authentication", desc: "Add an extra layer of security", key: "twoFactorEnabled" as const },
                        { label: "Security Alerts", desc: "Receive alerts about suspicious activity", key: "receiveAlerts" as const },
                        { label: "Login Notifications", desc: "Get notified on login", key: "loginNotifications" as const },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div><Label className="text-base">{item.label}</Label><p className="text-sm text-slate-500">{item.desc}</p></div>
                          <Switch checked={securitySettings[item.key]} onCheckedChange={(checked) => setSecuritySettings({...securitySettings, [item.key]: checked})} />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => toast({ title: "Security settings updated" })}>Save Security Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how you want to be notified</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {[
                        { label: "Email Notifications", desc: "Receive updates via email", key: "emailNotifications" as const },
                        { label: "Assignment Reminders", desc: "Get notified about upcoming due dates", key: "assignmentReminders" as const },
                        { label: "System Updates", desc: "Receive system change notifications", key: "systemUpdates" as const },
                        { label: "Security Alerts", desc: "Get important security notifications", key: "securityAlerts" as const },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div><Label className="text-base">{item.label}</Label><p className="text-sm text-slate-500">{item.desc}</p></div>
                          <Switch checked={notificationSettings[item.key]} onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, [item.key]: checked})} />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => toast({ title: "Notification settings updated" })}>Save Notification Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how AI Conditioner looks and feels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <Select value={appearanceSettings.theme} onValueChange={(v) => setAppearanceSettings({...appearanceSettings, theme: v})}>
                          <SelectTrigger id="theme"><SelectValue placeholder="Select theme" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System Default</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="font-size">Font Size</Label>
                        <Select value={appearanceSettings.fontSize} onValueChange={(v) => setAppearanceSettings({...appearanceSettings, fontSize: v})}>
                          <SelectTrigger id="font-size"><SelectValue placeholder="Select font size" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div><Label className="text-base">Compact Mode</Label><p className="text-sm text-slate-500">Reduce spacing in the interface</p></div>
                      <Switch checked={appearanceSettings.compactMode} onCheckedChange={(checked) => setAppearanceSettings({...appearanceSettings, compactMode: checked})} />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => toast({ title: "Appearance settings updated" })}>Save Appearance Settings</Button>
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
