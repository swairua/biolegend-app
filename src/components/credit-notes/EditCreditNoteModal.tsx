import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Edit3,
  Save,
  AlertCircle
} from 'lucide-react';
import { useUpdateCreditNote } from '@/hooks/useCreditNotes';
import { toast } from 'sonner';
import type { CreditNote } from '@/hooks/useCreditNotes';

interface EditCreditNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditNote: CreditNote | null;
  onSuccess: () => void;
}

export function EditCreditNoteModal({ 
  open, 
  onOpenChange, 
  creditNote,
  onSuccess 
}: EditCreditNoteModalProps) {
  const [creditNoteDate, setCreditNoteDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [affectsInventory, setAffectsInventory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateCreditNote = useUpdateCreditNote();

  // Initialize form when credit note changes
  useEffect(() => {
    if (creditNote && open) {
      setCreditNoteDate(creditNote.credit_note_date);
      setReason(creditNote.reason || '');
      setNotes(creditNote.notes || '');
      setTermsAndConditions(creditNote.terms_and_conditions || '');
      setAffectsInventory(creditNote.affects_inventory);
    }
  }, [creditNote, open]);

  if (!creditNote) return null;

  // Only allow editing draft credit notes
  if (creditNote.status !== 'draft') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span>Cannot Edit Credit Note</span>
            </DialogTitle>
            <DialogDescription>
              Only draft credit notes can be edited. This credit note has status: {creditNote.status}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the credit note');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates = {
        credit_note_date: creditNoteDate,
        reason: reason,
        notes: notes,
        terms_and_conditions: termsAndConditions,
        affects_inventory: affectsInventory,
      };

      await updateCreditNote.mutateAsync({
        id: creditNote.id,
        updates
      });

      toast.success(`Credit note ${creditNote.credit_note_number} updated successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating credit note:', error);
      toast.error('Failed to update credit note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    if (creditNote) {
      setCreditNoteDate(creditNote.credit_note_date);
      setReason(creditNote.reason || '');
      setNotes(creditNote.notes || '');
      setTermsAndConditions(creditNote.terms_and_conditions || '');
      setAffectsInventory(creditNote.affects_inventory);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit3 className="h-5 w-5 text-primary" />
            <span>Edit Credit Note {creditNote.credit_note_number}</span>
          </DialogTitle>
          <DialogDescription>
            Modify the details of this draft credit note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credit_note_date">Credit Note Date *</Label>
              <Input
                id="credit_note_date"
                type="date"
                value={creditNoteDate}
                onChange={(e) => setCreditNoteDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason for credit note" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product Return">Product Return</SelectItem>
                  <SelectItem value="Pricing Error">Pricing Error</SelectItem>
                  <SelectItem value="Billing Error">Billing Error</SelectItem>
                  <SelectItem value="Damaged Goods">Damaged Goods</SelectItem>
                  <SelectItem value="Customer Goodwill">Customer Goodwill</SelectItem>
                  <SelectItem value="Overpayment">Overpayment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inventory Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="affects_inventory"
              checked={affectsInventory}
              onCheckedChange={(checked) => setAffectsInventory(!!checked)}
            />
            <Label htmlFor="affects_inventory" className="text-sm">
              Affects Inventory (returns items to stock)
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes for this credit note..."
            />
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-2">
            <Label htmlFor="terms">Terms and Conditions</Label>
            <Textarea
              id="terms"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              rows={2}
              placeholder="Terms and conditions for this credit note..."
            />
          </div>

          {/* Current Financial Information (Read-only) */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Financial Information (Read-only)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Amount</div>
                <div className="font-semibold">
                  {new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    minimumFractionDigits: 2
                  }).format(creditNote.total_amount)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Applied</div>
                <div className="font-semibold">
                  {new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    minimumFractionDigits: 2
                  }).format(creditNote.applied_amount)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Balance</div>
                <div className="font-semibold">
                  {new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    minimumFractionDigits: 2
                  }).format(creditNote.balance)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-semibold capitalize">{creditNote.status}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: To modify items or amounts, you'll need to create a new credit note.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>
              Reset
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !reason.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
