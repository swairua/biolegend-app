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
      // Call the atomic reversal function in the database
      // This ensures all operations are transactional: all succeed or all fail
      const { data: result, error: rpcErr } = await supabase
        .rpc('reverse_credit_note', {
          p_credit_note_id: creditNoteId,
          p_reason: reason || null
        });

      if (rpcErr) {
        console.error('Error reversing credit note via RPC:', rpcErr);
        throw rpcErr;
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to reverse credit note');
      }

      // Fetch the updated credit note to return it
      const { data: updated, error: fetchErr } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('id', creditNoteId)
        .single();

      if (fetchErr) throw fetchErr;

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
