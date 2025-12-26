import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
}

/**
 * Navigation link component that highlights the active route
 */
export function NavLink({ 
  href, 
  children, 
  className = "", 
  activeClassName = "",
  exact = false 
}: NavLinkProps) {
  const [location] = useLocation();
  
  const isActive = exact 
    ? location === href
    : location === href || (href !== "/" && location.startsWith(href));
  
  const linkClasses = cn(
    "transition-colors font-medium relative inline-block",
    isActive 
      ? cn("text-foreground", activeClassName)
      : "text-muted-foreground hover:text-foreground",
    className
  );

  return (
    <Link href={href} className={linkClasses}>
      <span className="relative z-10">{children}</span>
      {isActive && (
        <span 
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

