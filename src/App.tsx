import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentInterface from './components/StudentInterface';
import GradesPage from './pages/GradesPage';
import SecurityKeysPage from './pages/SecurityKeysPage';
import Login from './pages/Login';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Signup from './pages/Signup';
import Register from './pages/Register';
import LearningPathsPage from './pages/LearningPathsPage';
import LearningPathDetail from './pages/LearningPathDetail';
import TeacherPlanGenerator from './components/TeacherPlanGenerator';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MarkingPage from './pages/teacher/MarkingPage';
import UserManagement from './components/UserManagement';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import CreateLearningPathPage from './pages/CreateLearningPathPage';
import ParentDashboard from './pages/ParentDashboard';
import AdminMonitoring from './pages/AdminMonitoring';
import AIConfigurationPage from './pages/AIConfigurationPage';
import ModelTrainingPage from './pages/ModelTrainingPage';
import ClassesPage from './pages/ClassesPage';
import ClassDetailPage from './pages/ClassDetailPage';
import AIUsagePage from './pages/AIUsagePage';
import PortfolioPage from './pages/PortfolioPage';
import PortfolioProjectPage from './pages/PortfolioProjectPage';
import SharedPortfolioPage from './pages/SharedPortfolioPage';
import TeacherPortfolioReviewPage from './pages/TeacherPortfolioReviewPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import SchoolManagementPage from './pages/SchoolManagementPage';
import RegistrationRequestsPage from './pages/RegistrationRequestsPage';
import PlatformWorkflowPage from './pages/PlatformWorkflowPage';
import SchoolRoutes from './pages/SchoolRoutes';
import ContentLibraryPage from './pages/ContentLibraryPage';
import MyCoursesPage from './pages/MyCoursesPage';
import DecksPage from './pages/DecksPage';
import PastPapersPage from './pages/PastPapersPage';
import PersonalProjectPage from './pages/PersonalProjectPage';
import AssessmentCoachPage from './pages/AssessmentCoachPage';
import MarkingCopilotPage from './pages/MarkingCopilotPage';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import AppAccountNotice from './components/AppAccountNotice';
import { IN_ANDROID_APP } from './lib/appShell';
import CourseStudyPage from './pages/CourseStudyPage';
import CreateCoursePage from './pages/CreateCoursePage';
import SubjectPage from './pages/subjects/SubjectPage';
import SubjectTool from './pages/subjects/SubjectTool';
import DocViewer from './pages/subjects/DocViewer';
import LessonPlayer from './pages/subjects/LessonPlayer';
import TopicPage from './pages/subjects/TopicPage';
import PayPage from './pages/PayPage';
import CheckoutReturn from './pages/CheckoutReturn';
import PlatformDocsPage from './pages/PlatformDocsPage';
import PilotAnalysisPage from './pages/PilotAnalysisPage';
import PilotMahindraConsole from './pages/PilotMahindraConsole';
import PilotMahindraReport from './pages/PilotMahindraReport';
import PilotStudentImportPage from './pages/PilotStudentImportPage';
import PilotStudentIdsPage from './pages/PilotStudentIdsPage';
import CreateUserAccountPage from './pages/CreateUserAccountPage';
import SecurityOverviewPage from './pages/SecurityOverviewPage';
import LegalDocPage from './pages/LegalDocPage';
import LegalAdminPage from './pages/LegalAdminPage';
import SourceCodeDownloadPage from './pages/SourceCodeDownloadPage';
import ProjectNeloAdminPage from './pages/ProjectNeloAdminPage';
import ProjectNeloPublicPage from './pages/ProjectNeloPublicPage';
import ThinkingReplayPage from './pages/intelligence/ThinkingReplayPage';
import FutureSelfPage from './pages/intelligence/FutureSelfPage';
import PeerComparePage from './pages/intelligence/PeerComparePage';
import AutoIEPPage from './pages/intelligence/AutoIEPPage';
import CurriculumConflictPage from './pages/intelligence/CurriculumConflictPage';
import ParentBriefPage from './pages/intelligence/ParentBriefPage';
import AtRiskRadarPage from './pages/intelligence/AtRiskRadarPage';
import PolicySandboxPage from './pages/intelligence/PolicySandboxPage';
import BudgetOptimizerPage from './pages/intelligence/BudgetOptimizerPage';
import RefynGraphPage from './pages/intelligence/RefynGraphPage';
import IBStandardsMapperPage from './pages/intelligence/IBStandardsMapperPage';
import SubjectLabsPage from './pages/intelligence/SubjectLabsPage';
import PYPUnitGeneratorPage from './pages/intelligence/PYPUnitGeneratorPage';
import LearnerProfilePortfolioPage from './pages/intelligence/LearnerProfilePortfolioPage';
import RecipeMarketplacePage from './pages/RecipeMarketplacePage';
import DemoShowcasePage from './pages/DemoShowcasePage';
import GuidedTourPage from './pages/GuidedTourPage';
import StudioHome from './pages/studio/StudioHome';
import PrintableMaker from './pages/studio/PrintableMaker';
import DiagramLab from './pages/studio/DiagramLab';
import StudioToolPage from './pages/studio/StudioToolPage';
import StudioLibrary from './pages/studio/StudioLibrary';
import PrimaryPlayground from './pages/PrimaryPlayground';
import { getStudioConfig } from './lib/mispStudioConfigs';
import { getPrimaryConfig } from './lib/mispPrimaryConfig';

