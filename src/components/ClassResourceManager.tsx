import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft, Bookmark, BookmarkCheck, Download, ExternalLink, File, FileText,
  Folder, FolderOpen, FolderPlus, Image, Link2, Loader, Music, Plus, Search,
  Trash2, Upload, Video, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ResourceFolder {
  id: string;
  class_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
}

interface ClassResource {
  id: string;
  class_id: string;
  folder_id: string | null;
  resource_type: string;
  title: string;
  description: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number;
  mime_type: string | null;
  external_url: string | null;
  tags: string[];
  created_at: string;
}

interface Props {
  classId: string;
  className: string;
  isTeacher: boolean;
  onSelectResourceForAI?: (resource: ClassResource) => void;
}

const fileTypeIcon = (mime: string | null, type: string) => {
  if (type === "link") return <Link2 className="h-5 w-5 text-blue-500" />;
  if (!mime) return <File className="h-5 w-5 text-muted-foreground" />;
  if (mime.startsWith("image/")) return <Image className="h-5 w-5 text-emerald-500" />;
  if (mime.startsWith("video/")) return <Video className="h-5 w-5 text-purple-500" />;
  if (mime.startsWith("audio/")) return <Music className="h-5 w-5 text-amber-500" />;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("presentation"))
    return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ClassResourceManager: React.FC<Props> = ({ classId, className, isTeacher, onSelectResourceForAI }) => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [resources, setResources] = useState<ClassResource[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<ResourceFolder[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDesc, setLinkDesc] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, resourcesRes, bookmarksRes] = await Promise.all([
        supabase
          .from("class_resource_folders")
          .select("*")
          .eq("class_id", classId)
          .order("name"),
        supabase
          .from("class_resources")
          .select("*")
          .eq("class_id", classId)
          .order("created_at", { ascending: false }),
        user
          ? supabase
              .from("student_resource_bookmarks")
              .select("resource_id")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      setFolders((foldersRes.data || []) as unknown as ResourceFolder[]);
      setResources((resourcesRes.data || []) as unknown as ClassResource[]);
      setBookmarkedIds(new Set((bookmarksRes.data || []).map((b: any) => b.resource_id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigation
  const navigateToFolder = (folder: ResourceFolder | null) => {
    if (!folder) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      setCurrentFolderId(folder.id);
      const idx = folderPath.findIndex(f => f.id === folder.id);
      if (idx >= 0) {
        setFolderPath(folderPath.slice(0, idx + 1));
      } else {
        setFolderPath([...folderPath, folder]);
      }
    }
  };

  const currentFolders = folders.filter(f => f.parent_folder_id === currentFolderId);
  const currentResources = resources.filter(r => r.folder_id === currentFolderId);

  const filteredResources = searchQuery
    ? resources.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null;

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const { error } = await supabase.from("class_resource_folders").insert({
        class_id: classId,
        name: newFolderName.trim(),
        parent_folder_id: currentFolderId,
        created_by: user!.id,
      } as any);
      if (error) throw error;
      toast.success("Folder created");
      setCreateFolderOpen(false);
      setNewFolderName("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      toast.error("Please provide a title and file");
      return;
    }
    setUploading(true);
    try {
      const filePath = `${classId}/${currentFolderId || "root"}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("class-resources")
        .upload(filePath, uploadFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("class-resources")
        .getPublicUrl(filePath);

      const { error } = await supabase.from("class_resources").insert({
        class_id: classId,
        folder_id: currentFolderId,
        uploaded_by: user!.id,
        resource_type: "file",
        title: uploadTitle.trim(),
        description: uploadDesc.trim(),
        file_url: urlData.publicUrl,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        mime_type: uploadFile.type,
        tags: uploadTags.split(",").map(t => t.trim()).filter(Boolean),
      } as any);
      if (error) throw error;

      toast.success("File uploaded");
      setUploadOpen(false);
      setUploadTitle("");
      setUploadDesc("");
      setUploadFile(null);
      setUploadTags("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Add link
  const handleAddLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      toast.error("Please provide a title and URL");
      return;
    }
    try {
      const { error } = await supabase.from("class_resources").insert({
        class_id: classId,
        folder_id: currentFolderId,
        uploaded_by: user!.id,
        resource_type: "link",
        title: linkTitle.trim(),
        description: linkDesc.trim(),
        external_url: linkUrl.trim(),
        tags: [],
      } as any);
      if (error) throw error;
      toast.success("Link added");
      setAddLinkOpen(false);
      setLinkTitle("");
      setLinkUrl("");
      setLinkDesc("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add link");
    }
  };

  // Delete resource
  const handleDelete = async (resource: ClassResource) => {
    if (!confirm(`Delete "${resource.title}"?`)) return;
    try {
      if (resource.file_url) {
        const path = resource.file_url.split("/class-resources/")[1];
        if (path) await supabase.storage.from("class-resources").remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase.from("class_resources").delete().eq("id", resource.id);
      if (error) throw error;
      toast.success("Deleted");
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete");
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folder: ResourceFolder) => {
    const hasChildren = folders.some(f => f.parent_folder_id === folder.id);
    const hasResources = resources.some(r => r.folder_id === folder.id);
    if (hasChildren || hasResources) {
      toast.error("Folder must be empty before deleting");
      return;
    }
    if (!confirm(`Delete folder "${folder.name}"?`)) return;
    try {
      const { error } = await supabase.from("class_resource_folders").delete().eq("id", folder.id);
      if (error) throw error;
      toast.success("Folder deleted");
      loadData();
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  // Bookmark
  const toggleBookmark = async (resourceId: string) => {
    if (!user) return;
    const isBookmarked = bookmarkedIds.has(resourceId);
    try {
      if (isBookmarked) {
        await supabase
          .from("student_resource_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("resource_id", resourceId);
        setBookmarkedIds(prev => { const s = new Set(prev); s.delete(resourceId); return s; });
      } else {
        await supabase.from("student_resource_bookmarks").insert({
          user_id: user.id,
          resource_id: resourceId,
        } as any);
        setBookmarkedIds(prev => new Set(prev).add(resourceId));
      }
    } catch {
      toast.error("Failed to update bookmark");
    }
  };

  const displayResources = filteredResources ?? currentResources;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader className="h-5 w-5 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading resources...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {isTeacher && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" /> New Folder
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddLinkOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Add Link
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Upload File
            </Button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      {!searchQuery && (
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => navigateToFolder(null)}
            className={`flex items-center gap-1 rounded px-2 py-1 hover:bg-muted ${!currentFolderId ? "font-semibold text-primary" : "text-muted-foreground"}`}
          >
            <Folder className="h-3.5 w-3.5" /> {className}
          </button>
          {folderPath.map(f => (
            <React.Fragment key={f.id}>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => navigateToFolder(f)}
                className={`rounded px-2 py-1 hover:bg-muted ${currentFolderId === f.id ? "font-semibold text-primary" : "text-muted-foreground"}`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Folders */}
      {!searchQuery && currentFolders.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {currentFolders.map(folder => (
            <Card
              key={folder.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => navigateToFolder(folder)}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <FolderOpen className="h-8 w-8 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {resources.filter(r => r.folder_id === folder.id).length} items
                  </p>
                </div>
                {isTeacher && (
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                    onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resources */}
      {displayResources.length === 0 && currentFolders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <File className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? "No resources match your search" : "No resources in this folder yet"}
            </p>
            {isTeacher && !searchQuery && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload First Resource
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayResources.map(resource => (
            <Card key={resource.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="flex items-center gap-4 py-3">
                {fileTypeIcon(resource.mime_type, resource.resource_type)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-sm">{resource.title}</p>
                    {resource.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {resource.description || resource.file_name || resource.external_url}
                    {resource.file_size > 0 && ` • ${formatSize(resource.file_size)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {/* Bookmark */}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleBookmark(resource.id)}>
                    {bookmarkedIds.has(resource.id)
                      ? <BookmarkCheck className="h-4 w-4 text-primary" />
                      : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  {/* AI integration */}
                  {onSelectResourceForAI && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSelectResourceForAI(resource)}>
                      Use in AI
                    </Button>
                  )}
                  {/* Open/Download */}
                  {resource.resource_type === "link" && resource.external_url && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={resource.external_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {resource.file_url && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={resource.file_url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {/* Delete */}
                  {isTeacher && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(resource)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>Organize resources into folders for your students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Folder Name</Label>
              <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. Chapter 1 Notes" />
            </div>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="w-full">
              <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resource</DialogTitle>
            <DialogDescription>Upload PDFs, presentations, images, videos, or any other files.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="e.g. Photosynthesis Notes" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="Brief description..." rows={2} />
            </div>
            <div>
              <Label>File *</Label>
              <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              {uploadFile && <p className="text-xs text-muted-foreground mt-1">{uploadFile.name} ({formatSize(uploadFile.size)})</p>}
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder="e.g. biology, exam prep" />
            </div>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadTitle.trim()} className="w-full">
              {uploading ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="mr-2 h-4 w-4" /> Upload</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>Add a web link or external resource for your students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="e.g. Khan Academy - Quadratics" />
            </div>
            <div>
              <Label>URL *</Label>
              <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={linkDesc} onChange={e => setLinkDesc(e.target.value)} placeholder="What this link covers..." rows={2} />
            </div>
            <Button onClick={handleAddLink} disabled={!linkTitle.trim() || !linkUrl.trim()} className="w-full">
              <Link2 className="mr-2 h-4 w-4" /> Add Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassResourceManager;
