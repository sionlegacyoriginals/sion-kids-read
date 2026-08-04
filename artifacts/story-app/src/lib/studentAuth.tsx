import { createContext, useContext, useState, type ReactNode } from "react";

export interface StudentSession {
  token: string;
  id: string;
  firstName: string;
  avatar: string;
  classId: number;
  className: string;
  teacherId: string;
  /** True when this student belongs to a Family Hub rather than a school classroom. */
  isFamilyHub?: boolean;
}

interface StudentAuthContextValue {
  student: StudentSession | null;
  setStudent: (s: StudentSession | null) => void;
  signOutStudent: () => void;
  /** fetch() wrapper that injects Bearer token for student sessions */
  studentFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

const StudentAuthContext = createContext<StudentAuthContextValue | null>(null);

const STORAGE_KEY = "slo_student_session";

function loadFromStorage(): StudentSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudentSession) : null;
  } catch {
    return null;
  }
}

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudentState] = useState<StudentSession | null>(loadFromStorage);

  function setStudent(s: StudentSession | null) {
    setStudentState(s);
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  }

  function signOutStudent() {
    setStudent(null);
  }

  function studentFetch(url: string, opts: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers ?? {}),
        ...(student ? { Authorization: `Bearer ${student.token}` } : {}),
      },
    });
  }

  return (
    <StudentAuthContext.Provider value={{ student, setStudent, signOutStudent, studentFetch }}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth(): StudentAuthContextValue {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) throw new Error("useStudentAuth must be used inside StudentAuthProvider");
  return ctx;
}
