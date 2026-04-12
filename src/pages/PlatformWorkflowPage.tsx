import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardNav from '@/components/DashboardNav';
import {
  BookOpen, Brain, Shield, Users, School, CreditCard, Globe,
  FileText, Code2, Workflow, Search, ChevronRight, Layers,
  GraduationCap, MessageSquare, BarChart3, Lock, Zap, Palette,
  Settings2, Database, Network
} from 'lucide-react';

interface ModuleInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  codeFiles: string[];
  dbTables: string[];
  edgeFunctions: string[];
  workflow: string[];
  patents: string[];
  status: 'production' | 'beta' | 'planned';
}

const MODULES: ModuleInfo[] = [
  {
    id: 'auth',
    name: 'Authentication & Registration System',
    icon: <Lock className="h-5 w-5" />,
    category: 'Core Infrastructure',
    description: 'Multi-role registration with admin-gated approval. Users submit registration requests specifying their role (Student, Teacher, Parent, School Admin). The master administrator reviews and approves requests. Upon approval, users complete signup with password creation. Auto-provisioning creates user plans, roles, and school ecosystems on first login.',
    codeFiles: ['src/contexts/AuthContext.tsx', 'src/pages/Login.tsx', 'src/pages/Signup.tsx', 'src/pages/Register.tsx', 'src/pages/RegistrationRequestsPage.tsx'],
    dbTables: ['profiles', 'user_roles', 'registration_requests', 'user_plans'],
    edgeFunctions: [],
    workflow: [
      'User submits registration request with role + plan selection',
      'Master admin reviews request in Registration Requests page',
      'Admin approves/rejects with optional reason',
      'Approved user receives signup link and creates password',
      'On first login, system auto-provisions: user role, user plan, school (for admins)',
      'JWT-based session management with Supabase Auth',
    ],
    patents: ['Admin-gated multi-role registration with plan-aware provisioning', 'Automatic ecosystem bootstrapping on first authenticated session'],
    status: 'production',
  },
  {
    id: 'ai-chat',
    name: 'AI Learning Assistant',
    icon: <Brain className="h-5 w-5" />,
    category: 'AI Features',
    description: 'Conversational AI tutor that uses the "Process Teaching" methodology — guiding students through problems rather than giving direct answers. Supports multiple AI models, session management, subject filtering, and real-time content moderation with keyword blocking and severity assessment.',
    codeFiles: ['src/components/StudentInterface.tsx', 'supabase/functions/ai-chat/index.ts', 'supabase/functions/moderate-prompt/index.ts'],
    dbTables: ['ai_chat_sessions', 'ai_chat_messages', 'ai_configurations', 'prompt_logs', 'ai_usage_logs'],
    edgeFunctions: ['ai-chat', 'moderate-prompt'],
    workflow: [
      'Student opens AI Learning Assistant and creates/resumes a session',
      'Student types a prompt in the chat interface',
      'Prompt is sent to moderation edge function for keyword/content screening',
      'If approved, prompt is forwarded to AI model with process-mode system prompt',
      'AI response is streamed back and stored with usage metrics',
      'Token usage is tracked against the student\'s monthly plan limit',
      'Teachers and admins can view all student sessions and messages',
    ],
    patents: ['Process-mode teaching AI that adapts response style based on grade level', 'Multi-layer content moderation pipeline with configurable severity thresholds'],
    status: 'production',
  },
  {
    id: 'learning-paths',
    name: 'Learning Paths & Modules',
    icon: <BookOpen className="h-5 w-5" />,
    category: 'Learning',
    description: 'AI-generated and manually curated learning paths with modular content. Each path contains ordered modules with resources, quizzes, and activities. Students track progress through modules, and teachers can assign paths to classes. Capstone submissions allow project-based assessment.',
    codeFiles: ['src/pages/LearningPathsPage.tsx', 'src/pages/LearningPathDetail.tsx', 'src/pages/CreateLearningPathPage.tsx', 'src/services/learningPathService.ts', 'src/services/learningPathProgressService.ts'],
    dbTables: ['learning_paths', 'learning_path_progress', 'learning_path_activities', 'capstone_submissions'],
    edgeFunctions: ['generate-learning-path', 'generate-module-content', 'generate-path-insights', 'evaluate-capstone'],
    workflow: [
      'Teacher or AI generates a learning path with title, subject, difficulty, and modules',
      'Each module contains: description, resources, quiz questions, and activities',
      'Students enroll in paths and progress through modules sequentially',
      'Completed modules are tracked in learning_path_progress table',
      'AI generates insights and recommendations based on student progress',
      'Capstone submission at end of path, graded by AI and/or teacher',
      'Teachers can assign paths to entire classes for structured learning',
    ],
    patents: ['AI-adaptive learning path generation with modular content architecture', 'Dual-assessment capstone evaluation combining AI scoring with teacher review'],
    status: 'production',
  },
  {
    id: 'live-quizzes',
    name: 'Live Quiz System',
    icon: <Zap className="h-5 w-5" />,
    category: 'Assessment',
    description: 'Real-time competitive quiz platform with gamification. Teachers create quiz sessions with AI-generated or manual questions. Students join via code, answer in real-time with point scoring, streaks, and power-ups. Features multiple themes, leaderboards, and redemption rounds.',
    codeFiles: ['src/components/livequiz/CreateLiveQuiz.tsx', 'src/components/livequiz/LiveQuizPlayer.tsx', 'src/components/livequiz/QuizResults.tsx', 'src/components/livequiz/LiveQuizList.tsx'],
    dbTables: ['live_quiz_sessions', 'live_quiz_questions', 'live_quiz_players', 'live_quiz_answers'],
    edgeFunctions: ['generate-live-quiz'],
    workflow: [
      'Teacher creates a quiz session for a class with configurable settings',
      'Questions can be manually added or AI-generated from a topic/syllabus',
      'Teacher starts the session, generating a unique join code',
      'Students join via the code, choosing nickname and avatar',
      'Questions are presented one at a time with countdown timer',
      'Points awarded based on correctness and response speed',
      'Streak bonuses and power-ups add gamification elements',
      'Real-time leaderboard updates after each question',
      'Results summary with per-student and per-question analytics',
    ],
    patents: ['Gamified real-time assessment with power-up mechanics and streak-based scoring', 'AI-generated quiz content with difficulty-adaptive question generation'],
    status: 'production',
  },
  {
    id: 'portfolio',
    name: 'Student Portfolio System',
    icon: <Palette className="h-5 w-5" />,
    category: 'Showcase',
    description: 'Digital portfolio platform where students showcase projects with rich media, descriptions, and tags. Supports multiple themes, collaboration, share links, teacher reviews with comments, and integration with capstone submissions.',
    codeFiles: ['src/pages/PortfolioPage.tsx', 'src/pages/PortfolioProjectPage.tsx', 'src/pages/SharedPortfolioPage.tsx', 'src/pages/TeacherPortfolioReviewPage.tsx'],
    dbTables: ['portfolio_projects', 'portfolio_collaborators', 'portfolio_comments', 'portfolio_updates'],
    edgeFunctions: [],
    workflow: [
      'Student creates a portfolio project with title, description, and theme',
      'Adds media (images, documents), external links, and tags',
      'Can link capstone submissions to portfolio projects',
      'Publishes project to generate a shareable link',
      'Invites collaborators via invite code',
      'Teachers review portfolios and leave comments (public or private)',
      'Portfolio updates create a timeline of project evolution',
    ],
    patents: ['Integrated academic portfolio with capstone-linked project showcasing', 'Collaborative portfolio with role-based comment visibility'],
    status: 'production',
  },
  {
    id: 'classes',
    name: 'Class Management',
    icon: <GraduationCap className="h-5 w-5" />,
    category: 'Core Infrastructure',
    description: 'Classroom system where teachers create classes with subjects and join codes. Students join via codes. Supports assignments (individual and group), resource management with folders, grading systems, and school association.',
    codeFiles: ['src/pages/ClassesPage.tsx', 'src/pages/ClassDetailPage.tsx', 'src/components/ClassResourceManager.tsx', 'src/components/GroupManager.tsx'],
    dbTables: ['classes', 'class_members', 'class_assignments', 'class_resources', 'class_resource_folders', 'assignment_submissions', 'assignment_groups', 'assignment_group_members', 'grading_systems'],
    edgeFunctions: [],
    workflow: [
      'Teacher creates a class with name, subject, and optional school association',
      'System generates a unique join code for student enrollment',
      'Students join by entering the class code',
      'Teacher creates assignments (individual or group) with due dates',
      'Students submit assignments with text content or file uploads',
      'Teacher grades submissions with feedback',
      'Resources organized in folders for class-specific materials',
      'Group assignments support student-choice or teacher-assigned formation',
    ],
    patents: ['Hierarchical class resource management with role-gated access', 'Flexible group assignment formation with multiple collaboration models'],
    status: 'production',
  },
  {
    id: 'messaging',
    name: 'Messaging System',
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'Communication',
    description: 'Real-time messaging between platform users with role-based contact discovery. Teachers see their students, students see classmates and teachers. Message read tracking and contact management.',
    codeFiles: ['src/pages/MessagesPage.tsx'],
    dbTables: ['messages', 'profiles'],
    edgeFunctions: [],
    workflow: [
      'User opens Messages page and sees their contacts',
      'Contacts are auto-discovered via class memberships using get_user_contacts RPC',
      'User selects a contact and types a message',
      'Messages are stored with sender/receiver IDs and read status',
      'Real-time updates via Supabase realtime subscriptions',
      'Read receipts tracked when receiver views messages',
    ],
    patents: ['Role-aware contact discovery with relationship-graph traversal'],
    status: 'production',
  },
  {
    id: 'admin-school',
    name: 'School Administration & Multi-Tenancy',
    icon: <School className="h-5 w-5" />,
    category: 'Administration',
    description: 'Multi-tenant school management system. School admins create schools with custom branding (themes, subdomains), manage teacher/student seats, configure AI settings per school, and control feature access. Per-seat billing with volume discounts.',
    codeFiles: ['src/pages/SchoolManagementPage.tsx', 'src/lib/planConfigs.ts'],
    dbTables: ['schools', 'school_members', 'school_seat_limits', 'school_ai_settings'],
    edgeFunctions: [],
    workflow: [
      'Admin registers and selects a school admin plan (Starter/Growth/Enterprise)',
      'Master admin approves the registration request',
      'On first login, system provisions: admin role, user plan, school, seat limits',
      'Admin configures school: name, branding, subdomain, theme colors',
      'Admin creates teacher/student accounts within seat limits',
      'Created users inherit plan features from the admin\'s school plan',
      'School-level AI settings control: allowed models, blocked keywords, prompt limits',
      'Seat usage tracked with real-time progress indicators',
    ],
    patents: ['Seat-based multi-tenant school administration with cascading plan inheritance', 'Per-school AI governance with configurable content filtering and model restrictions'],
    status: 'production',
  },
  {
    id: 'billing',
    name: 'Subscription & Billing Engine',
    icon: <CreditCard className="h-5 w-5" />,
    category: 'Business Logic',
    description: 'Three-tier subscription system across all roles. Students: Starter/Standard/Premium with token limits. Teachers: Individual/Pro/Master with class limits. School Admins: platform fee + per-seat pricing with volume discounts. Real-time cost calculator with INR pricing.',
    codeFiles: ['src/lib/planConfigs.ts', 'src/components/StudentPlanCard.tsx', 'src/hooks/useStudentPlan.ts', 'src/components/FeatureGate.tsx'],
    dbTables: ['user_plans', 'registration_requests'],
    edgeFunctions: [],
    workflow: [
      'User selects plan during registration',
      'Plan tier determines feature access via featureFlags',
      'Token usage tracked monthly with automatic reset dates',
      'FeatureGate component blocks premium features with upgrade prompts',
      'Admin plans use per-seat pricing with real-time cost calculation',
      'Volume discounts applied automatically based on seat count',
      'Master admin can cancel/modify any user\'s plan',
      'Upgrade requests submitted to master admin for review',
    ],
    patents: ['Role-differentiated subscription model with cascading feature inheritance', 'Real-time per-seat cost calculator with volume discount tiers'],
    status: 'production',
  },
  {
    id: 'moderation',
    name: 'Content Moderation & Safety',
    icon: <Shield className="h-5 w-5" />,
    category: 'Safety & Security',
    description: 'Multi-layer content safety system. Prompts screened against blocked keywords, grade-level rules, and subject filters. Bypass attempts logged with severity levels. Admin monitoring dashboard tracks moderation effectiveness and security incidents.',
    codeFiles: ['src/pages/AdminMonitoring.tsx', 'supabase/functions/moderate-prompt/index.ts'],
    dbTables: ['prompt_logs', 'bypass_attempts', 'ai_configurations'],
    edgeFunctions: ['moderate-prompt'],
    workflow: [
      'Every AI prompt passes through the moderation pipeline',
      'Keywords checked against school and global blocklists',
      'Grade-level rules ensure age-appropriate content',
      'Subject filters restrict AI to authorized topics',
      'Flagged prompts logged with severity (low/medium/high/critical)',
      'Bypass attempts recorded with IP and user details',
      'Admin dashboard shows moderation effectiveness metrics',
      'Critical alerts trigger immediate notification',
    ],
    patents: ['Multi-tier content moderation with grade-level and subject-aware filtering', 'Bypass attempt detection and severity-based incident response system'],
    status: 'production',
  },
  {
    id: 'analytics',
    name: 'Analytics & Reporting',
    icon: <BarChart3 className="h-5 w-5" />,
    category: 'Intelligence',
    description: 'Comprehensive analytics across the platform. Student adaptive learning profiles, class risk summaries, AI usage tracking with cost estimation, teacher performance dashboards, and admin-level platform metrics with chart visualizations.',
    codeFiles: ['src/components/AnalyticsDashboard.tsx', 'src/components/AIUsageDashboard.tsx', 'src/components/AdaptiveLearningProfile.tsx', 'src/components/learning/ClassRiskSummary.tsx', 'src/pages/AdminOverviewPage.tsx'],
    dbTables: ['ai_usage_logs', 'ai_usage_quotas', 'prompt_logs'],
    edgeFunctions: ['analyze-learning-profile', 'analyze-class-risks'],
    workflow: [
      'AI usage automatically logged per interaction (tokens, cost, model)',
      'Student learning profiles generated via AI analysis of activity patterns',
      'Class risk summaries identify at-risk students using engagement metrics',
      'Teacher dashboards show per-student and per-class analytics',
      'Admin overview provides platform-wide KPIs and trends',
      'Cost tracking enables budget management and plan optimization',
    ],
    patents: ['AI-driven adaptive learning profile generation from multi-signal analysis', 'Predictive class risk assessment using engagement pattern recognition'],
    status: 'production',
  },
  {
    id: 'parent-portal',
    name: 'Parent Monitoring Portal',
    icon: <Users className="h-5 w-5" />,
    category: 'Communication',
    description: 'Dedicated dashboard for parents to monitor their children\'s academic progress. View grades, AI usage, learning path progress, and communicate with teachers. Parent-child links managed by admin.',
    codeFiles: ['src/pages/ParentDashboard.tsx', 'src/components/ParentSidebar.tsx'],
    dbTables: ['parent_child_links', 'profiles'],
    edgeFunctions: [],
    workflow: [
      'Admin links parent account to child student accounts',
      'Parent logs in and sees their children\'s dashboard',
      'Views child\'s grades, assignments, and submission status',
      'Monitors AI usage and chat session activity',
      'Tracks learning path progress and portfolio updates',
      'Can message teachers directly about their child',
    ],
    patents: ['Privacy-controlled parent monitoring with granular activity visibility'],
    status: 'production',
  },
];

