import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  Plus, 
  Trash, 
  Edit, 
  Calendar, 
  Book,
  FileCheck,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DashboardSidebar from "@/components/DashboardSidebar";
import { format } from "date-fns";
import { 
  getAssignments, 
  saveAssignment, 
  deleteAssignment, 
  Assignment, 
  generateId, 
  getCurrentUser,
  getGradesByAssignment
} from "@/services/localStorageService";

const subjects = [
  "Mathematics", 
  "Physics", 
  "Chemistry", 
  "Biology", 
  "English", 
  "History", 
  "Geography", 
  "Computer Science",
  "Art",
  "Physical Education",
  "Music",
  "Foreign Languages"
];

const AssignmentsPage = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    dueDate: "",
    points: "100"
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = () => {
    const allAssignments = getAssignments();
    setAssignments(allAssignments);
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddAssignment = () => {
    const newAssignment: Assignment = {
      id: generateId(),
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      dueDate: new Date(formData.dueDate).toISOString(),
      createdBy: currentUser?.id || 'unknown',
      createdAt: new Date().toISOString(),
      points: parseInt(formData.points) || 100
    };
    
    saveAssignment(newAssignment);
    loadAssignments();
    setIsAddingAssignment(false);
    resetForm();
    
    toast({
      title: "Assignment created",
      description: `"${newAssignment.title}" has been created successfully.`,
    });
  };

  const handleEditAssignment = () => {
    if (!editingAssignment) return;
    
    const updatedAssignment: Assignment = {
      ...editingAssignment,
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      dueDate: new Date(formData.dueDate).toISOString(),
      points: parseInt(formData.points) || 100
    };
    
    saveAssignment(updatedAssignment);
    loadAssignments();
    setEditingAssignment(null);
    resetForm();
    
    toast({
      title: "Assignment updated",
      description: `"${updatedAssignment.title}" has been updated successfully.`,
    });
  };

  const handleDeleteAssignment = (id: string) => {
    deleteAssignment(id);
    loadAssignments();
    
    toast({
      title: "Assignment deleted",
      description: "The assignment has been removed from the system.",
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      subject: "",
      dueDate: "",
      points: "100"
    });
  };

  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      subject: assignment.subject,
      dueDate: format(new Date(assignment.dueDate), "yyyy-MM-dd"),
      points: assignment.points.toString()
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const getSubmissionCount = (assignmentId: string) => {
    const grades = getGradesByAssignment(assignmentId);
    return grades.length;
  };

  const filteredAssignments = assignments
    .filter(assignment => 
      (searchQuery === "" || 
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) &&
      (subjectFilter === null || assignment.subject === subjectFilter)
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  const upcomingAssignments = filteredAssignments.filter(
    a => new Date(a.dueDate) >= new Date()
  );
  
  const pastAssignments = filteredAssignments.filter(
    a => new Date(a.dueDate) < new Date()
  );

  const AssignmentForm = () => (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Assignment Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Enter assignment title"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Select 
          value={formData.subject}
          onValueChange={(value) => handleChange("subject", value)}
        >
          <SelectTrigger id="subject">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter assignment description"
          required
          rows={4}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange("dueDate", e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="points">Points</Label>
          <Input
            id="points"
            type="number"
            min="0"
            value={formData.points}
            onChange={(e) => handleChange("points", e.target.value)}
            required
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          setIsAddingAssignment(false);
          setEditingAssignment(null);
        }}>
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={editingAssignment ? handleEditAssignment : handleAddAssignment}
        >
          {editingAssignment ? "Update Assignment" : "Create Assignment"}
        </Button>
      </DialogFooter>
    </form>
  );

  const AssignmentsTable = ({ assignments }: { assignments: Assignment[] }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Submissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                No assignments found
              </TableCell>
            </TableRow>
          ) : (
            assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">{assignment.title}</TableCell>
                <TableCell>
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {assignment.subject}
                  </span>
                </TableCell>
                <TableCell>{formatDate(assignment.dueDate)}</TableCell>
                <TableCell>{assignment.points}</TableCell>
                <TableCell>{getSubmissionCount(assignment.id)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditDialog(assignment)}
                    className="mr-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    className="text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Assignments</h1>
            <Button onClick={() => setIsAddingAssignment(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Assignment List</CardTitle>
                  <CardDescription>
                    Create and manage assignments for your classes
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                      placeholder="Search assignments..." 
                      className="pl-8 w-full md:w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select onValueChange={(value) => setSubjectFilter(value || null)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_subjects">All Subjects</SelectItem>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upcoming">
                <TabsList className="mb-4">
                  <TabsTrigger value="upcoming">
                    <Calendar className="h-4 w-4 mr-2" />
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger value="past">
                    <FileCheck className="h-4 w-4 mr-2" />
                    Past
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    <Book className="h-4 w-4 mr-2" />
                    All
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming">
                  <AssignmentsTable assignments={upcomingAssignments} />
                </TabsContent>
                
                <TabsContent value="past">
                  <AssignmentsTable assignments={pastAssignments} />
                </TabsContent>
                
                <TabsContent value="all">
                  <AssignmentsTable assignments={filteredAssignments} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Assignment Dialog */}
      <Dialog open={isAddingAssignment} onOpenChange={setIsAddingAssignment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Create a new assignment for your students.
            </DialogDescription>
          </DialogHeader>
          <AssignmentForm />
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update assignment details.
            </DialogDescription>
          </DialogHeader>
          <AssignmentForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentsPage;
