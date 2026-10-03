import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import AppAccountNotice from './components/AppAccountNotice';
import { IN_ANDROID_APP } from './lib/appShell';
import { getStudioConfig } from './lib/mispStudioConfigs';
import { getPrimaryConfig } from './lib/mispPrimaryConfig';
import { page, type Page } from './lib/lazyPage';
import { demoRole, DEMO_HOME } from './demo/session';

// Pages load on first visit (see lib/lazyPage)
const Dashboard = page(() => import('./pages/Dashboard'));
const StudentDashboard = page(() => import('./pages/StudentDashboard'));
const StudentInterface = page(() => import('./components/StudentInterface'));
const GradesPage = page(() => import('./pages/GradesPage'));
const SecurityKeysPage = page(() => import('./pages/SecurityKeysPage'));
const Signup = page(() => import('./pages/Signup'));
const Register = page(() => import('./pages/Register'));
const LearningPathsPage = page(() => import('./pages/LearningPathsPage'));
const LearningPathDetail = page(() => import('./pages/LearningPathDetail'));
const TeacherPlanGenerator = page(() => import('./components/TeacherPlanGenerator'));
const TeacherDashboard = page(() => import('./pages/teacher/TeacherDashboard'));
const MarkingPage = page(() => import('./pages/teacher/MarkingPage'));
const UserManagement = page(() => import('./components/UserManagement'));
const MessagesPage = page(() => import('./pages/MessagesPage'));
const SettingsPage = page(() => import('./pages/SettingsPage'));
const CreateLearningPathPage = page(() => import('./pages/CreateLearningPathPage'));
const ParentDashboard = page(() => import('./pages/ParentDashboard'));
const AdminMonitoring = page(() => import('./pages/AdminMonitoring'));
const AIConfigurationPage = page(() => import('./pages/AIConfigurationPage'));
const ModelTrainingPage = page(() => import('./pages/ModelTrainingPage'));
const ClassesPage = page(() => import('./pages/ClassesPage'));
const ClassDetailPage = page(() => import('./pages/ClassDetailPage'));
const AIUsagePage = page(() => import('./pages/AIUsagePage'));
const PortfolioPage = page(() => import('./pages/PortfolioPage'));
const PortfolioProjectPage = page(() => import('./pages/PortfolioProjectPage'));
const SharedPortfolioPage = page(() => import('./pages/SharedPortfolioPage'));
const TeacherPortfolioReviewPage = page(() => import('./pages/TeacherPortfolioReviewPage'));
const AdminOverviewPage = page(() => import('./pages/AdminOverviewPage'));
const SchoolManagementPage = page(() => import('./pages/SchoolManagementPage'));
const RegistrationRequestsPage = page(() => import('./pages/RegistrationRequestsPage'));
const PlatformWorkflowPage = page(() => import('./pages/PlatformWorkflowPage'));
const SchoolRoutes = page(() => import('./pages/SchoolRoutes'));
const ContentLibraryPage = page(() => import('./pages/ContentLibraryPage'));
const MyCoursesPage = page(() => import('./pages/MyCoursesPage'));
const DecksPage = page(() => import('./pages/DecksPage'));
const PastPapersPage = page(() => import('./pages/PastPapersPage'));
const PersonalProjectPage = page(() => import('./pages/PersonalProjectPage'));
const AssessmentCoachPage = page(() => import('./pages/AssessmentCoachPage'));
const MarkingCopilotPage = page(() => import('./pages/MarkingCopilotPage'));
const TaskPage = page(() => import('./pages/TaskPage'));
const TaskEditorPage = page(() => import('./pages/TaskEditorPage'));
const ProgressPage = page(() => import('./pages/ProgressPage'));
const BrainPage = page(() => import('./pages/BrainPage'));
const GemsPage = page(() => import('./pages/GemsPage'));
const GemPage = page(() => import('./pages/GemPage'));
const GemBuilderPage = page(() => import('./pages/GemBuilderPage'));
const WorldsPage = page(() => import('./pages/WorldsPage'));
const WorldPage = page(() => import('./pages/WorldPage'));
const ScenePage = page(() => import('./pages/ScenePage'));
const SimsPage = page(() => import('./pages/SimsPage'));
const SimPage = page(() => import('./pages/SimPage'));
const FocusPage = page(() => import('./pages/FocusPage'));
const CourseStudyPage = page(() => import('./pages/CourseStudyPage'));
const CreateCoursePage = page(() => import('./pages/CreateCoursePage'));
const SubjectPage = page(() => import('./pages/subjects/SubjectPage'));
const SubjectTool = page(() => import('./pages/subjects/SubjectTool'));
const DocViewer = page(() => import('./pages/subjects/DocViewer'));
const LessonPlayer = page(() => import('./pages/subjects/LessonPlayer'));
const TopicPage = page(() => import('./pages/subjects/TopicPage'));
const PayPage = page(() => import('./pages/PayPage'));
const CheckoutReturn = page(() => import('./pages/CheckoutReturn'));
const PlatformDocsPage = page(() => import('./pages/PlatformDocsPage'));
const PilotAnalysisPage = page(() => import('./pages/PilotAnalysisPage'));
const PilotMahindraConsole = page(() => import('./pages/PilotMahindraConsole'));
const PilotMahindraReport = page(() => import('./pages/PilotMahindraReport'));
const PilotStudentImportPage = page(() => import('./pages/PilotStudentImportPage'));
const PilotStudentIdsPage = page(() => import('./pages/PilotStudentIdsPage'));
const CreateUserAccountPage = page(() => import('./pages/CreateUserAccountPage'));
const SecurityOverviewPage = page(() => import('./pages/SecurityOverviewPage'));
const LegalDocPage = page(() => import('./pages/LegalDocPage'));
const LegalAdminPage = page(() => import('./pages/LegalAdminPage'));
const SourceCodeDownloadPage = page(() => import('./pages/SourceCodeDownloadPage'));
const ProjectNeloAdminPage = page(() => import('./pages/ProjectNeloAdminPage'));
const ProjectNeloPublicPage = page(() => import('./pages/ProjectNeloPublicPage'));
const ThinkingReplayPage = page(() => import('./pages/intelligence/ThinkingReplayPage'));
const FutureSelfPage = page(() => import('./pages/intelligence/FutureSelfPage'));
const PeerComparePage = page(() => import('./pages/intelligence/PeerComparePage'));
const AutoIEPPage = page(() => import('./pages/intelligence/AutoIEPPage'));
const CurriculumConflictPage = page(() => import('./pages/intelligence/CurriculumConflictPage'));
const ParentBriefPage = page(() => import('./pages/intelligence/ParentBriefPage'));
const AtRiskRadarPage = page(() => import('./pages/intelligence/AtRiskRadarPage'));
const PolicySandboxPage = page(() => import('./pages/intelligence/PolicySandboxPage'));
const BudgetOptimizerPage = page(() => import('./pages/intelligence/BudgetOptimizerPage'));
const RefynGraphPage = page(() => import('./pages/intelligence/RefynGraphPage'));
const IBStandardsMapperPage = page(() => import('./pages/intelligence/IBStandardsMapperPage'));
const SubjectLabsPage = page(() => import('./pages/intelligence/SubjectLabsPage'));
const PYPUnitGeneratorPage = page(() => import('./pages/intelligence/PYPUnitGeneratorPage'));
const LearnerProfilePortfolioPage = page(() => import('./pages/intelligence/LearnerProfilePortfolioPage'));
const RecipeMarketplacePage = page(() => import('./pages/RecipeMarketplacePage'));
const DemoPage = page(() => import('./pages/DemoPage'));
const TourPage = page(() => import('./pages/TourPage'));
const StudioHome = page(() => import('./pages/studio/StudioHome'));
const PrintableMaker = page(() => import('./pages/studio/PrintableMaker'));
const DiagramLab = page(() => import('./pages/studio/DiagramLab'));
const StudioToolPage = page(() => import('./pages/studio/StudioToolPage'));
const StudioLibrary = page(() => import('./pages/studio/StudioLibrary'));
const PrimaryPlayground = page(() => import('./pages/PrimaryPlayground'));
const OAuthConsent = page(() => import('./pages/OAuthConsent'));

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
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // In the live demo, a page for the other role sends you home instead of to sign in
    const demo = demoRole();
    return <Navigate to={demo ? DEMO_HOME[demo] : "/login"} replace />;
  }

  return <>{children}</>;
};

