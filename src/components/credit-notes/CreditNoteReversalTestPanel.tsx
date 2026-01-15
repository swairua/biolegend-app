import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Play } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  runAllReversalTests, 
  generateTestReport,
  testFullReversal
} from '@/utils/creditNoteReversalTests';
import { toast } from 'sonner';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: Record<string, any>;
}

export function CreditNoteReversalTestPanel() {
  const [creditNoteId, setCreditNoteId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [reportText, setReportText] = useState('');

  const handleRunTests = async () => {
    if (!creditNoteId.trim()) {
      toast.error('Please enter a credit note ID');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setReportText('');

    try {
      const results = await runAllReversalTests(creditNoteId);
      setTestResults(results);
      const report = generateTestReport(results);
      setReportText(report);

      const passed = results.filter(r => r.passed).length;
      toast.success(`Tests completed: ${passed}/${results.length} passed`);
    } catch (error: any) {
      toast.error('Error running tests: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleExecuteReversal = async () => {
    if (!creditNoteId.trim()) {
      toast.error('Please enter a credit note ID');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to reverse this credit note? This action cannot be undone.'
    );

    if (!confirmed) return;

    setIsRunning(true);

    try {
      const result = await testFullReversal(creditNoteId, 'Test reversal');
      
      if (result.passed) {
        toast.success('Credit note reversed successfully');
        setCreditNoteId('');
        setTestResults([]);
        setReportText('');
      } else {
        toast.error('Failed to reverse credit note: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      toast.error('Error: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <span>Credit Note Reversal Testing & Verification</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Credit Note ID</label>
              <Input
                placeholder="Paste the UUID of the credit note to test"
                value={creditNoteId}
                onChange={(e) => setCreditNoteId(e.target.value)}
                disabled={isRunning}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRunTests}
                disabled={isRunning || !creditNoteId.trim()}
                variant="outline"
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Tests
              </Button>
              <Button
                onClick={handleExecuteReversal}
                disabled={isRunning || !creditNoteId.trim()}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Execute Reversal
              </Button>
            </div>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Test Results</h3>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.passed
                        ? 'bg-success-light border-success/20'
                        : 'bg-destructive-light border-destructive/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{result.testName}</p>
                          {result.error && (
                            <p className="text-sm text-destructive mt-1">{result.error}</p>
                          )}
                          {result.details && (
                            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                      <Badge variant={result.passed ? 'default' : 'destructive'}>
                        {result.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Text */}
          {reportText && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Full Report</h3>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                {reportText}
              </pre>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(reportText);
                  toast.success('Report copied to clipboard');
                }}
                variant="outline"
                className="w-full"
              >
                Copy Report
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-4 border-t pt-6 bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold">How to Use</h3>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Enter the UUID of a credit note that you want to test or reverse</li>
              <li>Click "Run Tests" to verify all data and pre-conditions</li>
              <li>Review the test results to ensure everything is ready</li>
              <li>
                Click "Execute Reversal" only if all tests pass to reverse the credit note
              </li>
            </ol>

            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="font-semibold">What Tests Verify:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Credit note exists and can be fetched</li>
                <li>All allocations are accessible</li>
                <li>Stock movements (if any) are accessible</li>
                <li>Associated invoices exist and have correct state</li>
                <li>Reversal function is available in the database</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
