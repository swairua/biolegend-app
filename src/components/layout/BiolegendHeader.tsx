import { Building2 } from 'lucide-react';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';

export function BiolegendHeader() {
  return (
    <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
      <div className="flex items-center space-x-3">
        <BiolegendLogo size="md" showText={true} className="text-primary-foreground" />
      </div>
      
      <div className="text-right text-sm">
        <div className="font-semibold">BIOLEGEND SCIENTIFIC LTD</div>
        <div className="text-xs opacity-90">P.O Box 85988-00200, Nairobi, Kenya</div>
        <div className="text-xs opacity-90">Tel: 0741 207 690/0780 165 490</div>
        <div className="text-xs opacity-90">biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke</div>
        <div className="text-xs opacity-90">Website: www.biolegendscientific.co.ke</div>
      </div>
    </div>
  );
}

export function BiolegendCompanyInfo() {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-semibold">BIOLEGEND SCIENTIFIC LTD</span>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <div>P.O Box 85988-00200, Nairobi, Kenya</div>
        <div>Tel: 0741 207 690/0780 165 490</div>
        <div>Email: biolegend@biolegendscientific.co.ke/info@biolegendscientific.co.ke</div>
        <div>Website: www.biolegendscientific.co.ke</div>
        <div className="text-xs italic text-primary/70">Delivering Discoveries.... and more</div>
      </div>
    </div>
  );
}