/** A quiet spinner that only appears if loading takes a moment. */
const PageLoading = () => (
  <div role="status" aria-label="Loading" className="flex h-screen items-center justify-center">
    <span className="opacity-0" style={{ animation: 'lp-fade 0.3s ease-out 0.35s forwards' }}>
      <span className="block h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-[#7ff3ff]" />
    </span>
  </div>
);

const DemoLayer = lazy(() => import('./demo/DemoLayer'));

// Fetch the pages someone is most likely to open next while the browser is idle
const PREFETCH: Record<string, Page[]> = {
  student: [StudentDashboard, StudentInterface, MyCoursesPage, SubjectPage, TopicPage, GradesPage, ClassesPage, SimsPage, SimPage, FocusPage],
  teacher: [TeacherDashboard, MarkingPage, ClassesPage, ClassDetailPage, StudentInterface, GradesPage, SimsPage, FocusPage],
  visitor: [DemoPage, TourPage],
};
const Prefetch = () => {
  const { user, isLoading } = useAuth();
  const role = isLoading ? null : user?.role ?? 'visitor';
  useEffect(() => {
    const list = role ? PREFETCH[role] ?? [] : [];
    if (!list.length) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let cancelled = false;
    const run = async () => {
      // One at a time, so it never competes with what they're doing
      for (const p of list) {
        if (cancelled) return;
        await p.preload();
      }
    };
    const id = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500);
    return () => {
      cancelled = true;
      if (w.cancelIdleCallback) w.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [role]);
  return null;
};

/** New pages start at the top and fade in; back and forward keep the browser's own scroll. */
const RouteFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (type !== 'POP' && !hash) window.scrollTo(0, 0);
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      ref.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return <div ref={ref}>{children}</div>;
};

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true }}>
        <Toaster />
        <Sonner position="top-center" />
        <Prefetch />
        {demoRole() && (
          <Suspense fallback={null}>
            <DemoLayer />
          </Suspense>
        )}
        <Suspense fallback={<PageLoading />}>
        <RouteFade>
        <Routes>
          <Route path="/" element={IN_ANDROID_APP ? <Navigate to="/login" replace /> : <Index />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/tour" element={<TourPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
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
          <Route path="/progress" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><ProgressPage /></ProtectedRoute>} />
          <Route path="/brain" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><BrainPage /></ProtectedRoute>} />
          <Route path="/gems" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><GemsPage /></ProtectedRoute>} />
          <Route path="/gems/new" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><GemBuilderPage /></ProtectedRoute>} />
          <Route path="/gems/:id/edit" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><GemBuilderPage /></ProtectedRoute>} />
          <Route path="/gems/:id" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><GemPage /></ProtectedRoute>} />
          <Route path="/worlds" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><WorldsPage /></ProtectedRoute>} />
          <Route path="/world/:id/scene/:sceneId" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><ScenePage /></ProtectedRoute>} />
          <Route path="/world/:id" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><WorldPage /></ProtectedRoute>} />
          <Route path="/sims" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><SimsPage /></ProtectedRoute>} />
          <Route path="/sims/:id" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><SimPage /></ProtectedRoute>} />
          <Route path="/focus" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><FocusPage /></ProtectedRoute>} />
          <Route path="/task/new" element={<ProtectedRoute allowedRoles={['teacher','admin']}><TaskEditorPage /></ProtectedRoute>} />
          <Route path="/task/:id/edit" element={<ProtectedRoute allowedRoles={['teacher','admin']}><TaskEditorPage /></ProtectedRoute>} />
          <Route path="/task/:id" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><TaskPage /></ProtectedRoute>} />
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
        </RouteFade>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
