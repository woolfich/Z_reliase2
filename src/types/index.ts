// Типы данных для приложения учёта работы сварщиков

export interface Norm {
  id: string;
  article: string;
  timePerUnit: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlanItem {
  id: string;
  article: string;
  planned: number;
  completed: number;
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkRecord {
  id: string;
  article: string;
  quantity: number;
  welderId: string;
  date: string;
  createdAt: number;
  updatedAt: number;
}

export interface Welder {
  id: string;
  name: string;
  workRecords: WorkRecord[];
  overtime: number;
  timeAdjustments: Record<string, number>; // Корректировки времени по датам
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  welders: Welder[];
  norms: Norm[];
  plan: PlanItem[];
}

export type Screen = 'main' | 'norms' | 'plan' | 'welderCard';

export interface ArticleSuggestion {
  article: string;
  totalPlanned: number;
  totalCompleted: number;
  welderStats: {
    welderId: string;
    welderName: string;
    quantity: number;
  }[];
}

export function formatArticle(input: string): string {
  return input.toUpperCase().replace(/\s+/g, '');
}

export function formatNumber(num: number): string {
  return num.toFixed(2);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function calculateWorkTime(article: string, quantity: number, norms: Norm[]): number {
  const norm = norms.find(n => n.article === article);
  return norm ? norm.timePerUnit * quantity : 0;
}

export function isValidArticle(article: string): boolean {
  return /^[A-ZА-ЯЁ0-9]+$/.test(article);
}