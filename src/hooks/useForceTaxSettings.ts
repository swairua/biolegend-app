import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTaxSettings, 
  createTaxSetting, 
  updateTaxSetting, 
  deleteTaxSetting,
  forceCreateTaxSettings,
  type SimpleTaxSetting 
} from '@/utils/forceTaxSetup';
import { toast } from 'sonner';

export const useForceTaxSettings = (companyId?: string) => {
  return useQuery({
    queryKey: ['force_tax_settings', companyId],
    queryFn: () => getTaxSettings(companyId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
};

export const useForceCreateTaxSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taxSetting: Omit<SimpleTaxSetting, 'id' | 'created_at' | 'updated_at'>) => {
      return await createTaxSetting(taxSetting);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['force_tax_settings'] });
      toast.success('Tax setting created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tax setting: ${error.message}`);
    }
  });
};

export const useForceUpdateTaxSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SimpleTaxSetting> }) => {
      return await updateTaxSetting(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['force_tax_settings'] });
      toast.success('Tax setting updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tax setting: ${error.message}`);
    }
  });
};

export const useForceDeleteTaxSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteTaxSetting(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['force_tax_settings'] });
      toast.success('Tax setting deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tax setting: ${error.message}`);
    }
  });
};

export const useForceSetupTaxSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: forceCreateTaxSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['force_tax_settings'] });
      toast.success('Tax settings initialized successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to initialize tax settings: ${error.message}`);
    }
  });
};
