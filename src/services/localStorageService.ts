
// A service to manage data persistence in localStorage
// This handles users, assignments, grades, and settings

type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  class?: string;
  lastActive: string;
  active: boolean;
  securityKeys?: string[];
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  createdBy: string; // teacher id
  createdAt: string;
  attachments?: string[];
  points: number;
}

export interface Grade {
  id: string;
  assignmentId: string;
  studentId: string;
  score: number;
  feedback?: string;
  submittedAt: string;
  gradedAt: string;
  gradedBy: string; // teacher id
  attachments?: string[];
}

export interface SecurityKey {
  id: string;
  name: string;
  key: string;
  service: string;
  createdBy: string;
  createdAt: string;
  lastUsed?: string;
}

// Storage keys
const STORAGE_KEYS = {
  USERS: 'aiConditioner_users',
  CURRENT_USER: 'aiConditioner_user',
  ASSIGNMENTS: 'aiConditioner_assignments',
  GRADES: 'aiConditioner_grades',
  SECURITY_KEYS: 'aiConditioner_security_keys',
};

// Initialize storage with demo data if it doesn't exist
const initializeStorage = () => {
  // Check if users already exist
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    // Create demo users
    const demoUsers: User[] = [
      {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        department: 'Administration',
        lastActive: new Date().toISOString(),
        active: true,
      },
      {
        id: '2',
        email: 'teacher@example.com',
        name: 'Jennifer Smith',
        role: 'teacher',
        department: 'Science',
        lastActive: new Date().toISOString(),
        active: true,
      },
      {
        id: '3',
        email: 'student@example.com',
        name: 'Michael Brown',
        role: 'student',
        class: 'Grade 11A',
        lastActive: new Date().toISOString(),
        active: true,
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(demoUsers));
    
    // Create demo assignments
    const demoAssignments: Assignment[] = [
      {
        id: '1',
        title: 'Introduction to Physics',
        description: 'Complete the worksheet on Newton\'s Laws of Motion',
        subject: 'Physics',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        createdBy: '2', // teacher id
        createdAt: new Date().toISOString(),
        points: 100,
      },
      {
        id: '2',
        title: 'Essay: Literary Analysis',
        description: 'Write a 1000-word analysis of "To Kill a Mockingbird"',
        subject: 'English',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        createdBy: '2', // teacher id
        createdAt: new Date().toISOString(),
        points: 150,
      }
    ];
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(demoAssignments));
    
    // Create demo grades
    const demoGrades: Grade[] = [
      {
        id: '1',
        assignmentId: '1',
        studentId: '3',
        score: 85,
        feedback: 'Good work! Make sure to include more details on the third law.',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        gradedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        gradedBy: '2', // teacher id
      }
    ];
    localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(demoGrades));
    
    // Create demo security keys
    const demoSecurityKeys: SecurityKey[] = [
      {
        id: '1',
        name: 'OpenAI API Key',
        key: 'sk-demo-key-123456',
        service: 'OpenAI',
        createdBy: '1', // admin id
        createdAt: new Date().toISOString(),
      }
    ];
    localStorage.setItem(STORAGE_KEYS.SECURITY_KEYS, JSON.stringify(demoSecurityKeys));
  }
};

// User methods
export const getUsers = (): User[] => {
  initializeStorage();
  const users = localStorage.getItem(STORAGE_KEYS.USERS);
  return users ? JSON.parse(users) : [];
};

export const getUserById = (id: string): User | undefined => {
  const users = getUsers();
  return users.find(user => user.id === id);
};

