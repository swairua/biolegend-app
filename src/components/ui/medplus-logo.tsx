// Compatibility wrapper - redirects to Biolegend logo
import { BiolegendLogo } from './biolegend-logo';

interface MedPlusLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

/**
 * @deprecated Use BiolegendLogo instead
 * This is a compatibility wrapper for the old MedPlus logo
 */
export function MedPlusLogo({ className, size = "md", showText = true }: MedPlusLogoProps) {
  console.warn('MedPlusLogo is deprecated. Please use BiolegendLogo instead.');
  return <BiolegendLogo className={className} size={size} showText={showText} />;
}
