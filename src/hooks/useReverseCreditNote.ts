import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReverseParams {
  creditNoteId: string;
  reason?: string;
}

export function useReverseCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ creditNoteId, reason }: ReverseParams) => {
      // Fetch credit note with full details
      const { data: creditNote, error: fetchErr } = await supabase
        .from('credit_notes')
        .select('id, company_id, credit_note_number, affects_inventory, applied_amount, balance, status, total_amount')
        .eq('id', creditNoteId)
        .single();

      if (fetchErr) throw fetchErr;

      if (!creditNote) {
        throw new Error('Credit note not found');
      }

      if (creditNote.status === 'cancelled') {
        throw new Error('Credit note is already cancelled');
      }

      // Reverse allocations if credit note has been applied
      if ((creditNote.applied_amount || 0) > 0) {
        // Fetch all allocations for this credit note
        const { data: allocations, error: allocErr } = await supabase
          .from('credit_note_allocations')
          .select('id, invoice_id, allocated_amount')
          .eq('credit_note_id', creditNoteId);

        if (allocErr) {
          console.error('Error fetching credit note allocations:', allocErr);
          throw allocErr;
        }

        // Reverse each allocation by updating the associated invoices
        if (allocations && allocations.length > 0) {
          for (const allocation of allocations) {
            try {
              // Fetch current invoice values
              const { data: invoice, error: invoiceFetchErr } = await supabase
                .from('invoices')
                .select('paid_amount, balance_due')
                .eq('id', allocation.invoice_id)
                .single();

              if (invoiceFetchErr) {
                console.error('Error fetching invoice:', invoiceFetchErr);
                continue;
              }

              if (invoice) {
                // Update invoice to remove the applied credit
                const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - allocation.allocated_amount);
                const newBalanceDue = (invoice.balance_due || 0) + allocation.allocated_amount;

                const { error: invoiceErr } = await supabase
                  .from('invoices')
                  .update({
                    paid_amount: newPaidAmount,
                    balance_due: newBalanceDue,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', allocation.invoice_id);

                if (invoiceErr) {
                  console.error('Error updating invoice after allocation reversal:', invoiceErr);
                }
              }
            } catch (error) {
              console.error('Error processing allocation reversal:', error);
            }
          }

          // Delete all allocations for this credit note
          const { error: deleteAllocErr } = await supabase
            .from('credit_note_allocations')
            .delete()
            .eq('credit_note_id', creditNoteId);

          if (deleteAllocErr) {
            console.error('Error deleting allocations:', deleteAllocErr);
            throw deleteAllocErr;
          }
        }
      }

      // Reverse stock movements if needed
      if (creditNote.affects_inventory) {
        const { data: existingMovements, error: movementsError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('reference_type', 'CREDIT_NOTE')
          .eq('reference_id', creditNoteId);

        if (movementsError) {
          console.error('Error fetching stock movements:', movementsError);
          // Continue with reversal even if stock movements can't be fetched
        } else if (existingMovements && existingMovements.length > 0) {
          // Create reverse movements for each existing movement
          const reverseMovements = existingMovements.map((movement: any) => ({
            company_id: movement.company_id,
            product_id: movement.product_id,
            movement_type: movement.movement_type === 'IN' ? 'OUT' : 'IN',
            quantity: Math.abs(movement.quantity),
            reference_type: 'CREDIT_NOTE_REVERSAL',
            reference_id: creditNoteId,
            notes: `Reversal of ${movement.notes}`
          }));

          const { error: reverseError } = await supabase
            .from('stock_movements')
            .insert(reverseMovements);

          if (reverseError) {
            console.error('Error creating reverse movements:', reverseError);
            throw reverseError;
          }

          // Update product stock levels based on reversals
          for (const movement of reverseMovements) {
            try {
              await supabase.rpc('update_product_stock', {
                product_uuid: movement.product_id,
                movement_type: movement.movement_type,
                quantity: Math.abs(movement.quantity)
              });
            } catch (stockUpdateError: any) {
              console.error('Error updating product stock (reversal):', stockUpdateError);
              // Log but don't throw to allow reversal to complete
            }
          }
        }
      }

      // Mark the credit note as cancelled
      const noteText = reason
        ? `Reversed - ${reason}`
        : 'Reversed';

      const { data: updated, error: updateErr } = await supabase
        .from('credit_notes')
        .update({
          status: 'cancelled',
          applied_amount: 0,
          balance: creditNote.total_amount,
          notes: noteText,
        })
        .eq('id', creditNoteId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['creditNote', data.id] });
      queryClient.invalidateQueries({ queryKey: ['creditNoteAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      toast.success(`Credit note ${data.credit_note_number} reversed (cancelled)`);
    },
    onError: (error: any) => {
      console.error('Error reversing credit note:', error);
      toast.error(error?.message || 'Failed to reverse credit note');
    }
  });
}
