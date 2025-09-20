import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Check, X, Zap } from 'lucide-react';
import { 
  useForceTaxSettings, 
  useForceCreateTaxSetting, 
  useForceUpdateTaxSetting, 
  useForceDeleteTaxSetting,
  useForceSetupTaxSettings
} from '@/hooks/useForceTaxSettings';
import type { SimpleTaxSetting } from '@/utils/forceTaxSetup';

interface ForceTaxSettingsProps {
  companyId: string;
}

export function ForceTaxSettings({ companyId }: ForceTaxSettingsProps) {
  const [editingTax, setEditingTax] = useState<string | null>(null);
  const [newTax, setNewTax] = useState({ name: '', rate: 0, is_default: false });
  const [showNewTaxForm, setShowNewTaxForm] = useState(false);

  const { data: taxSettings, isLoading, error } = useForceTaxSettings(companyId);
  const createTaxSetting = useForceCreateTaxSetting();
  const updateTaxSetting = useForceUpdateTaxSetting();
  const deleteTaxSetting = useForceDeleteTaxSetting();
  const setupTaxSettings = useForceSetupTaxSettings();

  const handleCreateTax = async () => {
    if (!newTax.name.trim()) {
      return;
    }

    if (newTax.rate < 0) {
      return;
    }

    try {
      await createTaxSetting.mutateAsync({
        company_id: companyId,
        name: newTax.name.trim(),
        rate: newTax.rate,
        is_active: true,
        is_default: newTax.is_default
      });

      setNewTax({ name: '', rate: 0, is_default: false });
      setShowNewTaxForm(false);
    } catch (error) {
      console.error('Create tax error:', error);
    }
  };

  const handleUpdateTax = async (taxId: string, updates: Partial<SimpleTaxSetting>) => {
    try {
      await updateTaxSetting.mutateAsync({ id: taxId, updates });
      setEditingTax(null);
    } catch (error) {
      console.error('Update tax error:', error);
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    if (!confirm('Are you sure you want to delete this tax setting?')) {
      return;
    }

    try {
      await deleteTaxSetting.mutateAsync(taxId);
    } catch (error) {
      console.error('Delete tax error:', error);
    }
  };

  const handleForceSetup = async () => {
    try {
      await setupTaxSettings.mutateAsync();
    } catch (error) {
      console.error('Force setup error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading tax settings...
      </div>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tax Settings</span>
          <div className="flex gap-2">
            {(!taxSettings || taxSettings.length === 0) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleForceSetup}
                disabled={setupTaxSettings.isPending}
              >
                <Zap className="h-4 w-4 mr-2" />
                {setupTaxSettings.isPending ? 'Setting up...' : 'Force Setup'}
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowNewTaxForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add Tax
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Forced Tax System:</strong> This system works with or without database tables. 
            Default tax rate is set to 0% (Zero Rate) as requested.
          </AlertDescription>
        </Alert>

        {/* New Tax Form */}
        {showNewTaxForm && (
          <Card className="border-2 border-dashed border-primary/20">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tax Name</Label>
                  <Input
                    placeholder="e.g., VAT, GST, Zero Rate"
                    value={newTax.name}
                    onChange={(e) => setNewTax(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newTax.rate}
                    onChange={(e) => setNewTax(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Tax</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      checked={newTax.is_default}
                      onCheckedChange={(checked) => setNewTax(prev => ({ ...prev, is_default: checked }))}
                    />
                    <span className="text-sm text-muted-foreground">Set as default</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button 
                  size="sm" 
                  onClick={handleCreateTax}
                  disabled={!newTax.name.trim() || createTaxSetting.isPending}
                >
                  <Check className="h-4 w-4" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewTaxForm(false)}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tax Settings List */}
        <div className="space-y-2">
          {error && (
            <Alert>
              <AlertDescription>
                Using fallback system due to database issues. Tax settings are stored locally.
              </AlertDescription>
            </Alert>
          )}

          {taxSettings?.map((tax) => (
            <div key={tax.id} className="flex items-center justify-between p-3 border rounded-lg">
              {editingTax === tax.id ? (
                <TaxEditForm
                  tax={tax}
                  onSave={(updates) => handleUpdateTax(tax.id, updates)}
                  onCancel={() => setEditingTax(null)}
                />
              ) : (
                <>
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium">{tax.name}</div>
                      <div className="text-sm text-muted-foreground">{tax.rate}%</div>
                    </div>
                    <div className="flex space-x-2">
                      {tax.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {!tax.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTax(tax.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTax(tax.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {(!taxSettings || taxSettings.length === 0) && !showNewTaxForm && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tax settings configured.</p>
            <p className="text-sm">Click "Force Setup" to create default tax rates or "Add Tax" to create custom ones.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tax Edit Form Component
interface TaxEditFormProps {
  tax: SimpleTaxSetting;
  onSave: (updates: Partial<SimpleTaxSetting>) => void;
  onCancel: () => void;
}

function TaxEditForm({ tax, onSave, onCancel }: TaxEditFormProps) {
  const [editData, setEditData] = useState({
    name: tax.name,
    rate: tax.rate,
    is_active: tax.is_active,
    is_default: tax.is_default
  });

  return (
    <div className="flex-1 grid gap-4 md:grid-cols-4">
      <Input
        value={editData.name}
        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
      />
      <Input
        type="number"
        step="0.01"
        min="0"
        value={editData.rate}
        onChange={(e) => setEditData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
      />
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={editData.is_active}
            onCheckedChange={(checked) => setEditData(prev => ({ ...prev, is_active: checked }))}
          />
          <span className="text-sm">Active</span>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={editData.is_default}
            onCheckedChange={(checked) => setEditData(prev => ({ ...prev, is_default: checked }))}
          />
          <span className="text-sm">Default</span>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button size="sm" onClick={() => onSave(editData)}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