const CATEGORIES = [...new Set(MODULES.map(m => m.category))];

export default function PlatformWorkflowPage() {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = MODULES.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || m.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Workflow className="h-8 w-8 text-primary" />
                Platform Architecture & Workflow
              </h1>
              <p className="text-muted-foreground mt-1">
                Detailed documentation of every module, workflow, and technical implementation — for patent filing & stakeholder review
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules..." className="pl-9" />
              </div>
              <div className="flex gap-1 flex-wrap">
                <Badge variant={activeCategory === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setActiveCategory('all')}>All</Badge>
                {CATEGORIES.map(cat => (
                  <Badge key={cat} variant={activeCategory === cat ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setActiveCategory(cat)}>{cat}</Badge>
                ))}
              </div>
            </div>

            {selectedModule ? (
              <ModuleDetail module={selectedModule} onBack={() => setSelectedModule(null)} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(m => (
                  <Card key={m.id} className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/30" onClick={() => setSelectedModule(m)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">{m.icon}</div>
                          <div>
                            <CardTitle className="text-sm">{m.name}</CardTitle>
                            <Badge variant="outline" className="text-[10px] mt-1">{m.category}</Badge>
                          </div>
                        </div>
                        <Badge className={m.status === 'production' ? 'bg-green-100 text-green-700' : m.status === 'beta' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} variant="secondary">
                          {m.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-3">{m.description}</p>
                      <div className="flex gap-3 mt-3 text-[10px] text-muted-foreground">
                        <span>{m.codeFiles.length} files</span>
                        <span>{m.dbTables.length} tables</span>
                        <span>{m.edgeFunctions.length} functions</span>
                        <span>{m.workflow.length} steps</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Platform Summary Card */}
            {!selectedModule && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Layers className="h-5 w-5" /> Platform Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div><p className="text-2xl font-bold">{MODULES.length}</p><p className="text-xs text-muted-foreground">Modules</p></div>
                    <div><p className="text-2xl font-bold">{MODULES.reduce((s, m) => s + m.codeFiles.length, 0)}</p><p className="text-xs text-muted-foreground">Source Files</p></div>
                    <div><p className="text-2xl font-bold">{new Set(MODULES.flatMap(m => m.dbTables)).size}</p><p className="text-xs text-muted-foreground">DB Tables</p></div>
                    <div><p className="text-2xl font-bold">{new Set(MODULES.flatMap(m => m.edgeFunctions)).size}</p><p className="text-xs text-muted-foreground">Edge Functions</p></div>
                    <div><p className="text-2xl font-bold">{MODULES.reduce((s, m) => s + m.patents.length, 0)}</p><p className="text-xs text-muted-foreground">Patent Claims</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ModuleDetail({ module: m, onBack }: { module: ModuleInfo; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Back to all modules</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">{m.icon}</div>
        <div>
          <h2 className="text-2xl font-bold">{m.name}</h2>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{m.category}</Badge>
            <Badge className={m.status === 'production' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} variant="secondary">{m.status}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-relaxed">{m.description}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Workflow className="h-4 w-4" /> Detailed Workflow</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {m.workflow.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <p className="text-sm pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Code2 className="h-4 w-4" /> Source Files</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {m.codeFiles.map(f => (
                <li key={f} className="text-xs font-mono bg-muted/50 rounded px-2 py-1">{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Database Tables</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {m.dbTables.map(t => (
                <li key={t} className="text-xs font-mono bg-muted/50 rounded px-2 py-1">{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Network className="h-4 w-4" /> Edge Functions</CardTitle></CardHeader>
          <CardContent>
            {m.edgeFunctions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No edge functions — client-side only</p>
            ) : (
              <ul className="space-y-1">
                {m.edgeFunctions.map(f => (
                  <li key={f} className="text-xs font-mono bg-muted/50 rounded px-2 py-1">{f}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-amber-600" /> Patent-Relevant Innovation Claims</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {m.patents.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-600 font-bold text-xs mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
