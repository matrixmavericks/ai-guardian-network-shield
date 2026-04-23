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
import { Key, Plus, Trash, Edit, Eye, EyeOff, Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DashboardSidebar from "@/components/DashboardSidebar";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

interface SecurityKey {
  id: string;
  name: string;
  service: string;
  api_key: string;
  created_by: string;
  created_at: string;
  last_used: string | null;
}

const keySchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  service: z.string().trim().min(1, "Service required").max(100),
  api_key: z.string().trim().min(1, "Key required").max(2000),
});

const SecurityKeysPage = () => {
  const [securityKeys, setSecurityKeys] = useState<SecurityKey[]>([]);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState<SecurityKey | null>(null);
  const [formData, setFormData] = useState({ name: "", api_key: "", service: "" });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadSecurityKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSecurityKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_keys" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load keys", description: error.message, variant: "destructive" });
      return;
    }
    const rows = (data || []) as unknown as SecurityKey[];
    setSecurityKeys(rows);
    const initial: Record<string, boolean> = {};
    rows.forEach((k) => (initial[k.id] = false));
    setShowKeys(initial);
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddKey = async () => {
    const parsed = keySchema.safeParse(formData);
    if (!parsed.success) {
      toast({ title: "Validation error", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    if (!user) return;
    const { error } = await supabase.from("security_keys" as any).insert({
      name: parsed.data.name,
      service: parsed.data.service,
      api_key: parsed.data.api_key,
      created_by: user.id,
    } as any);
    if (error) {
      toast({ title: "Failed to add key", description: error.message, variant: "destructive" });
      return;
    }
    await loadSecurityKeys();
    setIsAddingKey(false);
    setFormData({ name: "", api_key: "", service: "" });
    toast({ title: "Security key added" });
  };

  const handleEditKey = async () => {
    if (!isEditingKey) return;
    const parsed = keySchema.safeParse(formData);
    if (!parsed.success) {
      toast({ title: "Validation error", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("security_keys" as any)
      .update({
        name: parsed.data.name,
        service: parsed.data.service,
        api_key: parsed.data.api_key,
      } as any)
      .eq("id", isEditingKey.id);
    if (error) {
      toast({ title: "Failed to update key", description: error.message, variant: "destructive" });
      return;
    }
    await loadSecurityKeys();
    setIsEditingKey(null);
    setFormData({ name: "", api_key: "", service: "" });
    toast({ title: "Security key updated" });
  };

  const handleDeleteKey = async (id: string) => {
    const { error } = await supabase.from("security_keys" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete key", description: error.message, variant: "destructive" });
      return;
    }
    await loadSecurityKeys();
    toast({ title: "Security key deleted" });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const openEditDialog = (key: SecurityKey) => {
    setIsEditingKey(key);
    setFormData({ name: key.name, api_key: key.api_key, service: key.service });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
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
        <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g., OpenAI API Key" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="service">Service</Label>
        <Input id="service" value={formData.service} onChange={(e) => handleChange("service", e.target.value)} placeholder="e.g., OpenAI, Google Cloud" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="api_key">API Key</Label>
        <Input id="api_key" type="password" value={formData.api_key} onChange={(e) => handleChange("api_key", e.target.value)} placeholder="Enter your API key" required />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { setIsAddingKey(false); setIsEditingKey(null); }}>
          Cancel
        </Button>
        <Button type="button" onClick={isEditingKey ? handleEditKey : handleAddKey}>
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
              <Plus className="h-4 w-4 mr-2" /> Add Key
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API & Security Keys</CardTitle>
              <CardDescription>
                Manage your API keys for various services. Keys are stored securely server-side and only readable by admins.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading…</div>
              ) : securityKeys.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Key className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No security keys found.</p>
                  <p className="text-sm mt-1">Add your first API key to integrate with external services.</p>
                  <Button className="mt-4" onClick={() => setIsAddingKey(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Key
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
                                {showKeys[key.id] ? key.api_key : maskKey(key.api_key)}
                              </code>
                              <Button variant="ghost" size="icon" onClick={() => toggleShowKey(key.id)}>
                                {showKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.id, key.api_key)}>
                                {copied[key.id] ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(key.created_at)}</TableCell>
                          <TableCell>{formatDate(key.last_used)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(key)} className="mr-1">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteKey(key.id)} className="text-red-600">
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

      <Dialog open={isAddingKey} onOpenChange={setIsAddingKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Security Key</DialogTitle>
            <DialogDescription>Add a new API key for integration with external services.</DialogDescription>
          </DialogHeader>
          <KeyForm />
        </DialogContent>
      </Dialog>

      <Dialog open={!!isEditingKey} onOpenChange={(open) => !open && setIsEditingKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Security Key</DialogTitle>
            <DialogDescription>Update your API key information.</DialogDescription>
          </DialogHeader>
          <KeyForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityKeysPage;
