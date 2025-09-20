import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Building2,
  FileText,
  Receipt,
  Package,
  DollarSign,
  Truck,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  FileCheck,
  CreditCard,
  FileSpreadsheet,
  ShoppingCart,
  RotateCcw
} from 'lucide-react';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';

interface SidebarItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: SidebarItem[];
}

const sidebarItems: SidebarItem[] = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/'
  },
  {
    title: 'Sales',
    icon: Receipt,
    children: [
      { title: 'Quotations', icon: FileText, href: '/quotations' },
      { title: 'Invoices', icon: Receipt, href: '/invoices' },
      { title: 'Proforma Invoices', icon: FileCheck, href: '/proforma' },
      { title: 'Credit Notes', icon: RotateCcw, href: '/credit-notes' }
    ]
  },
  {
    title: 'Payments',
    icon: DollarSign,
    children: [
      { title: 'Payments', icon: DollarSign, href: '/payments' },
      { title: 'Remittance Advice', icon: CreditCard, href: '/remittance' }
    ]
  },
  {
    title: 'Inventory',
    icon: Package,
    href: '/inventory'
  },
  {
    title: 'Delivery Notes',
    icon: Truck,
    href: '/delivery-notes'
  },
  {
    title: 'Customers',
    icon: Users,
    href: '/customers'
  },
  {
    title: 'Purchase Orders',
    icon: ShoppingCart,
    href: '/lpos'
  },
  {
    title: 'Reports',
    icon: BarChart3,
    children: [
      { title: 'Sales Reports', icon: BarChart3, href: '/reports/sales' },
      { title: 'Inventory Reports', icon: Package, href: '/reports/inventory' },
      { title: 'Customer Statements', icon: FileSpreadsheet, href: '/reports/statements' }
    ]
  },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'Company Settings', icon: Building2, href: '/settings/company' },
      { title: 'User Management', icon: Users, href: '/settings/users' },
      { title: 'Database Setup', icon: Package, href: '/database-setup' }
    ]
  }
];

export function Sidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Sales', 'Reports']);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isItemActive = (href?: string) => {
    if (!href) return false;
    return location.pathname === href;
  };

  const isParentActive = (children?: SidebarItem[]) => {
    if (!children) return false;
    return children.some(child => isItemActive(child.href));
  };

  const renderSidebarItem = (item: SidebarItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = isItemActive(item.href);
    const isChildActive = isParentActive(item.children);

    if (hasChildren) {
      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-smooth hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              (isChildActive || isExpanded) 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground"
            )}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {isExpanded && (
            <div className="pl-4 space-y-1">
              {item.children?.map(child => (
                <Link
                  key={child.title}
                  to={child.href!}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-smooth hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isItemActive(child.href)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground"
                  )}
                >
                  <child.icon className="h-4 w-4" />
                  <span>{child.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.title}
        to={item.href!}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-smooth hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground"
        )}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.title}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Biolegend Logo/Header */}
      <div className="flex items-center border-b border-sidebar-border px-6 py-4">
        <BiolegendLogo size="lg" pixelSize={120} showText={false} className="text-sidebar-foreground" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4 custom-scrollbar overflow-y-auto">
        {sidebarItems.map(renderSidebarItem)}
      </nav>

      {/* Company Info */}
      <div className="border-t border-sidebar-border p-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 px-3 py-2 text-sm text-sidebar-foreground">
            <Building2 className="h-4 w-4 text-sidebar-primary" />
            <div>
              <div className="font-medium">Biolegend Scientific Ltd</div>
              <div className="text-xs text-sidebar-foreground/60">Scientific Equipment & Supplies</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
