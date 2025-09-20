import { cn } from "@/lib/utils";

interface BiolegendLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  pixelSize?: number;
}

export function BiolegendLogo({ className, size = "md", showText = true, pixelSize }: BiolegendLogoProps) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
  } as const;

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  } as const;

  const boxClass = pixelSize ? undefined : sizeClasses[size];
  const boxStyle = pixelSize ? { width: `${pixelSize}px`, height: `${pixelSize}px` } : undefined;

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {/* Biolegend Logo Image */}
      <div className={cn("relative", boxClass)} style={boxStyle}>
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F0dc223c975394fb180f961daff51284e%2Fc6326902fe5c42489708ae2804c1b10b?format=webp&width=800"
          alt="Biolegend Scientific Ltd Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Company Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-primary", textSizeClasses[size])}>
            BIOLEGEND
          </span>
          <span className={cn("text-xs text-secondary font-medium -mt-1", size === "sm" && "text-[10px]")}>
            SCIENTIFIC LTD
          </span>
        </div>
      )}
    </div>
  );
}
