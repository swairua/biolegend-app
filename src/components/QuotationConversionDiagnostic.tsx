import { useQuotations, useCompanies } from '@/hooks/useDatabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function QuotationConversionDiagnostic() {
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: quotations = [] } = useQuotations(currentCompany?.id);

  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50 mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          🔍 Quotation Conversion Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="font-semibold">Company Info</div>
            {currentCompany ? (
              <div className="text-xs space-y-1">
                <div><span className="font-medium">ID:</span> {currentCompany.id}</div>
                <div><span className="font-medium">Name:</span> {currentCompany.name}</div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Company loaded
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="h-3 w-3" />
                No company found
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="font-semibold">Quotations Count</div>
            <div className="text-xs space-y-1">
              <div><span className="font-medium">Total:</span> {quotations.length}</div>
              {quotations.length === 0 ? (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-3 w-3" />
                  No quotations
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Quotations loaded
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-semibold">Quotations Detail</div>
          <div className="bg-white rounded border border-gray-200 max-h-60 overflow-y-auto">
            {quotations.length === 0 ? (
              <div className="p-2 text-center text-gray-500">No quotations to display</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-100 border-b">
                  <tr>
                    <th className="text-left p-2">Quote #</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-center p-2">Items</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quot) => {
                    const itemsCount = quot.quotation_items?.length || 0;
                    const hasItems = itemsCount > 0;
                    return (
                      <tr key={quot.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono">{quot.quotation_number}</td>
                        <td className="p-2">{quot.customers?.name || 'Unknown'}</td>
                        <td className="p-2 text-center">
                          <Badge variant={hasItems ? 'default' : 'destructive'} className="text-xs">
                            {itemsCount}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          {hasItems ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {quotations.length > 0 && (
          <div className="space-y-2">
            <div className="font-semibold">First Quotation Details</div>
            <div className="bg-white rounded border border-gray-200 p-2 text-xs">
              <pre className="overflow-auto max-h-40 text-xs font-mono">
                {JSON.stringify(quotations[0], null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-600 italic">
          ℹ️ This diagnostic panel helps identify data loading issues. Items column should show a count, not 0.
        </div>
      </CardContent>
    </Card>
  );
}
