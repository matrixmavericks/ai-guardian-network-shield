import { supabase } from "@/integrations/supabase/client";

export type LearningDifficulty = "beginner" | "intermediate" | "advanced";

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  resources: string[];
  quizzes: string[];
  order: number;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: LearningDifficulty;
  estimatedHours: number;
  tags: string[];
  rating: number;
  enrolledCount: number;
  modules: LearningModule[];
  createdBy: string;
  createdAt: string;
  featured?: boolean;
  isPublic?: boolean;
  gradeLevel?: string | null;
}

export interface PathProgress {
  id?: string;
  userId: string;
  pathId: string;
  progress: number;
  completedModules: string[];
  startedAt: string;
  lastAccessedAt: string;
  bookmarked: boolean;
}

const normalizeModules = (modules: unknown): LearningModule[] => {
  if (!Array.isArray(modules)) return [];

  return modules
    .map((module: any, index) => ({
      id: String(module?.id ?? crypto.randomUUID()),
      title: String(module?.title ?? `Module ${index + 1}`),
      description: String(module?.description ?? ""),
      resources: Array.isArray(module?.resources) ? module.resources.map(String) : [],
      quizzes: Array.isArray(module?.quizzes) ? module.quizzes.map(String) : [],
      order: Number(module?.order ?? index + 1),
    }))
    .sort((a, b) => a.order - b.order);
};

const mapLearningPath = (row: any): LearningPath => ({
  id: row.id,
  title: row.title,
  description: row.description,
  subject: row.subject,
  difficulty: row.difficulty,
  estimatedHours: row.estimated_hours,
  tags: Array.isArray(row.tags) ? row.tags : [],
  rating: Number(row.rating ?? 0),
  enrolledCount: Number(row.enrolled_count ?? 0),
  modules: normalizeModules(row.modules),
  createdBy: row.created_by,
  createdAt: row.created_at,
  featured: row.featured,
  isPublic: row.is_public,
  gradeLevel: row.grade_level ?? null,
});

const mapProgress = (row: any): PathProgress => ({
  id: row.id,
  userId: row.user_id,
  pathId: row.path_id,
  progress: Number(row.progress ?? 0),
  completedModules: Array.isArray(row.completed_modules) ? row.completed_modules : [],
  startedAt: row.started_at,
  lastAccessedAt: row.last_accessed_at,
  bookmarked: Boolean(row.bookmarked),
});

export const generateId = () => crypto.randomUUID();

export const getLearningPaths = async (): Promise<LearningPath[]> => {
  const { data, error } = await supabase
    .from("learning_paths")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapLearningPath);
};

export const getLearningPathById = async (id: string): Promise<LearningPath | null> => {
  const { data, error } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapLearningPath(data) : null;
};

export const saveLearningPath = async (path: Omit<LearningPath, "id" | "createdAt" | "rating" | "enrolledCount">): Promise<LearningPath> => {
  const payload: any = {
    title: path.title,
    description: path.description,
    subject: path.subject,
    difficulty: path.difficulty,
    estimated_hours: path.estimatedHours,
    tags: path.tags,
    modules: path.modules,
    created_by: path.createdBy,
    is_public: path.isPublic ?? true,
    grade_level: path.gradeLevel ?? null,
    featured: path.featured ?? false,
  };

  const { data, error } = await supabase
    .from("learning_paths")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return mapLearningPath(data);
};

export const getUserProgress = async (userId: string): Promise<PathProgress[]> => {
  const { data, error } = await supabase
    .from("learning_path_progress")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map(mapProgress);
};

export const getPathProgress = async (userId: string, pathId: string): Promise<PathProgress | null> => {
  const { data, error } = await supabase
    .from("learning_path_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("path_id", pathId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapProgress(data) : null;
};

export const saveProgress = async (progress: PathProgress): Promise<PathProgress> => {
  const payload: any = {
    user_id: progress.userId,
    path_id: progress.pathId,
    progress: progress.progress,
    completed_modules: progress.completedModules,
    bookmarked: progress.bookmarked,
    started_at: progress.startedAt,
    last_accessed_at: progress.lastAccessedAt,
  };

  const { data, error } = await supabase
    .from("learning_path_progress")
    .upsert(payload, { onConflict: "user_id,path_id" })
    .select("*")
    .single();

  if (error) throw error;
  return mapProgress(data);
};

export const touchLearningPath = async (userId: string, pathId: string): Promise<PathProgress> => {
  const existing = await getPathProgress(userId, pathId);
  const now = new Date().toISOString();

  return saveProgress({
    userId,
    pathId,
    progress: existing?.progress ?? 0,
    completedModules: existing?.completedModules ?? [],
    bookmarked: existing?.bookmarked ?? false,
    startedAt: existing?.startedAt ?? now,
    lastAccessedAt: now,
  });
};

export const toggleBookmark = async (userId: string, pathId: string): Promise<boolean> => {
  const existing = await getPathProgress(userId, pathId);
  const nextBookmarked = !existing?.bookmarked;
  const now = new Date().toISOString();

  await saveProgress({
    userId,
    pathId,
    progress: existing?.progress ?? 0,
    completedModules: existing?.completedModules ?? [],
    bookmarked: nextBookmarked,
    startedAt: existing?.startedAt ?? now,
    lastAccessedAt: now,
  });

  return nextBookmarked;
};

export const markModuleComplete = async (
  userId: string,
  pathId: string,
  moduleId: string,
  totalModules: number,
): Promise<PathProgress> => {
  const existing = await getPathProgress(userId, pathId);
  const completedModules = Array.from(new Set([...(existing?.completedModules ?? []), moduleId]));
  const progress = Math.min(100, Math.round((completedModules.length / Math.max(totalModules, 1)) * 100));
  const now = new Date().toISOString();

  return saveProgress({
    userId,
    pathId,
    progress,
    completedModules,
    bookmarked: existing?.bookmarked ?? false,
    startedAt: existing?.startedAt ?? now,
    lastAccessedAt: now,
  });
};

export const getBookmarkedPaths = async (userId: string): Promise<string[]> => {
  const progress = await getUserProgress(userId);
  return progress.filter((item) => item.bookmarked).map((item) => item.pathId);
};
