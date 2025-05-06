
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Key, 
  Plus, 
  Trash, 
  Edit, 
  Eye, 
  EyeOff,
  Check,
  Copy
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DashboardSidebar from "@/components/DashboardSidebar";
import { formatDistanceToNow } from "date-fns";
import { 
  getSecurityKeys, 
  saveSecurityKey, 
  deleteSecurityKey, 
  SecurityKey, 
  generateId, 
  getCurrentUser
} from "@/services/localStorageService";

const SecurityKeysPage = () => {
  const [securityKeys, setSecurityKeys] = useState<SecurityKey[]>([]);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState<SecurityKey | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    key: "",
    service: ""
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadSecurityKeys();
  }, []);

  const loadSecurityKeys = () => {
    const keys = getSecurityKeys();
    setSecurityKeys(keys);

    // Initialize show state for all keys
    const initialShowState: Record<string, boolean> = {};
    keys.forEach(key => {
      initialShowState[key.id] = false;
    });
    setShowKeys(initialShowState);
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddKey = () => {
    const newKey: SecurityKey = {
      id: generateId(),
      name: formData.name,
      key: formData.key,
      service: formData.service,
      createdBy: currentUser?.id || 'unknown',
      createdAt: new Date().toISOString(),
    };
    
    saveSecurityKey(newKey);
    loadSecurityKeys();
    setIsAddingKey(false);
    setFormData({ name: "", key: "", service: "" });
    
    toast({
      title: "Security key added",
      description: `${newKey.name} for ${newKey.service} has been added successfully.`,
    });
  };

  const handleEditKey = () => {
    if (!isEditingKey) return;
    
    const updatedKey: SecurityKey = {
      ...isEditingKey,
      name: formData.name,
      key: formData.key,
      service: formData.service,
    };
    
    saveSecurityKey(updatedKey);
    loadSecurityKeys();
    setIsEditingKey(null);
    setFormData({ name: "", key: "", service: "" });
    
    toast({
      title: "Security key updated",
      description: `${updatedKey.name} has been updated successfully.`,
    });
  };

  const handleDeleteKey = (id: string) => {
    deleteSecurityKey(id);
    loadSecurityKeys();
    
    toast({
      title: "Security key deleted",
      description: "The key has been removed from the system.",
    });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    
    setCopied(prev => ({
      ...prev,
      [id]: true
    }));
    
    setTimeout(() => {
      setCopied(prev => ({
        ...prev,
        [id]: false
      }));
    }, 2000);
  };

  const openEditDialog = (key: SecurityKey) => {
    setIsEditingKey(key);
    setFormData({
      name: key.name,
      key: key.key,
      service: key.service
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Unknown";
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  };

  const KeyForm = () => (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Key Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g., OpenAI API Key"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="service">Service</Label>
        <Input
          id="service"
          value={formData.service}
          onChange={(e) => handleChange("service", e.target.value)}
          placeholder="e.g., OpenAI, Google Cloud"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="key">API Key</Label>
        <Input
          id="key"
          type="password"
          value={formData.key}
          onChange={(e) => handleChange("key", e.target.value)}
          placeholder="Enter your API key"
          required
        />
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          setIsAddingKey(false);
          setIsEditingKey(null);
        }}>
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={isEditingKey ? handleEditKey : handleAddKey}
        >
          {isEditingKey ? "Update Key" : "Add Key"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Security Keys</h1>
            <Button onClick={() => setIsAddingKey(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Key
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API & Security Keys</CardTitle>
              <CardDescription>
                Manage your API keys for various services. These keys are stored securely in local storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityKeys.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Key className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No security keys found.</p>
                  <p className="text-sm mt-1">
                    Add your first API key to integrate with external services.
                  </p>
                  <Button className="mt-4" onClick={() => setIsAddingKey(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Key
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {securityKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>{key.service}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="bg-slate-100 p-1 rounded text-xs">
                                {showKeys[key.id] ? key.key : maskKey(key.key)}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => toggleShowKey(key.id)}
                              >
                                {showKeys[key.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => copyToClipboard(key.id, key.key)}
                              >
                                {copied[key.id] ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(key.createdAt)}</TableCell>
                          <TableCell>{key.lastUsed ? formatDate(key.lastUsed) : "Never"}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditDialog(key)}
                              className="mr-1"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteKey(key.id)}
                              className="text-red-600"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Key Dialog */}
      <Dialog open={isAddingKey} onOpenChange={setIsAddingKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Security Key</DialogTitle>
            <DialogDescription>
              Add a new API key for integration with external services.
            </DialogDescription>
          </DialogHeader>
          <KeyForm />
        </DialogContent>
      </Dialog>

      {/* Edit Key Dialog */}
      <Dialog open={!!isEditingKey} onOpenChange={(open) => !open && setIsEditingKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Security Key</DialogTitle>
            <DialogDescription>
              Update your API key information.
            </DialogDescription>
          </DialogHeader>
          <KeyForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityKeysPage;
