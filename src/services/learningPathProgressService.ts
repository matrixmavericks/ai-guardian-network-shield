// Service to track user progress in learning paths

export interface PathProgress {
  userId: string;
  pathId: string;
  progress: number; // 0-100
  completedModules: string[];
  startedAt: string;
  lastAccessedAt: string;
  bookmarked: boolean;
}

const STORAGE_KEY = 'aiConditioner_path_progress';

export const getPathProgress = (userId: string, pathId: string): PathProgress | null => {
  const allProgress = getAllProgress();
  return allProgress.find(p => p.userId === userId && p.pathId === pathId) || null;
};

export const getAllProgress = (): PathProgress[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getUserProgress = (userId: string): PathProgress[] => {
  return getAllProgress().filter(p => p.userId === userId);
};

export const saveProgress = (progress: PathProgress): void => {
  const allProgress = getAllProgress();
  const existingIndex = allProgress.findIndex(
    p => p.userId === progress.userId && p.pathId === progress.pathId
  );
  
  if (existingIndex >= 0) {
    allProgress[existingIndex] = progress;
  } else {
    allProgress.push(progress);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
};

export const toggleBookmark = (userId: string, pathId: string): boolean => {
  const progress = getPathProgress(userId, pathId);
  
  if (progress) {
    progress.bookmarked = !progress.bookmarked;
    progress.lastAccessedAt = new Date().toISOString();
    saveProgress(progress);
    return progress.bookmarked;
  } else {
    const newProgress: PathProgress = {
      userId,
      pathId,
      progress: 0,
      completedModules: [],
      startedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      bookmarked: true,
    };
    saveProgress(newProgress);
    return true;
  }
};

export const getBookmarkedPaths = (userId: string): string[] => {
  return getUserProgress(userId)
    .filter(p => p.bookmarked)
    .map(p => p.pathId);
};
