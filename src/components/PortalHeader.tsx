import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";

interface PortalHeaderProps {
  portalName: string;
  onSignOut: () => void;
}

const PortalHeader = ({ portalName, onSignOut }: PortalHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img 
            src="/images/school-logo.png" 
            alt="The Suffah Public School & College"
            className="w-10 h-10 rounded-full object-cover shadow-md"
          />
          <div>
            <h1 className="font-heading text-lg font-bold">The Suffah</h1>
            <p className="text-xs text-muted-foreground">{portalName}</p>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
          <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;
