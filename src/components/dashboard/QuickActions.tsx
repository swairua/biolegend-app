import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileText,
  Receipt,
  Users,
  Package,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'success' | 'primary-gradient' | 'warning';
  href: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'New Quotation',
    description: 'Create a new quotation for a customer',
    icon: FileText,
    variant: 'primary-gradient',
    href: '/quotations/new'
  },
  {
    title: 'New Invoice',
    description: 'Generate an invoice from quotation',
    icon: Receipt,
    variant: 'success',
    href: '/invoices/new'
  },
  {
    title: 'Add Customer',
    description: 'Register a new customer',
    icon: Users,
    variant: 'default',
    href: '/customers/new'
  },
  {
    title: 'Stock Entry',
    description: 'Add new inventory items',
    icon: Package,
    variant: 'warning',
    href: '/inventory/new'
  },
  {
    title: 'Record Payment',
    description: 'Log customer payment',
    icon: DollarSign,
    variant: 'success',
    href: '/payments/new'
  }
];

export function QuickActions() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
        {quickActions.map((action) => (
          <Button
            key={action.title}
            variant={action.variant}
            className="flex items-center justify-start space-x-3 h-auto p-4 text-left"
            asChild
          >
            <Link to={action.href}>
              <action.icon className="h-5 w-5" />
              <div className="flex-1">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