// Auto-route Mahindra spotlight teachers to their custom surface
const DashboardRouter = () => {
  const { user } = useAuth();
  if (user && getStudioConfig(user.email)) {
    return <Navigate to="/studio" replace />;
  }
  if (user && getPrimaryConfig(user.email)) {
    return <Navigate to="/playground" replace />;
  }
  // Teachers get the teaching overview; admins keep the platform dashboard
  if (user?.role === 'teacher') return <TeacherDashboard />;
  return <Dashboard />;
};

const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'teacher', 'student', 'parent'],
  redirectTo = '/login' 
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner position="top-center" />
        <Routes>
          <Route path="/" element={IN_ANDROID_APP ? <Navigate to="/login" replace /> : <Index />} />
          <Route path="/demo" element={<DemoShowcasePage />} />
          <Route path="/tour" element={<GuidedTourPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/register" element={IN_ANDROID_APP ? <AppAccountNotice /> : <Register />} />
          <Route path="/pay/:requestId" element={IN_ANDROID_APP ? <AppAccountNotice /> : <PayPage />} />
          <Route path="/checkout/return" element={IN_ANDROID_APP ? <AppAccountNotice /> : <CheckoutReturn />} />
          <Route path="/legal/:doc" element={<LegalDocPage />} />
          <Route path="/project-nelo" element={<ProjectNeloPublicPage />} />
          <Route path="/project-nelo-admin" element={<ProtectedRoute allowedRoles={['admin']}><ProjectNeloAdminPage /></ProtectedRoute>} />
          <Route path="/legal-admin" element={<ProtectedRoute allowedRoles={['admin']}><LegalAdminPage /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><DashboardRouter /></ProtectedRoute>} />
          <Route path="/decks" element={<ProtectedRoute allowedRoles={['teacher','admin']}><DecksPage /></ProtectedRoute>} />
          <Route path="/decks/:id" element={<ProtectedRoute allowedRoles={['teacher','admin']}><DecksPage /></ProtectedRoute>} />
          <Route path="/past-papers" element={<ProtectedRoute allowedRoles={['teacher','admin']}><PastPapersPage /></ProtectedRoute>} />
          <Route path="/personal-project" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><PersonalProjectPage /></ProtectedRoute>} />
          <Route path="/assessment-coach" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><AssessmentCoachPage /></ProtectedRoute>} />
          <Route path="/marking-copilot" element={<ProtectedRoute allowedRoles={['teacher','admin']}><MarkingCopilotPage /></ProtectedRoute>} />
          <Route path="/studio" element={<ProtectedRoute allowedRoles={['teacher','admin']}><StudioHome /></ProtectedRoute>} />
          <Route path="/studio/create" element={<ProtectedRoute allowedRoles={['teacher','admin']}><PrintableMaker /></ProtectedRoute>} />
          <Route path="/studio/diagrams" element={<ProtectedRoute allowedRoles={['teacher','admin']}><DiagramLab /></ProtectedRoute>} />
          <Route path="/studio/tool/:id" element={<ProtectedRoute allowedRoles={['teacher','admin']}><StudioToolPage /></ProtectedRoute>} />
          <Route path="/studio/library" element={<ProtectedRoute allowedRoles={['teacher','admin']}><StudioLibrary /></ProtectedRoute>} />
          <Route path="/teaching" element={<ProtectedRoute allowedRoles={['teacher','admin']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/playground" element={<ProtectedRoute allowedRoles={['teacher','admin']}><PrimaryPlayground /></ProtectedRoute>} />
          <Route path="/admin-overview" element={<ProtectedRoute allowedRoles={['admin']}><AdminOverviewPage /></ProtectedRoute>} />
          <Route path="/school-management" element={<ProtectedRoute allowedRoles={['admin']}><SchoolManagementPage /></ProtectedRoute>} />
          <Route path="/security-keys" element={<ProtectedRoute allowedRoles={['admin']}><SecurityKeysPage /></ProtectedRoute>} />
          <Route path="/marking" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><MarkingPage /></ProtectedRoute>} />
          <Route path="/teacher-plan-generator" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPlanGenerator /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/registration-requests" element={<ProtectedRoute allowedRoles={['admin']}><RegistrationRequestsPage /></ProtectedRoute>} />
          <Route path="/platform-workflow" element={<ProtectedRoute allowedRoles={['admin']}><PlatformWorkflowPage /></ProtectedRoute>} />
          <Route path="/platform-docs" element={<ProtectedRoute allowedRoles={['admin']}><PlatformDocsPage /></ProtectedRoute>} />
          <Route path="/pilot-analysis" element={<ProtectedRoute allowedRoles={['admin']}><PilotAnalysisPage /></ProtectedRoute>} />
          <Route path="/pilot/mahindra" element={<ProtectedRoute allowedRoles={['admin']}><PilotMahindraConsole /></ProtectedRoute>} />
          <Route path="/pilot/mahindra/report" element={<ProtectedRoute allowedRoles={['admin']}><PilotMahindraReport /></ProtectedRoute>} />
          <Route path="/pilot/mahindra/ids" element={<ProtectedRoute allowedRoles={['admin']}><PilotStudentIdsPage /></ProtectedRoute>} />
          <Route path="/pilot/mahindra/students" element={<ProtectedRoute allowedRoles={['admin']}><PilotStudentImportPage /></ProtectedRoute>} />
          <Route path="/create-account" element={<ProtectedRoute allowedRoles={['admin']}><CreateUserAccountPage /></ProtectedRoute>} />
          <Route path="/security-overview" element={<ProtectedRoute allowedRoles={['admin']}><SecurityOverviewPage /></ProtectedRoute>} />
          <Route path="/source-code" element={<ProtectedRoute allowedRoles={['admin']}><SourceCodeDownloadPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/ai-learning-assistant" element={<ProtectedRoute allowedRoles={['student', 'teacher']}><StudentInterface /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
          <Route path="/learning-paths" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><LearningPathsPage /></ProtectedRoute>} />
          <Route path="/learning-path/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><LearningPathDetail /></ProtectedRoute>} />
          <Route path="/create-learning-path" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><CreateLearningPathPage /></ProtectedRoute>} />
          <Route path="/parent-dashboard" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
          <Route path="/admin-monitoring" element={<ProtectedRoute allowedRoles={['admin']}><AdminMonitoring /></ProtectedRoute>} />
          <Route path="/ai-configuration" element={<ProtectedRoute allowedRoles={['admin']}><AIConfigurationPage /></ProtectedRoute>} />
          <Route path="/model-training" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><ModelTrainingPage /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ClassesPage /></ProtectedRoute>} />
          <Route path="/class/:id" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ClassDetailPage /></ProtectedRoute>} />
          <Route path="/ai-usage" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><AIUsagePage /></ProtectedRoute>} />
          <Route path="/student-portfolios" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherPortfolioReviewPage /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute allowedRoles={['student', 'teacher']}><PortfolioPage /></ProtectedRoute>} />
          <Route path="/portfolio/shared/:token" element={<SharedPortfolioPage />} />
          <Route path="/portfolio/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher']}><PortfolioProjectPage /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><ContentLibraryPage /></ProtectedRoute>} />
          <Route path="/my-courses" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><MyCoursesPage /></ProtectedRoute>} />
          <Route path="/course/create" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateCoursePage /></ProtectedRoute>} />
          <Route path="/course/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><CourseStudyPage /></ProtectedRoute>} />
          <Route path="/subjects" element={<Navigate to="/my-courses" replace />} />
          <Route path="/subjects/:slug" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><SubjectPage /></ProtectedRoute>} />
          <Route path="/subjects/:slug/guide/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><DocViewer kind="guide" /></ProtectedRoute>} />
          <Route path="/subjects/:slug/cheatsheet/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><DocViewer kind="cheatsheet" /></ProtectedRoute>} />
          <Route path="/subjects/:slug/topic/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><TopicPage /></ProtectedRoute>} />
          <Route path="/subjects/:slug/lesson/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><LessonPlayer /></ProtectedRoute>} />
          <Route path="/subjects/:slug/:tool" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><SubjectTool /></ProtectedRoute>} />

          {/* Refyn Intelligence — revolutionary AI features */}
          <Route path="/intel/thinking-replay" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><ThinkingReplayPage /></ProtectedRoute>} />
          <Route path="/intel/future-self" element={<ProtectedRoute allowedRoles={['student']}><FutureSelfPage /></ProtectedRoute>} />
          <Route path="/intel/peer-compare" element={<ProtectedRoute allowedRoles={['student']}><PeerComparePage /></ProtectedRoute>} />
          <Route path="/intel/auto-iep" element={<ProtectedRoute allowedRoles={['teacher','admin']}><AutoIEPPage /></ProtectedRoute>} />
          <Route path="/intel/curriculum-conflict" element={<ProtectedRoute allowedRoles={['teacher','admin']}><CurriculumConflictPage /></ProtectedRoute>} />
          <Route path="/intel/parent-brief" element={<ProtectedRoute allowedRoles={['teacher','admin']}><ParentBriefPage /></ProtectedRoute>} />
          <Route path="/intel/at-risk-radar" element={<ProtectedRoute allowedRoles={['admin','teacher']}><AtRiskRadarPage /></ProtectedRoute>} />
          <Route path="/intel/policy-sandbox" element={<ProtectedRoute allowedRoles={['admin']}><PolicySandboxPage /></ProtectedRoute>} />
          <Route path="/intel/budget-optimizer" element={<ProtectedRoute allowedRoles={['admin']}><BudgetOptimizerPage /></ProtectedRoute>} />
          <Route path="/intel/refyn-graph" element={<ProtectedRoute allowedRoles={['admin']}><RefynGraphPage /></ProtectedRoute>} />
          <Route path="/intel/ib-mapper" element={<ProtectedRoute allowedRoles={['teacher','admin']}><IBStandardsMapperPage /></ProtectedRoute>} />
          <Route path="/intel/subject-labs" element={<ProtectedRoute allowedRoles={['teacher','admin']}><SubjectLabsPage /></ProtectedRoute>} />
          <Route path="/intel/pyp-uoi" element={<ProtectedRoute allowedRoles={['teacher','admin']}><PYPUnitGeneratorPage /></ProtectedRoute>} />
          <Route path="/intel/learner-profile" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><LearnerProfilePortfolioPage /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute allowedRoles={['teacher','admin']}><RecipeMarketplacePage /></ProtectedRoute>} />

          {/* School subdomain routes - all features scoped to school */}
          <Route path="/s/:subdomain/*" element={<SchoolRoutes />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
