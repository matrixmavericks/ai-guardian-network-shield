import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Loader2, UserPlus, Users, X } from "lucide-react";

interface Collaborator {
  id: string;
  user_id: string;
  name: string;
  joined_at: string;
}

interface Props {
  projectId: string;
  isOwner: boolean;
  inviteCode: string | null;
}

const PortfolioCollaborators: React.FC<Props> = ({ projectId, isOwner, inviteCode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<{ user_id: string; full_name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from("portfolio_collaborators")
      .select("id, user_id, joined_at")
      .eq("project_id", projectId);

    if (!data?.length) {
      setCollaborators([]);
      setIsLoading(false);
      return;
    }

    const userIds = data.map((c: any) => c.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
    setCollaborators(
      data.map((c: any) => ({
        ...c,
        name: nameMap.get(c.user_id) || "Unknown",
      }))
    );
    setIsLoading(false);
  };

  useEffect(() => {
    loadCollaborators();
  }, [projectId]);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setIsSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .ilike("full_name", `%${searchEmail.trim()}%`)
      .limit(10);

    const existingIds = new Set([user?.id, ...collaborators.map((c) => c.user_id)]);
    setSearchResults((data || []).filter((p: any) => !existingIds.has(p.user_id)));
    setIsSearching(false);
  };

  const handleAddCollaborator = async (userId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("portfolio_collaborators").insert({
        project_id: projectId,
        user_id: userId,
        invited_by: user.id,
      });
      if (error) {
        if (error.code === "23505") toast({ title: "Already a collaborator" });
        else throw error;
      } else {
        toast({ title: "Collaborator added!" });
        setSearchResults((prev) => prev.filter((p) => p.user_id !== userId));
        loadCollaborators();
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (collabId: string) => {
    await supabase.from("portfolio_collaborators").delete().eq("id", collabId);
    toast({ title: "Collaborator removed" });
    loadCollaborators();
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast({ title: "Invite code copied!", description: "Share this code with classmates to let them join." });
    }
  };

  if (isLoading) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Collaborators ({collaborators.length})</span>
          <div className="flex gap-2">
            {inviteCode && (
              <Button size="sm" variant="outline" onClick={copyInviteCode}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Code: {inviteCode}
              </Button>
            )}
            {isOwner && (
              <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
                <UserPlus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No collaborators yet. Add group members to share this project.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {collaborators.map((c) => (
              <Badge key={c.id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                {c.name}
                {isOwner && (
                  <button onClick={() => handleRemove(c.id)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Collaborator</DialogTitle>
            <DialogDescription>Search for classmates by name to add them as collaborators.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((p) => (
                  <div key={p.user_id} className="flex items-center justify-between rounded-lg border p-2">
                    <span className="text-sm">{p.full_name}</span>
                    <Button size="sm" onClick={() => handleAddCollaborator(p.user_id)}>
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PortfolioCollaborators;
