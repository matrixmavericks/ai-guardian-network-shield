
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  User, 
  Users, 
  UserPlus, 
  MoreHorizontal, 
  Trash, 
  Edit, 
  Shield, 
  UserCheck,
  Search,
  ListFilter
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Sample user data
const initialUsers = [
  { 
    id: 1, 
    name: "John Doe", 
    email: "john.doe@example.com", 
    role: "Admin", 
    status: "Active",
    department: "IT Administration",
    lastActive: "5 minutes ago" 
  },
  { 
    id: 2, 
    name: "Jane Smith", 
    email: "jane.smith@example.com", 
    role: "Teacher", 
    status: "Active",
    department: "Mathematics",
    lastActive: "1 hour ago" 
  },
  { 
    id: 3, 
    name: "Robert Johnson", 
    email: "robert@example.com", 
    role: "IT Admin", 
    status: "Inactive",
    department: "Technology",
    lastActive: "3 days ago" 
  },
  { 
    id: 4, 
    name: "Emily Davis", 
    email: "emily.davis@example.com", 
    role: "Teacher", 
    status: "Active",
    department: "Science",
    lastActive: "2 hours ago" 
  },
  { 
    id: 5, 
    name: "Michael Wilson", 
    email: "michael@example.com", 
    role: "Student", 
    status: "Active",
    department: "Grade 11",
    lastActive: "30 minutes ago" 
  },
];

const UserManagement = () => {
  const [users, setUsers] = useState(initialUsers);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<(typeof initialUsers)[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleAddUser = (userData: any) => {
    const newUser = {
      id: users.length + 1,
      ...userData,
      status: "Active",
      lastActive: "Just now"
    };
    
    setUsers([...users, newUser]);
    setIsAddingUser(false);
    
    toast({
      title: "User added successfully",
      description: `${userData.name} has been added as a ${userData.role}.`,
    });
  };
  
  const handleEditUser = (userData: any) => {
    if (!editingUser) return;
    
    const updatedUsers = users.map(user => 
      user.id === editingUser.id ? { ...user, ...userData } : user
    );
    
    setUsers(updatedUsers);
    setEditingUser(null);
    
    toast({
      title: "User updated successfully",
      description: `${userData.name}'s information has been updated.`,
    });
  };
  
  const handleDeleteUser = (userId: number) => {
    setUsers(users.filter(user => user.id !== userId));
    
    toast({
      title: "User deleted",
      description: "The user has been removed from the system.",
    });
  };
  
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the initials from a name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  // Get color based on role
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-blue-100 text-blue-700';
      case 'Teacher': return 'bg-purple-100 text-purple-700';
      case 'IT Admin': return 'bg-amber-100 text-amber-700';
      case 'Student': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  const getStatusColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-slate-100 text-slate-700';
  };

  const UserForm = ({ user = null, onSubmit }: { user?: any, onSubmit: (data: any) => void }) => {
    const [formData, setFormData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'Teacher',
      department: user?.department || '',
    });
    
    const handleChange = (field: string, value: string) => {
      setFormData({ ...formData, [field]: value });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={formData.email} 
            onChange={(e) => handleChange('email', e.target.value)} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select 
            value={formData.role}
            onValueChange={(value) => handleChange('role', value)}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Teacher">Teacher</SelectItem>
              <SelectItem value="IT Admin">IT Admin</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="department">Department or Class</Label>
          <Input 
            id="department" 
            value={formData.department} 
            onChange={(e) => handleChange('department', e.target.value)} 
            required 
          />
        </div>
        
        <DialogFooter>
          <Button type="submit">{user ? 'Update User' : 'Add User'}</Button>
        </DialogFooter>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account in the system.
              </DialogDescription>
            </DialogHeader>
            <UserForm onSubmit={handleAddUser} />
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>All Users</DropdownMenuItem>
                  <DropdownMenuItem>Admins</DropdownMenuItem>
                  <DropdownMenuItem>Teachers</DropdownMenuItem>
                  <DropdownMenuItem>Students</DropdownMenuItem>
                  <DropdownMenuItem>Active Only</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department/Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-2`}>
                          {getInitials(user.name)}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell>{user.lastActive}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                setEditingUser(user);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                                <DialogDescription>
                                  Update user information and settings.
                                </DialogDescription>
                              </DialogHeader>
                              {editingUser && <UserForm user={editingUser} onSubmit={handleEditUser} />}
                            </DialogContent>
                          </Dialog>
                          <DropdownMenuItem>
                            <Shield className="h-4 w-4 mr-2" />
                            Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserCheck className="h-4 w-4 mr-2" />
                            {user.status === "Active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onSelect={() => handleDeleteUser(user.id)}>
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No users found matching your search criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
