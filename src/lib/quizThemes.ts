export interface QuizTheme {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  card: string;
  accent: string;
  text: string;
  correct: string;
  incorrect: string;
  leaderboard: string;
  optionBase: string;
  optionColors: string[];
}

export const quizThemes: Record<string, QuizTheme> = {
  arcade: {
    id: 'arcade',
    name: 'Arcade Neon',
    emoji: '🕹️',
    bg: 'bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950',
    card: 'bg-gray-900/80 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]',
    accent: 'text-purple-400',
    text: 'text-gray-100',
    correct: 'bg-green-500/20 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
    incorrect: 'bg-red-500/20 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    leaderboard: 'bg-gradient-to-r from-purple-600 to-pink-600',
    optionBase: 'border-purple-500/30 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]',
    optionColors: [
      'bg-red-600/80 hover:bg-red-500/90 border-red-400/50',
      'bg-blue-600/80 hover:bg-blue-500/90 border-blue-400/50',
      'bg-yellow-600/80 hover:bg-yellow-500/90 border-yellow-400/50',
      'bg-green-600/80 hover:bg-green-500/90 border-green-400/50',
    ],
  },
  space: {
    id: 'space',
    name: 'Space Galaxy',
    emoji: '🚀',
    bg: 'bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-950',
    card: 'bg-slate-900/80 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]',
    accent: 'text-cyan-400',
    text: 'text-slate-100',
    correct: 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]',
    incorrect: 'bg-rose-500/20 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    leaderboard: 'bg-gradient-to-r from-cyan-600 to-blue-600',
    optionBase: 'border-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    optionColors: [
      'bg-rose-700/70 hover:bg-rose-600/80 border-rose-400/50',
      'bg-cyan-700/70 hover:bg-cyan-600/80 border-cyan-400/50',
      'bg-amber-700/70 hover:bg-amber-600/80 border-amber-400/50',
      'bg-emerald-700/70 hover:bg-emerald-600/80 border-emerald-400/50',
    ],
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',
    emoji: '🌊',
    bg: 'bg-gradient-to-br from-blue-950 via-teal-950 to-cyan-950',
    card: 'bg-teal-900/60 border-teal-400/20 shadow-[0_0_30px_rgba(20,184,166,0.1)]',
    accent: 'text-teal-300',
    text: 'text-teal-50',
    correct: 'bg-green-500/20 border-green-300 shadow-[0_0_15px_rgba(134,239,172,0.3)]',
    incorrect: 'bg-red-500/20 border-red-300 shadow-[0_0_15px_rgba(252,165,165,0.3)]',
    leaderboard: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    optionBase: 'border-teal-400/20 hover:border-teal-300',
    optionColors: [
      'bg-red-700/60 hover:bg-red-600/70 border-red-400/50',
      'bg-blue-700/60 hover:bg-blue-600/70 border-blue-400/50',
      'bg-amber-700/60 hover:bg-amber-600/70 border-amber-400/50',
      'bg-teal-700/60 hover:bg-teal-600/70 border-teal-400/50',
    ],
  },
  jungle: {
    id: 'jungle',
    name: 'Wild Jungle',
    emoji: '🌴',
    bg: 'bg-gradient-to-br from-green-950 via-emerald-950 to-lime-950',
    card: 'bg-emerald-900/60 border-lime-500/20 shadow-[0_0_30px_rgba(132,204,22,0.1)]',
    accent: 'text-lime-400',
    text: 'text-green-50',
    correct: 'bg-lime-500/30 border-lime-300 shadow-[0_0_15px_rgba(190,242,100,0.3)]',
    incorrect: 'bg-orange-500/30 border-orange-300 shadow-[0_0_15px_rgba(253,186,116,0.3)]',
    leaderboard: 'bg-gradient-to-r from-emerald-600 to-lime-500',
    optionBase: 'border-lime-500/20 hover:border-lime-400',
    optionColors: [
      'bg-orange-700/60 hover:bg-orange-600/70 border-orange-400/50',
      'bg-emerald-700/60 hover:bg-emerald-600/70 border-emerald-400/50',
      'bg-yellow-700/60 hover:bg-yellow-600/70 border-yellow-400/50',
      'bg-lime-700/60 hover:bg-lime-600/70 border-lime-400/50',
    ],
  },
  retro: {
    id: 'retro',
    name: 'Retro Wave',
    emoji: '📼',
    bg: 'bg-gradient-to-br from-fuchsia-950 via-violet-950 to-pink-950',
    card: 'bg-fuchsia-900/50 border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.15)]',
    accent: 'text-pink-400',
    text: 'text-pink-50',
    correct: 'bg-cyan-500/20 border-cyan-300 shadow-[0_0_15px_rgba(103,232,249,0.3)]',
    incorrect: 'bg-red-500/20 border-red-300 shadow-[0_0_15px_rgba(252,165,165,0.3)]',
    leaderboard: 'bg-gradient-to-r from-pink-600 to-fuchsia-600',
    optionBase: 'border-pink-500/30 hover:border-pink-400',
    optionColors: [
      'bg-pink-700/70 hover:bg-pink-600/80 border-pink-400/50',
      'bg-violet-700/70 hover:bg-violet-600/80 border-violet-400/50',
      'bg-cyan-700/70 hover:bg-cyan-600/80 border-cyan-400/50',
      'bg-fuchsia-700/70 hover:bg-fuchsia-600/80 border-fuchsia-400/50',
    ],
  },
  minimal: {
    id: 'minimal',
    name: 'Clean Minimal',
    emoji: '✨',
    bg: 'bg-gradient-to-br from-slate-100 to-gray-200 dark:from-slate-900 dark:to-gray-900',
    card: 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700',
    accent: 'text-slate-900 dark:text-slate-100',
    text: 'text-slate-800 dark:text-slate-200',
    correct: 'bg-green-100 dark:bg-green-900/30 border-green-500',
    incorrect: 'bg-red-100 dark:bg-red-900/30 border-red-500',
    leaderboard: 'bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800',
    optionBase: 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
    optionColors: [
      'bg-red-500/10 hover:bg-red-500/20 border-red-400/50',
      'bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/50',
      'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-400/50',
      'bg-green-500/10 hover:bg-green-500/20 border-green-400/50',
    ],
  },
};

export const POWERUP_DEFS = {
  double_points: { id: 'double_points', name: 'Double Points', emoji: '⚡', desc: '2x points for this question' },
  fifty_fifty: { id: 'fifty_fifty', name: '50/50', emoji: '✂️', desc: 'Remove 2 wrong answers' },
  extra_time: { id: 'extra_time', name: 'Extra Time', emoji: '⏰', desc: '+10 seconds' },
  streak_freeze: { id: 'streak_freeze', name: 'Streak Freeze', emoji: '🧊', desc: 'Protect your streak if wrong' },
  hint_reveal: { id: 'hint_reveal', name: 'Hint', emoji: '💡', desc: 'Show the explanation as a hint' },
  second_chance: { id: 'second_chance', name: '2nd Chance', emoji: '🔄', desc: 'Answer again if wrong' },
} as const;

export type PowerupId = keyof typeof POWERUP_DEFS;
