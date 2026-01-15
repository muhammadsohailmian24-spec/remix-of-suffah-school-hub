import { Link } from "react-router-dom";
import { LucideIcon, LayoutDashboard } from "lucide-react";

interface PortalSidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isDashboard?: boolean;
}

const PortalSidebarLink = ({ to, icon: Icon, label, isActive = false, isDashboard = false }: PortalSidebarLinkProps) => {
  // For dashboard link, use the school logo
  if (isDashboard) {
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-accent text-muted-foreground hover:text-foreground"
        }`}
      >
        <img 
          src="/images/school-logo.png" 
          alt="Dashboard"
          className="w-5 h-5 rounded-full object-cover"
        />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
};

export default PortalSidebarLink;
