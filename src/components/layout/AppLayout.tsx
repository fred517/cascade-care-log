import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  TrendingUp, 
  Bell, 
  Settings, 
  BookOpen,
  Menu,
  X,
  Droplets,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/readings', label: 'Add Reading', icon: PlusCircle },
  { path: '/trends', label: 'Trends', icon: TrendingUp },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/guides', label: 'How-To Guides', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-primary" />
          </div>
          <span className="font-semibold text-lg">WaterOps</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="hidden lg:flex h-20 items-center gap-3 px-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">WaterOps</h1>
            <p className="text-xs text-muted-foreground">Operator Dashboard</p>
          </div>
        </div>

        {/* Mobile spacer */}
        <div className="lg:hidden h-16" />

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "nav-item group",
                  isActive && "active"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className={cn(
                  "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
                  isActive && "opacity-100"
                )} />
              </Link>
            );
          })}
        </nav>

        {/* Site Selector */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="p-3 rounded-lg bg-secondary">
            <p className="text-xs text-muted-foreground mb-1">Current Site</p>
            <p className="font-medium">Main Treatment Plant</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
