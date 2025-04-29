
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  AlertCircle, 
  Users,
  Shield,
  Smartphone
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

const AlertSettings = () => {
  const { toast } = useToast();
  const [emailAlerts, setEmailAlerts] = useState({
    securityThreats: true,
    bypassAttempts: true,
    aiPolicyViolations: true,
    systemUpdates: false,
    userActivity: false
  });
  
  const [emailRecipients, setEmailRecipients] = useState("admin@example.com, it@example.com");
  
  const [pushNotifications, setPushNotifications] = useState({
    securityThreats: true,
    bypassAttempts: true,
    aiPolicyViolations: false,
    systemUpdates: true,
    userActivity: false
  });
  
  const handleSaveAlertSettings = () => {
    toast({
      title: "Alert settings saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Alert Settings</h2>
        <p className="text-slate-500">Configure how and when you receive notifications about system events</p>
      </div>
      
      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email" className="flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            Email Alerts
          </TabsTrigger>
          <TabsTrigger value="push" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Push Notifications
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Alert Thresholds
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notification Settings</CardTitle>
              <CardDescription>Choose which events trigger email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Security Threats</Label>
                    <p className="text-sm text-muted-foreground">VPN and bypass attempts</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.securityThreats} 
                    onCheckedChange={(checked) => 
                      setEmailAlerts({...emailAlerts, securityThreats: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Bypass Attempts</Label>
                    <p className="text-sm text-muted-foreground">When students try to circumvent the system</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.bypassAttempts} 
                    onCheckedChange={(checked) => 
                      setEmailAlerts({...emailAlerts, bypassAttempts: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">AI Policy Violations</Label>
                    <p className="text-sm text-muted-foreground">Attempts to use AI for unapproved purposes</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.aiPolicyViolations} 
                    onCheckedChange={(checked) => 
                      setEmailAlerts({...emailAlerts, aiPolicyViolations: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">System Updates</Label>
                    <p className="text-sm text-muted-foreground">New features and important updates</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.systemUpdates} 
                    onCheckedChange={(checked) => 
                      setEmailAlerts({...emailAlerts, systemUpdates: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">User Activity Report</Label>
                    <p className="text-sm text-muted-foreground">Regular summaries of user activity</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.userActivity} 
                    onCheckedChange={(checked) => 
                      setEmailAlerts({...emailAlerts, userActivity: checked})
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <Label htmlFor="emailRecipients">Email Recipients</Label>
                <Input 
                  id="emailRecipients" 
                  placeholder="Enter email addresses (comma separated)" 
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Separate multiple email addresses with commas</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emailFrequency">Alert Frequency</Label>
                <Select defaultValue="realtime">
                  <SelectTrigger id="emailFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time (immediate)</SelectItem>
                    <SelectItem value="hourly">Hourly digest</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-2">
                <Button onClick={handleSaveAlertSettings}>Save Email Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="push" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Push Notification Settings</CardTitle>
              <CardDescription>Choose which events trigger in-app and browser notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Security Threats</Label>
                    <p className="text-sm text-muted-foreground">VPN and bypass attempts</p>
                  </div>
                  <Switch 
                    checked={pushNotifications.securityThreats} 
                    onCheckedChange={(checked) => 
                      setPushNotifications({...pushNotifications, securityThreats: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Bypass Attempts</Label>
                    <p className="text-sm text-muted-foreground">When students try to circumvent the system</p>
                  </div>
                  <Switch 
                    checked={pushNotifications.bypassAttempts} 
                    onCheckedChange={(checked) => 
                      setPushNotifications({...pushNotifications, bypassAttempts: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">AI Policy Violations</Label>
                    <p className="text-sm text-muted-foreground">Attempts to use AI for unapproved purposes</p>
                  </div>
                  <Switch 
                    checked={pushNotifications.aiPolicyViolations} 
                    onCheckedChange={(checked) => 
                      setPushNotifications({...pushNotifications, aiPolicyViolations: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">System Updates</Label>
                    <p className="text-sm text-muted-foreground">New features and important updates</p>
                  </div>
                  <Switch 
                    checked={pushNotifications.systemUpdates} 
                    onCheckedChange={(checked) => 
                      setPushNotifications({...pushNotifications, systemUpdates: checked})
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">User Activity</Label>
                    <p className="text-sm text-muted-foreground">Unusual or suspicious user activity</p>
                  </div>
                  <Switch 
                    checked={pushNotifications.userActivity} 
                    onCheckedChange={(checked) => 
                      setPushNotifications({...pushNotifications, userActivity: checked})
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <Label htmlFor="notificationDelivery">Notification Delivery</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="notificationDelivery">
                    <SelectValue placeholder="Select delivery method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="browser">Browser Only</SelectItem>
                    <SelectItem value="mobile">Mobile App Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base">Connected Devices</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center">
                      <Smartphone className="h-5 w-5 mr-3 text-slate-500" />
                      <div>
                        <p className="font-medium text-sm">iPhone 13</p>
                        <p className="text-xs text-slate-500">Last active: 5 minutes ago</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-md">
                    <div className="flex items-center">
                      <Smartphone className="h-5 w-5 mr-3 text-slate-500" />
                      <div>
                        <p className="font-medium text-sm">MacBook Pro</p>
                        <p className="text-xs text-slate-500">Last active: Currently active</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <Button onClick={handleSaveAlertSettings}>Save Notification Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="thresholds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Thresholds</CardTitle>
              <CardDescription>Configure when alerts are triggered based on activity thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base mb-2 block">Bypass Attempt Threshold</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bypassThresholdCount" className="text-sm">Number of attempts</Label>
                      <Input id="bypassThresholdCount" type="number" min="1" defaultValue="3" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bypassThresholdTime" className="text-sm">Time window</Label>
                      <Select defaultValue="hour">
                        <SelectTrigger id="bypassThresholdTime">
                          <SelectValue placeholder="Select time period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15min">15 minutes</SelectItem>
                          <SelectItem value="hour">1 hour</SelectItem>
                          <SelectItem value="day">24 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Alert will trigger after this many attempts within the time window</p>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-base mb-2 block">AI Policy Violation Threshold</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="policyThresholdCount" className="text-sm">Number of violations</Label>
                      <Input id="policyThresholdCount" type="number" min="1" defaultValue="5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="policyThresholdTime" className="text-sm">Time window</Label>
                      <Select defaultValue="day">
                        <SelectTrigger id="policyThresholdTime">
                          <SelectValue placeholder="Select time period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hour">1 hour</SelectItem>
                          <SelectItem value="day">24 hours</SelectItem>
                          <SelectItem value="week">1 week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-base mb-2 block">User Activity Alert</Label>
                  <div className="space-y-2">
                    <Label htmlFor="userActivityThreshold" className="text-sm">Unusual activity threshold</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger id="userActivityThreshold">
                        <SelectValue placeholder="Select sensitivity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High (alert on minor anomalies)</SelectItem>
                        <SelectItem value="medium">Medium (balanced approach)</SelectItem>
                        <SelectItem value="low">Low (only major anomalies)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Controls sensitivity for detecting unusual user behavior</p>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-base mb-2 block">System Health Alerts</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Network Connectivity Issues</Label>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">High CPU/Memory Usage</Label>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">API Rate Limiting Warnings</Label>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <Button onClick={handleSaveAlertSettings}>Save Threshold Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertSettings;
