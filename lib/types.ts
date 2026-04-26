export type Role = 'member' | 'exec';
export type Grade = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  grade: Grade | null;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated_amount: number;
  semester: string;
}

export interface Expense {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  date: string;
  logged_by: string;
  created_at: string;
}

export interface MemberDues {
  id: string;
  profile_id: string;
  amount_owed: number;
  amount_paid: number;
  semester: string;
  name?: string;
  grade?: Grade | null;
}

export type SuggestionStatus = 'pending' | 'approved' | 'dismissed';

export interface Suggestion {
  id: string;
  anon_name: string;
  body: string;
  category: string;
  status: SuggestionStatus;
  vote_count: number;
  flagged: boolean;
  created_at: string;
}

export type InsightType = 'alert' | 'prediction' | 'recommendation';
export type InsightSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface AIInsight {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
}
