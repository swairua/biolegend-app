import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  findAllProformasWithDuplicates,
  findProformaDuplicates,
  type DuplicateItemGroup
} from '@/utils/proformaDeduplication';
import { cleanupProformaDuplicatesSQL } from '@/utils/proformaDuplicateCleanupSQL';
import { calculateDocumentTotals } from '@/utils/taxCalculation';
import { supabase } from '@/integrations/supabase/client';

interface ProformaWithDuplicateInfo {
  proforma_id: string;
  proforma_number: string;
  duplicate_count: number;
  total_items: number;
  is_repairing?: boolean;
  is_repaired?: boolean;
  repair_error?: string;
}

interface ProformaDuplicateRepairPanelProps {
  companyId: string;
  onRepairComplete?: () => void;
}

export const ProformaDuplicateRepairPanel = ({ 
  companyId, 
  onRepairComplete 
}: ProformaDuplicateRepairPanelProps) => {
  const [proformasWithDuplicates, setProformasWithDuplicates] = useState<ProformaWithDuplicateInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedProformaId, setSelectedProformaId] = useState<string | null>(null);
  const [duplicateDetails, setDuplicateDetails] = useState<DuplicateItemGroup[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Scan for duplicates on mount
  useEffect(() => {
    scanForDuplicates();
  }, [companyId]);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    try {
      const proformasWithDupes = await findAllProformasWithDuplicates(companyId);
      
      if (proformasWithDupes.length === 0) {
        toast.success('✨ No duplicate items found! Your proformas are clean.');
        setProformasWithDuplicates([]);
      } else {
        // Get total item count for each proforma
        const withItemCounts = await Promise.all(
          proformasWithDupes.map(async (pf) => {
            const { data: items, error } = await supabase
              .from('proforma_items')
              .select('id')
              .eq('proforma_id', pf.proforma_id);
            
            return {
              ...pf,
              total_items: error ? 0 : (items?.length || 0),
              is_repairing: false,
              is_repaired: false
            };
          })
        );
        
        setProformasWithDuplicates(withItemCounts);
        toast.info(`Found ${withItemCounts.length} proforma(s) with duplicate items`);
      }
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
      toast.error('Failed to scan for duplicates');
    } finally {
      setIsScanning(false);
    }
  };

  const loadProformaDetails = async (proformaId: string) => {
    setSelectedProformaId(proformaId);
    setIsLoadingDetails(true);
    try {
      const duplicates = await findProformaDuplicates(proformaId);
      setDuplicateDetails(duplicates);
    } catch (error) {
      console.error('Error loading details:', error);
      toast.error('Failed to load proforma details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRepair = async (proformaId: string) => {
    // Update UI to show repairing status
    setProformasWithDuplicates(prev =>
      prev.map(pf =>
        pf.proforma_id === proformaId
          ? { ...pf, is_repairing: true }
          : pf
      )
    );

    try {
      // Run deduplication
      const result = await deduplicateProformaItems(proformaId);

      if (result.success) {
        // Recalculate totals
        const { data: items, error: fetchError } = await supabase
          .from('proforma_items')
          .select('quantity, unit_price, tax_percentage, tax_amount, tax_inclusive, discount_percentage')
          .eq('proforma_id', proformaId);

        if (!fetchError && items && items.length > 0) {
          const totals = calculateDocumentTotals(items);
          
          // Update proforma totals
          await supabase
            .from('proforma_invoices')
            .update({
              subtotal: totals.subtotal,
              tax_amount: totals.tax_total,
              total_amount: totals.total_amount
            })
            .eq('id', proformaId);
        }

        // Update UI
        setProformasWithDuplicates(prev =>
          prev.map(pf =>
            pf.proforma_id === proformaId
              ? { ...pf, is_repairing: false, is_repaired: true }
              : pf
          )
        );

        toast.success(
          `✅ Repaired! Fixed ${result.duplicates_fixed} product(s). Items: ${proformasWithDuplicates.find(p => p.proforma_id === proformaId)?.total_items || 0} → ${result.duplicates_found > 0 ? 'consolidated' : 'verified'}`
        );

        // Reload details to show updates
        if (selectedProformaId === proformaId) {
          loadProformaDetails(proformaId);
        }

        // Call the callback
        onRepairComplete?.();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setProformasWithDuplicates(prev =>
        prev.map(pf =>
          pf.proforma_id === proformaId
            ? { ...pf, is_repairing: false, repair_error: errorMsg }
            : pf
        )
      );
      toast.error(`Failed to repair: ${errorMsg}`);
    }
  };

  const closeDetails = () => {
    setSelectedProformaId(null);
    setDuplicateDetails([]);
  };

  if (isScanning) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader className="h-5 w-5 animate-spin" />
            Scanning for Duplicate Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Analyzing proformas...</p>
        </CardContent>
      </Card>
    );
  }

  if (proformasWithDuplicates.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            No Duplicates Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-800">
            All proformas are clean with no duplicate items.
          </p>
          <Button variant="outline" className="mt-4" onClick={scanForDuplicates}>
            Rescan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Found <strong>{proformasWithDuplicates.length}</strong> proforma(s) with duplicate items. 
          Click "Repair" to consolidate duplicates and recalculate totals.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {proformasWithDuplicates.map((pf) => (
          <Card key={pf.proforma_id} className={pf.is_repaired ? 'border-green-200 bg-green-50' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {pf.proforma_number}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {pf.proforma_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pf.is_repaired && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Repaired
                    </Badge>
                  )}
                  {pf.repair_error && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {pf.duplicate_count} duplicated product(s)
                  </Badge>
                  <Badge variant="outline">
                    {pf.total_items} total items
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {pf.repair_error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{pf.repair_error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadProformaDetails(pf.proforma_id)}
                  disabled={pf.is_repairing}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRepair(pf.proforma_id)}
                  disabled={pf.is_repairing || pf.is_repaired}
                  className={pf.is_repaired ? 'bg-green-600' : ''}
                >
                  {pf.is_repairing ? (
                    <>
                      <Loader className="h-3 w-3 mr-1 animate-spin" />
                      Repairing...
                    </>
                  ) : pf.is_repaired ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Repaired
                    </>
                  ) : (
                    'Repair Now'
                  )}
                </Button>
              </div>

              {selectedProformaId === pf.proforma_id && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
                  {isLoadingDetails ? (
                    <div className="flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading details...</span>
                    </div>
                  ) : duplicateDetails.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Duplicate Items:</h4>
                      {duplicateDetails.map((group) => (
                        <div key={group.product_id} className="text-xs space-y-1 bg-white p-2 rounded border">
                          <p className="font-medium">{group.product_name}</p>
                          <p className="text-muted-foreground">
                            {group.count} copies → {group.total_quantity} total quantity
                          </p>
                          <div className="text-xs text-slate-500">
                            <p>Unit Price: {group.items[0]?.unit_price || 'N/A'}</p>
                            <p>Tax: {group.items[0]?.tax_percentage || 0}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No duplicate details available</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeDetails}
                    className="mt-3 text-xs"
                  >
                    Close
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={scanForDuplicates} variant="outline">
          Rescan All
        </Button>
        <Button
          onClick={() => {
            // Repair all at once
            proformasWithDuplicates
              .filter(pf => !pf.is_repaired && !pf.is_repairing)
              .forEach(pf => handleRepair(pf.proforma_id));
          }}
          disabled={proformasWithDuplicates.every(pf => pf.is_repaired || pf.is_repairing)}
          className="bg-red-600 hover:bg-red-700"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Repair All
        </Button>
      </div>
    </div>
  );
};
