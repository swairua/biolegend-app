import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadCreditNotePDF, type CompanyDetails } from '@/utils/pdfGenerator';
import { useCompanies } from '@/hooks/useDatabase';

export function useCreditNotePDFDownload() {
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];

  return useMutation({
    mutationFn: async (creditNote: any) => {
      // Prepare company data
      const companyData: CompanyDetails = {
        name: currentCompany?.name || 'Your Company',
        email: currentCompany?.email || '',
        phone: currentCompany?.phone || '',
        address: currentCompany?.address || '',
        tax_number: currentCompany?.tax_number || '',
        registration_number: (currentCompany as any)?.registration_number || '',
        logo_url: currentCompany?.logo_url || '',
      };

      // Generate and download PDF using shared generator
      await downloadCreditNotePDF(creditNote, companyData);

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Credit note PDF downloaded successfully!');
    },
    onError: (error: any) => {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    },
  });
}
