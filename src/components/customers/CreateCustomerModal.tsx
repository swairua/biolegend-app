import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCustomer, useCustomers, useCompanies } from '@/hooks/useDatabase';

interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCustomerModal({ open, onOpenChange, onSuccess }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Kenya',
    credit_limit: 100000,
    payment_terms: 30,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: customers } = useCustomers(currentCompany?.id);
  const createCustomer = useCreateCustomer();

  const generateCustomerCode = () => {
    const customerCount = customers?.length || 0;
    return `CUST${(customerCount + 1).toString().padStart(3, '0')}`;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('Company not found. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const customerCode = generateCustomerCode();
      
      await createCustomer.mutateAsync({
        company_id: currentCompany.id,
        customer_code: customerCode,
        ...formData
      });
      
      toast.success(`Customer ${formData.name} created successfully!`);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Kenya',
        credit_limit: 100000,
        payment_terms: 30,
        is_active: true,
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancel = () => {
    // Reset form when canceling
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Kenya',
      credit_limit: 100000,
      payment_terms: 30,
      is_active: true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Create New Customer</span>
          </DialogTitle>
          <DialogDescription>
            Add a new customer to your database
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="customer@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+254 700 000000"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter customer address"
                    className="pl-10"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Nairobi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kenya">Kenya</SelectItem>
                      <SelectItem value="Uganda">Uganda</SelectItem>
                      <SelectItem value="Tanzania">Tanzania</SelectItem>
                      <SelectItem value="Rwanda">Rwanda</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Business Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit (KES)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={formData.credit_limit}
                  onChange={(e) => handleInputChange('credit_limit', parseFloat(e.target.value) || 0)}
                  placeholder="100000"
                  min="0"
                  step="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                <Select 
                  value={formData.payment_terms.toString()} 
                  onValueChange={(value) => handleInputChange('payment_terms', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Customer Status</Label>
                  <div className="text-sm text-muted-foreground">
                    {formData.is_active ? 'Active customer' : 'Inactive customer'}
                  </div>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Customer Preview</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Code: {generateCustomerCode()}</p>
                  <p>Credit Limit: KES {formData.credit_limit.toLocaleString()}</p>
                  <p>Payment Terms: {formData.payment_terms} days</p>
                  <p>Status: {formData.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
