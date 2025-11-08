import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export function CreditNoteReversalGuide() {
  return (
    <div className="space-y-6">
      <Card className="shadow-card border-info/20 bg-info-light">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-info" />
            <span>Understanding Credit Note Reversal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">
            A credit note reversal (also called cancellation) completely removes a credit note
            from your system and restores all associated data to its previous state.
          </p>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* What Gets Reversed */}
        <AccordionItem value="what-reversed" className="border shadow-sm rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>What Gets Reversed?</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <div className="space-y-2">
              <p className="font-semibold text-sm">When you reverse a credit note:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-success mt-1">✓</span>
                  <span>
                    <strong>Credit Note Status:</strong> Changed from 'draft', 'sent', or 'applied' to
                    'cancelled'
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-success mt-1">✓</span>
                  <span>
                    <strong>Applied Amount:</strong> Reset to zero (if previously applied to invoices)
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-success mt-1">✓</span>
                  <span>
                    <strong>Credit Balance:</strong> Reset to the original total amount
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-success mt-1">✓</span>
                  <span>
                    <strong>Invoice Allocations:</strong> All allocations are deleted and invoice
                    balances are restored
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-success mt-1">✓</span>
                  <span>
                    <strong>Stock Movements:</strong> If the credit note affected inventory, reverse
                    movements are created to undo the original stock changes
                  </span>
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* When Can You Reverse */}
        <AccordionItem value="when-reverse" className="border shadow-sm rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span>When Can You Reverse?</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <div className="space-y-3">
              <div className="bg-success-light border border-success/20 rounded p-3">
                <p className="text-sm font-semibold text-success mb-2">✓ You CAN reverse:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Credit notes in 'draft' status</li>
                  <li>Credit notes in 'sent' status</li>
                  <li>Credit notes in 'applied' status (will also remove allocations)</li>
                  <li>Credit notes that affect inventory</li>
                </ul>
              </div>

              <div className="bg-destructive-light border border-destructive/20 rounded p-3">
                <p className="text-sm font-semibold text-destructive mb-2">✗ You CANNOT reverse:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Credit notes already in 'cancelled' status</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Applied Credit Notes */}
        <AccordionItem value="applied-notes" className="border shadow-sm rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-info" />
              <span>Reversing Applied Credit Notes</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <Alert className="bg-info-light border-info/20">
              <AlertCircle className="h-4 w-4 text-info" />
              <AlertDescription>
                When you reverse a credit note that has been applied to invoices, the system
                automatically reverses all allocations and restores the invoice balances.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Example:</p>
              <div className="bg-muted p-3 rounded text-sm space-y-1 font-mono">
                <p>Credit Note CN-000001: 1,000 KES</p>
                <p className="ml-4">Applied to Invoice INV-100 (500 KES)</p>
                <p className="ml-4">Applied to Invoice INV-101 (500 KES)</p>
                <p className="mt-2">When reversed:</p>
                <p className="ml-4">✓ Credit note status → cancelled</p>
                <p className="ml-4">✓ INV-100 balance increases by 500 KES</p>
                <p className="ml-4">✓ INV-101 balance increases by 500 KES</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Inventory */}
        <AccordionItem value="inventory" className="border shadow-sm rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-info" />
              <span>Inventory Impact</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold mb-2">Credit Notes that AFFECT inventory:</p>
                <p className="text-sm text-muted-foreground">
                  When created: Items are added to stock (marked as 'returns')
                  <br />
                  When reversed: Items are removed from stock (reversal movements)
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Credit Notes that DO NOT affect inventory:</p>
                <p className="text-sm text-muted-foreground">
                  No stock movements are created or reversed
                </p>
              </div>

              <Alert className="bg-warning-light border-warning/20">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription>
                  Always verify your stock levels after reversing a credit note if it affects
                  inventory.
                </AlertDescription>
              </Alert>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Process */}
        <AccordionItem value="process" className="border shadow-sm rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-info" />
              <span>Reversal Process</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>System verifies credit note exists and is not already cancelled</li>
              <li>If credit note is applied, all allocations are reversed and invoices updated</li>
              <li>If credit note affects inventory, reverse stock movements are created</li>
              <li>Product stock levels are recalculated</li>
              <li>Credit note status is changed to 'cancelled'</li>
              <li>All related queries are refreshed in the system</li>
            </ol>

            <Alert className="bg-success-light border-success/20 mt-4">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                All these steps happen atomically — either they all complete successfully or the
                entire operation is rolled back with no changes.
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        {/* Undo */}
        <AccordionItem value="undo" className="border shadow-sm rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Can You Undo a Reversal?</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <Alert className="bg-destructive-light border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription>
                <strong>No.</strong> Once a credit note is reversed (cancelled), you cannot directly
                undo it.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm">
                If you need to restore a cancelled credit note, you must:
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                <li>Create a new credit note with the same details</li>
                <li>Re-apply it to the necessary invoices if needed</li>
                <li>Manually verify that stock and balances are correct</li>
              </ol>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Alert className="bg-info-light border-info/20">
        <Info className="h-4 w-4 text-info" />
        <AlertDescription>
          For detailed testing and verification of the reversal process, use the Credit Note
          Reversal Test Panel available in the system administration area.
        </AlertDescription>
      </Alert>
    </div>
  );
}
