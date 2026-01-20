import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean | null;
}

interface SessionContextType {
  academicYears: AcademicYear[];
  selectedSession: AcademicYear | null;
  setSelectedSession: (session: AcademicYear | null) => void;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps) => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedSession, setSelectedSession] = useState<AcademicYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;

      setAcademicYears(data || []);
      
      // Set the current academic year as default
      const currentYear = data?.find(year => year.is_current);
      if (currentYear) {
        setSelectedSession(currentYear);
      } else if (data && data.length > 0) {
        setSelectedSession(data[0]);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SessionContext.Provider value={{ academicYears, selectedSession, setSelectedSession, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};