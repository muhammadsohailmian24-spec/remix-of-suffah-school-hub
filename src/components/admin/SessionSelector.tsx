import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/contexts/SessionContext";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const SessionSelector = () => {
  const { academicYears, selectedSession, setSelectedSession, isLoading } = useSession();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <CalendarDays className="w-4 h-4" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  if (academicYears.length === 0) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/admin/settings")}>
        <CalendarDays className="w-4 h-4" />
        <span className="hidden sm:inline">Add Session</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 min-w-[120px]">
          <CalendarDays className="w-4 h-4" />
          <span className="hidden sm:inline">
            {selectedSession?.name || "Select Session"}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Academic Session
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {academicYears.map((year) => (
          <DropdownMenuItem
            key={year.id}
            onClick={() => setSelectedSession(year)}
            className={`flex items-center justify-between cursor-pointer ${
              selectedSession?.id === year.id ? "bg-accent" : ""
            }`}
          >
            <span>{year.name}</span>
            {year.is_current && (
              <Badge variant="secondary" className="text-xs">
                Current
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/admin/session-report")}
          className="cursor-pointer text-primary"
        >
          View Session Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SessionSelector;