export const getUsersByRole = (role: UserRole): User[] => {
  const users = getUsers();
  return users.filter(user => user.role === role);
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existingUserIndex = users.findIndex(u => u.id === user.id);
  
  if (existingUserIndex >= 0) {
    users[existingUserIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const deleteUser = (id: string): void => {
  const users = getUsers().filter(user => user.id !== id);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

// Authentication methods
export const getCurrentUser = (): User | null => {
  initializeStorage();
  const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 
                   sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  
  if (!userJson) return null;
  
  const userData = JSON.parse(userJson);
  // Verify the user still exists in the database
  const user = getUserById(userData.id);
  
  if (!user || !user.active) {
    logout();
    return null;
  }
  
  return user;
};

export const login = (email: string, password: string, remember: boolean = false): User | null => {
  // In a real app, we'd check the password hash against the stored password
  // For this demo, we'll just check if the email exists
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
  
  if (user) {
    // Update last active
    user.lastActive = new Date().toISOString();
    saveUser(user);
    
    // Store in the appropriate storage
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  }
  
  return null;
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// Assignment methods
export const getAssignments = (): Assignment[] => {
  initializeStorage();
  const assignments = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
  return assignments ? JSON.parse(assignments) : [];
};

export const getAssignmentById = (id: string): Assignment | undefined => {
  const assignments = getAssignments();
  return assignments.find(assignment => assignment.id === id);
};

export const getAssignmentsByTeacher = (teacherId: string): Assignment[] => {
  const assignments = getAssignments();
  return assignments.filter(assignment => assignment.createdBy === teacherId);
};

export const saveAssignment = (assignment: Assignment): void => {
  const assignments = getAssignments();
  const existingAssignmentIndex = assignments.findIndex(a => a.id === assignment.id);
  
  if (existingAssignmentIndex >= 0) {
    assignments[existingAssignmentIndex] = assignment;
  } else {
    assignments.push(assignment);
  }
  
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
};

export const deleteAssignment = (id: string): void => {
  const assignments = getAssignments().filter(assignment => assignment.id !== id);
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
};

// Grade methods
export const getGrades = (): Grade[] => {
  initializeStorage();
  const grades = localStorage.getItem(STORAGE_KEYS.GRADES);
  return grades ? JSON.parse(grades) : [];
};

export const getGradeById = (id: string): Grade | undefined => {
  const grades = getGrades();
  return grades.find(grade => grade.id === id);
};

export const getGradesByStudent = (studentId: string): Grade[] => {
  const grades = getGrades();
  return grades.filter(grade => grade.studentId === studentId);
};

export const getGradesByAssignment = (assignmentId: string): Grade[] => {
  const grades = getGrades();
  return grades.filter(grade => grade.assignmentId === assignmentId);
};

export const saveGrade = (grade: Grade): void => {
  const grades = getGrades();
  const existingGradeIndex = grades.findIndex(g => g.id === grade.id);
  
  if (existingGradeIndex >= 0) {
    grades[existingGradeIndex] = grade;
  } else {
    grades.push(grade);
  }
  
  localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grades));
};

export const deleteGrade = (id: string): void => {
  const grades = getGrades().filter(grade => grade.id !== id);
  localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grades));
};

// Security key methods
export const getSecurityKeys = (): SecurityKey[] => {
  initializeStorage();
  const keys = localStorage.getItem(STORAGE_KEYS.SECURITY_KEYS);
  return keys ? JSON.parse(keys) : [];
};

export const getSecurityKeyById = (id: string): SecurityKey | undefined => {
  const keys = getSecurityKeys();
  return keys.find(key => key.id === id);
};

export const getSecurityKeyByService = (service: string): SecurityKey | undefined => {
  const keys = getSecurityKeys();
  return keys.find(key => key.service === service);
};

export const saveSecurityKey = (key: SecurityKey): void => {
  const keys = getSecurityKeys();
  const existingKeyIndex = keys.findIndex(k => k.id === key.id);
  
  if (existingKeyIndex >= 0) {
    keys[existingKeyIndex] = key;
  } else {
    keys.push(key);
  }
  
  localStorage.setItem(STORAGE_KEYS.SECURITY_KEYS, JSON.stringify(keys));
};

export const deleteSecurityKey = (id: string): void => {
  const keys = getSecurityKeys().filter(key => key.id !== id);
  localStorage.setItem(STORAGE_KEYS.SECURITY_KEYS, JSON.stringify(keys));
};

// Utility function to generate a new ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Export default initialized storage
export default {
  initializeStorage,
  getUsers,
  getUserById,
  getUsersByRole,
  saveUser,
  deleteUser,
  getCurrentUser,
  login,
  logout,
  getAssignments,
  getAssignmentById,
  getAssignmentsByTeacher,
  saveAssignment,
  deleteAssignment,
  getGrades,
  getGradeById,
  getGradesByStudent,
  getGradesByAssignment,
  saveGrade,
  deleteGrade,
  getSecurityKeys,
  getSecurityKeyById,
  getSecurityKeyByService,
  saveSecurityKey,
  deleteSecurityKey,
  generateId,
};
