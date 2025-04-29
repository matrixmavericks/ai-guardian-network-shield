
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Server, 
  RefreshCw, 
  Database, 
  Network,
  Wifi,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const NetworkSettings = () => {
  const [integrationStatus, setIntegrationStatus] = useState("active");
  const [networkType, setNetworkType] = useState("gateway");
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  
  const handleScanNetwork = () => {
    setIsScanning(true);
    toast({
      title: "Network scan initiated",
      description: "Scanning network for connected devices and endpoints...",
    });
    
    // Simulate scan completion
    setTimeout(() => {
      setIsScanning(false);
      toast({
        title: "Network scan complete",
        description: "Found 24 devices and 3 potential bypass threats",
      });
    }, 2500);
  };
  
  const handleSaveConfig = () => {
    toast({
      title: "Network configuration saved",
      description: "Your network settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Network Settings</h2>
        <Button variant="outline" onClick={handleScanNetwork} disabled={isScanning}>
          {isScanning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Network
            </>
          )}
        </Button>
      </div>
      
      <Tabs defaultValue="configuration">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="protection">Protection</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        </TabsList>
        
        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Integration</CardTitle>
              <CardDescription>Configure how AI Conditioner connects to your network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="networkType">Integration Type</Label>
                  <Select value={networkType} onValueChange={setNetworkType}>
                    <SelectTrigger id="networkType">
                      <SelectValue placeholder="Select integration type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gateway">Network Gateway</SelectItem>
                      <SelectItem value="proxy">Proxy Server</SelectItem>
                      <SelectItem value="dns">DNS Filter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="integrationStatus">Status</Label>
                  <div className="flex items-center justify-between border rounded-md p-3">
                    <span>{integrationStatus === "active" ? "Active" : "Inactive"}</span>
                    <Switch 
                      id="integrationStatus" 
                      checked={integrationStatus === "active"}
                      onCheckedChange={(checked) => setIntegrationStatus(checked ? "active" : "inactive")}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipRange">IP Range</Label>
                  <Input id="ipRange" defaultValue="192.168.1.0/24" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gateway">Gateway IP</Label>
                  <Input id="gateway" defaultValue="192.168.1.1" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dns">Primary DNS</Label>
                  <Input id="dns" defaultValue="192.168.1.1" />
                </div>
              </div>
              
              <div className="pt-4">
                <Button onClick={handleSaveConfig}>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="protection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bypass Protection</CardTitle>
              <CardDescription>Configure security measures to prevent bypass attempts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">VPN Detection</Label>
                    <p className="text-sm text-muted-foreground">Detect and block VPN connections</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">DNS Override Protection</Label>
                    <p className="text-sm text-muted-foreground">Prevent use of custom DNS servers</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Deep Packet Inspection</Label>
                    <p className="text-sm text-muted-foreground">Analyze network traffic for bypass attempts</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Proxy Detection</Label>
                    <p className="text-sm text-muted-foreground">Block access through proxy servers</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Custom IP Blocklist</Label>
                    <p className="text-sm text-muted-foreground">Block specific IP addresses</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                
                <div className="pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Protection Score</span>
                    <span>80%</span>
                  </div>
                  <Progress value={80} />
                  <p className="text-sm text-muted-foreground mt-2">Enable Deep Packet Inspection to improve protection</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Service Endpoints</CardTitle>
              <CardDescription>Configure which AI services are filtered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-base">OpenAI (ChatGPT)</CardTitle>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <div className="flex justify-between text-slate-700">
                          <span>Status</span>
                          <span className="font-medium text-green-600">Protected</span>
                        </div>
                        <div className="flex justify-between text-slate-700 mt-1">
                          <span>Endpoints</span>
                          <span className="font-medium">4</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full mt-2">Configure</Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-base">Anthropic (Claude)</CardTitle>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <div className="flex justify-between text-slate-700">
                          <span>Status</span>
                          <span className="font-medium text-green-600">Protected</span>
                        </div>
                        <div className="flex justify-between text-slate-700 mt-1">
                          <span>Endpoints</span>
                          <span className="font-medium">2</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full mt-2">Configure</Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-base">Google (Gemini)</CardTitle>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <div className="flex justify-between text-slate-700">
                          <span>Status</span>
                          <span className="font-medium text-green-600">Protected</span>
                        </div>
                        <div className="flex justify-between text-slate-700 mt-1">
                          <span>Endpoints</span>
                          <span className="font-medium">3</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full mt-2">Configure</Button>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-center mt-4">
                  <Button variant="outline">
                    <Network className="h-4 w-4 mr-2" />
                    Add New AI Service
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkSettings;
