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
  password?: string; // Added for authentication
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
  gradeBoundaries?: GradeBoundary[]; // Added for grade boundaries
}

export interface GradeBoundary {
  grade: string; // A, B, C, etc.
  minPercentage: number;
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

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  subject: string;
  modules: LearningModule[];
  createdBy: string; // teacher id
  createdAt: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  resources: string[];
  quizzes: string[];
  order: number;
}

export interface TeacherPlan {
  id: string;
  title: string;
  subject: string;
  description: string;
  content: string;
  createdBy: string; // teacher id
  createdAt: string;
  targetClass?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  USERS: 'aiConditioner_users',
  CURRENT_USER: 'aiConditioner_user',
  ASSIGNMENTS: 'aiConditioner_assignments',
  GRADES: 'aiConditioner_grades',
  SECURITY_KEYS: 'aiConditioner_security_keys',
  LEARNING_PATHS: 'aiConditioner_learning_paths',
  TEACHER_PLANS: 'aiConditioner_teacher_plans',
  MESSAGES: 'aiConditioner_messages',
};

// Initialize storage with demo data if it doesn't exist
const initializeStorage = () => {
  console.log("Initializing storage...");
  
  // Force clear any existing storage to ensure we have fresh demo data with passwords
  localStorage.removeItem(STORAGE_KEYS.USERS);
  
  // Check if users already exist
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    console.log("Creating demo data...");
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
        password: 'password123', // Demo password
      },
      {
        id: '2',
        email: 'teacher@example.com',
        name: 'Jennifer Smith',
        role: 'teacher',
        department: 'Science',
        lastActive: new Date().toISOString(),
        active: true,
        password: 'password123', // Demo password
      },
      {
        id: '3',
        email: 'student@example.com',
        name: 'Michael Brown',
        role: 'student',
        class: 'Grade 11A',
        lastActive: new Date().toISOString(),
        active: true,
        password: 'password123', // Demo password
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(demoUsers));
    console.log("Demo users created:", demoUsers);
    
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
    
    // Create demo learning paths
    const demoLearningPaths: LearningPath[] = [
      {
        id: '1',
        title: 'Introduction to Physics',
        description: 'A comprehensive introduction to basic physics concepts',
        subject: 'Physics',
        modules: [
          {
            id: '1',
            title: 'Newton\'s Laws of Motion',
            description: 'Understanding the fundamental laws of motion',
            resources: ['Newton\'s Laws Explained', 'Motion in Daily Life'],
            quizzes: ['Basic Motion Quiz', 'Applied Forces Test'],
            order: 1
          },
          {
            id: '2',
            title: 'Energy and Work',
            description: 'Exploring the relationship between energy and work',
            resources: ['Types of Energy', 'Conservation of Energy'],
            quizzes: ['Energy Conversion Quiz', 'Work Calculations'],
            order: 2
          }
        ],
        createdBy: '2',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(demoLearningPaths));
    
    // Create demo teacher plans
    const demoTeacherPlans: TeacherPlan[] = [
      {
        id: '1',
        title: 'Physics Weekly Plan',
        subject: 'Physics',
        description: 'Weekly teaching plan for Grade 11 Physics',
        content: 'Monday: Newton\'s First Law\nTuesday: Newton\'s Second Law\nWednesday: Newton\'s Third Law\nThursday: Laboratory Experiment\nFriday: Quiz',
        createdBy: '2',
        createdAt: new Date().toISOString(),
        targetClass: 'Grade 11A'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.TEACHER_PLANS, JSON.stringify(demoTeacherPlans));
    
    // Create demo messages
    const demoMessages: Message[] = [
      {
        id: '1',
        senderId: '2', // teacher
        receiverId: '3', // student
        content: 'Don\'t forget to submit your physics assignment by Friday!',
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(demoMessages));
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
  
  if (!userJson) {
    console.log("No current user found");
    return null;
  }
  
  try {
    const userData = JSON.parse(userJson);
    console.log("Current user data from storage:", userData);
    
    // Verify the user still exists in the database
    const user = getUserById(userData.id);
    
    if (!user || !user.active) {
      console.log("User no longer exists or is inactive");
      logout();
      return null;
    }
    
    console.log("Current user validated:", user);
    return user;
  } catch (error) {
    console.error("Error parsing user data:", error);
    logout();
    return null;
  }
};

export const login = (email: string, password: string, remember: boolean = false): User | null => {
  // Force initialize storage to make sure we have the demo users with passwords
  initializeStorage();
  
  // In a real app, we'd check the password hash against the stored password
  // For this demo, we'll just check if the email and password match
  const users = getUsers();
  console.log("Login attempt with:", { email, password });
  
  // Log all users in storage for debugging
  users.forEach(u => {
    console.log(`User in storage: ${u.email}, has password: ${u.password !== undefined}`);
  });
  
  const user = users.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.password === password && 
    u.active
  );
  
  console.log("Found user:", user);
  
  if (user) {
    // Update last active
    user.lastActive = new Date().toISOString();
    saveUser(user);
    
    // Store in the appropriate storage
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    console.log("User logged in successfully:", user);
    return user;
  }
  
  console.log("Login failed: no matching user found");
  return null;
};

export const logout = (): void => {
  console.log("Logging out user");
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// Registration method
export const registerUser = (user: Omit<User, 'id' | 'lastActive'>): User | null => {
  const users = getUsers();
  
  // Check if email already exists
  const existingUser = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (existingUser) {
    return null;
  }
  
  const newUser: User = {
    ...user,
    id: generateId(),
    lastActive: new Date().toISOString(),
    active: true
  };
  
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  
  return newUser;
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

// Learning path methods
export const getLearningPaths = (): LearningPath[] => {
  initializeStorage();
  const paths = localStorage.getItem(STORAGE_KEYS.LEARNING_PATHS);
  return paths ? JSON.parse(paths) : [];
};

export const getLearningPathById = (id: string): LearningPath | undefined => {
  const paths = getLearningPaths();
  return paths.find(path => path.id === id);
};

export const getLearningPathsBySubject = (subject: string): LearningPath[] => {
  const paths = getLearningPaths();
  return paths.filter(path => path.subject === subject);
};

export const saveLearningPath = (path: LearningPath): void => {
  const paths = getLearningPaths();
  const existingPathIndex = paths.findIndex(p => p.id === path.id);
  
  if (existingPathIndex >= 0) {
    paths[existingPathIndex] = path;
  } else {
    paths.push(path);
  }
  
  localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(paths));
};

export const deleteLearningPath = (id: string): void => {
  const paths = getLearningPaths().filter(path => path.id !== id);
  localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(paths));
};

// Teacher plan methods
export const getTeacherPlans = (): TeacherPlan[] => {
  initializeStorage();
  const plans = localStorage.getItem(STORAGE_KEYS.TEACHER_PLANS);
  return plans ? JSON.parse(plans) : [];
};

export const getTeacherPlanById = (id: string): TeacherPlan | undefined => {
  const plans = getTeacherPlans();
  return plans.find(plan => plan.id === id);
};

export const getTeacherPlansByTeacher = (teacherId: string): TeacherPlan[] => {
  const plans = getTeacherPlans();
  return plans.filter(plan => plan.createdBy === teacherId);
};

export const saveTeacherPlan = (plan: TeacherPlan): void => {
  const plans = getTeacherPlans();
  const existingPlanIndex = plans.findIndex(p => p.id === plan.id);
  
  if (existingPlanIndex >= 0) {
    plans[existingPlanIndex] = plan;
  } else {
    plans.push(plan);
  }
  
  localStorage.setItem(STORAGE_KEYS.TEACHER_PLANS, JSON.stringify(plans));
};

export const deleteTeacherPlan = (id: string): void => {
  const plans = getTeacherPlans().filter(plan => plan.id !== id);
  localStorage.setItem(STORAGE_KEYS.TEACHER_PLANS, JSON.stringify(plans));
};

// Message methods
export const getMessages = (): Message[] => {
  initializeStorage();
  const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  return messages ? JSON.parse(messages) : [];
};

export const getMessagesByUser = (userId: string): Message[] => {
  const messages = getMessages();
  return messages.filter(msg => msg.senderId === userId || msg.receiverId === userId);
};

export const getConversation = (user1Id: string, user2Id: string): Message[] => {
  const messages = getMessages();
  return messages.filter(
    msg => (msg.senderId === user1Id && msg.receiverId === user2Id) ||
           (msg.senderId === user2Id && msg.receiverId === user1Id)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const saveMessage = (message: Omit<Message, 'id' | 'timestamp'>): Message => {
  const messages = getMessages();
  
  const newMessage: Message = {
    ...message,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  
  messages.push(newMessage);
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  
  return newMessage;
};

export const markMessageAsRead = (messageId: string): void => {
  const messages = getMessages();
  const messageIndex = messages.findIndex(msg => msg.id === messageId);
  
  if (messageIndex >= 0) {
    messages[messageIndex].read = true;
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }
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
  registerUser,
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
  getLearningPaths,
  getLearningPathById,
  getLearningPathsBySubject,
  saveLearningPath,
  deleteLearningPath,
  getTeacherPlans,
  getTeacherPlanById,
  getTeacherPlansByTeacher,
  saveTeacherPlan,
  deleteTeacherPlan,
  getMessages,
  getMessagesByUser,
  getConversation,
  saveMessage,
  markMessageAsRead,
  generateId,
};
