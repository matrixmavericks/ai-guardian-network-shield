import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy,
  Loader2,
  LogIn,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  join_code: string;
  created_by: string;
  members: { student_id: string; name: string }[];
}

interface Props {
  assignmentId: string;
  classId: string;
  minSize: number;
  maxSize: number;
  formation: string; // "student_choice" | "teacher_assigned"
  isTeacher: boolean;
  students?: { id: string; name: string }[];
}

const GroupManager: React.FC<Props> = ({
  assignmentId,
  classId,
  minSize,
  maxSize,
  formation,
  isTeacher,
  students = [],
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [showTeacherAssign, setShowTeacherAssign] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const loadGroups = async () => {
    setIsLoading(true);
    const { data: groupsData } = await supabase
      .from("assignment_groups")
      .select("*")
      .eq("assignment_id", assignmentId);

    if (!groupsData?.length) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    const groupIds = groupsData.map((g: any) => g.id);
    const { data: membersData } = await supabase
      .from("assignment_group_members")
      .select("group_id, student_id")
      .in("group_id", groupIds);

    const studentIds = [...new Set((membersData || []).map((m: any) => m.student_id))];
    let nameMap = new Map<string, string>();
    if (studentIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);
      nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
    }

    setGroups(
      groupsData.map((g: any) => ({
        ...g,
        members: (membersData || [])
          .filter((m: any) => m.group_id === g.id)
          .map((m: any) => ({
            student_id: m.student_id,
            name: nameMap.get(m.student_id) || "Unknown",
          })),
      }))
    );
    setIsLoading(false);
  };

  useEffect(() => {
    loadGroups();
  }, [assignmentId]);

  const myGroup = groups.find((g) =>
    g.members.some((m) => m.student_id === user?.id)
  );

  const handleCreateGroup = async () => {
    if (!user || !createName.trim()) return;
    try {
      const { data, error } = await supabase
        .from("assignment_groups")
        .insert({
          assignment_id: assignmentId,
          name: createName.trim(),
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;

      // Auto-join creator
      await supabase.from("assignment_group_members").insert({
        group_id: (data as any).id,
        student_id: user.id,
      });

      toast({ title: "Group created!" });
      setCreateName("");
      setShowCreate(false);
      loadGroups();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleJoinByCode = async () => {
    if (!user || !joinCode.trim()) return;
    setIsJoining(true);
    try {
      const { data: group } = await supabase
        .from("assignment_groups")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("join_code", joinCode.trim())
        .single();

      if (!group) {
        toast({ title: "Invalid code", description: "No group found with that code.", variant: "destructive" });
        return;
      }

      // Check max size
      const target = groups.find((g) => g.id === (group as any).id);
      if (target && target.members.length >= maxSize) {
        toast({ title: "Group full", description: `Max ${maxSize} members.`, variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("assignment_group_members").insert({
        group_id: (group as any).id,
        student_id: user.id,
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already in this group" });
        } else throw error;
      } else {
        toast({ title: "Joined group!" });
      }
      setJoinCode("");
      loadGroups();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    const target = groups.find((g) => g.id === groupId);
    if (target && target.members.length >= maxSize) {
      toast({ title: "Group full", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("assignment_group_members").insert({
        group_id: groupId,
        student_id: user.id,
      });
      if (error) throw error;
      toast({ title: "Joined!" });
      loadGroups();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    await supabase
      .from("assignment_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("student_id", user.id);
    toast({ title: "Left group" });
    loadGroups();
  };

  const handleTeacherAddStudent = async () => {
    if (!selectedGroupId || !selectedStudentId) return;
    try {
      const { error } = await supabase.from("assignment_group_members").insert({
        group_id: selectedGroupId,
        student_id: selectedStudentId,
      });
      if (error) {
        if (error.code === "23505") toast({ title: "Already in group" });
        else throw error;
      } else {
        toast({ title: "Student added!" });
      }
      setSelectedStudentId("");
      loadGroups();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleTeacherCreateGroup = async () => {
    if (!user || !createName.trim()) return;
    try {
      await supabase.from("assignment_groups").insert({
        assignment_id: assignmentId,
        name: createName.trim(),
        created_by: user.id,
      });
      toast({ title: "Group created!" });
      setCreateName("");
      setShowCreate(false);
      loadGroups();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (groupId: string, studentId: string) => {
    await supabase
      .from("assignment_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("student_id", studentId);
    toast({ title: "Removed" });
    loadGroups();
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Delete this group?")) return;
    await supabase.from("assignment_groups").delete().eq("id", groupId);
    toast({ title: "Group deleted" });
    loadGroups();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Group code copied!" });
  };

  // Get students not yet in any group
  const assignedStudentIds = new Set(groups.flatMap((g) => g.members.map((m) => m.student_id)));
  const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.id));

  if (isLoading) {
    return <div className="py-4 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Groups ({groups.length}) • {minSize}-{maxSize} members
        </h3>
        <div className="flex gap-2">
          {(isTeacher || (formation === "student_choice" && !myGroup)) && (
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Create Group
            </Button>
          )}
          {isTeacher && formation === "teacher_assigned" && (
            <Button size="sm" variant="outline" onClick={() => setShowTeacherAssign(true)}>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Assign Students
            </Button>
          )}
        </div>
      </div>

      {/* Student: Join by code */}
      {!isTeacher && !myGroup && formation === "student_choice" && (
        <div className="flex gap-2">
          <Input
            placeholder="Enter group code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" onClick={handleJoinByCode} disabled={isJoining || !joinCode.trim()}>
            <LogIn className="mr-1 h-3.5 w-3.5" /> Join
          </Button>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No groups yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const isMember = g.members.some((m) => m.student_id === user?.id);
            const isFull = g.members.length >= maxSize;
            return (
              <Card key={g.id} className={isMember ? "border-primary/30 bg-primary/5" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{g.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant={isFull ? "default" : "secondary"} className="text-xs">
                        {g.members.length}/{maxSize}
                      </Badge>
                      {isTeacher && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteGroup(g.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {g.members.map((m) => (
                      <Badge key={m.student_id} variant="outline" className="text-xs flex items-center gap-1">
                        {m.name}
                        {isTeacher && (
                          <button onClick={() => handleRemoveMember(g.id, m.student_id)} className="ml-1 hover:text-destructive">×</button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => copyCode(g.join_code)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Code: {g.join_code}
                    </button>
                    {!isTeacher && !isMember && !myGroup && !isFull && formation === "student_choice" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleJoinGroup(g.id)}>
                        Join
                      </Button>
                    )}
                    {!isTeacher && isMember && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleLeaveGroup(g.id)}>
                        Leave
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create group dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>Name your group. Members can join using the generated code.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Group Name</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Team Alpha" className="mt-1" />
            </div>
            <Button
              onClick={isTeacher ? handleTeacherCreateGroup : handleCreateGroup}
              disabled={!createName.trim()}
              className="w-full"
            >
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher assign dialog */}
      <Dialog open={showTeacherAssign} onOpenChange={setShowTeacherAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student to Group</DialogTitle>
            <DialogDescription>
              {unassignedStudents.length} student(s) not yet in a group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Group</Label>
              <select
                value={selectedGroupId || ""}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Select group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.members.length}/{maxSize})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Student</Label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Select student...</option>
                {unassignedStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleTeacherAddStudent}
              disabled={!selectedGroupId || !selectedStudentId}
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Add to Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupManager;
