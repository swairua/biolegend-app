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
      // Fetch credit note
      const { data: creditNote, error: fetchErr } = await supabase
        .from('credit_notes')
        .select('id, company_id, credit_note_number, affects_inventory, applied_amount, balance, status')
        .eq('id', creditNoteId)
        .single();

      if (fetchErr) throw fetchErr;

      if (!creditNote) {
        throw new Error('Credit note not found');
      }

      if ((creditNote.applied_amount || 0) > 0) {
        throw new Error('Cannot reverse a credit note that has been applied');
      }

      // Reverse stock movements if needed
      if (creditNote.affects_inventory) {
        const { data: existingMovements, error: movementsError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('reference_type', 'CREDIT_NOTE')
          .eq('reference_id', creditNoteId);

        if (!movementsError && existingMovements && existingMovements.length > 0) {
          const reverseMovements = existingMovements.map((movement: any) => ({
            company_id: movement.company_id,
            product_id: movement.product_id,
            movement_type: movement.movement_type === 'IN' ? 'OUT' : 'IN',
            quantity: movement.quantity,
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
            }
          }
        }
      }

      // Mark the credit note as cancelled
      const { data: updated, error: updateErr } = await supabase
        .from('credit_notes')
        .update({
          status: 'cancelled',
          notes: reason ? `${reason}` : undefined,
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
