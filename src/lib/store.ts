export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface AppData {
  salary: number;
  needsPercent: number;
  savingsPercent: number;
  wantsPercent: number;
  expenses: Expense[];
}

const STORAGE_KEY = "expense-tracker-data";
const AUTH_KEY = "expense-tracker-auth";

const DEFAULT_DATA: AppData = {
  salary: 0,
  needsPercent: 40,
  savingsPercent: 12,
  wantsPercent: 48,
  expenses: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...DEFAULT_DATA, expenses: [] };
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isLoggedIn(): boolean {
  return sessionStorage.getItem("logged_in") === "true";
}

export function login(userId: string, password: string): boolean {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) {
    // First time - register
    localStorage.setItem(AUTH_KEY, JSON.stringify({ userId, password }));
    sessionStorage.setItem("logged_in", "true");
    return true;
  }
  const creds = JSON.parse(stored);
  if (creds.userId === userId && creds.password === password) {
    sessionStorage.setItem("logged_in", "true");
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem("logged_in");
}

export function hasRegistered(): boolean {
  return !!localStorage.getItem(AUTH_KEY);
}
