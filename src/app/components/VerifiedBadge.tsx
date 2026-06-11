import { ShieldCheck } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  exchange?: string;
  walletVerified?: boolean;
}

export function VerifiedBadge({ size = "md", exchange, walletVerified }: VerifiedBadgeProps) {
  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-0.5 gap-1",
    lg: "text-sm px-3 py-1 gap-1.5",
  };
  const iconSizes = { sm: 10, md: 12, lg: 14 };

  if (walletVerified) {
    return (
      <span
        className={`inline-flex items-center rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium whitespace-nowrap ${sizes[size]}`}
      >
        <ShieldCheck size={iconSizes[size]} className="flex-shrink-0" />
        Wallet Verified
      </span>
    );
  }

  if (exchange) {
    return (
      <span
        className={`inline-flex items-center rounded-sm bg-blue-500/10 border border-blue-500/30 text-blue-400 font-medium whitespace-nowrap ${sizes[size]}`}
      >
        <ShieldCheck size={iconSizes[size]} className="flex-shrink-0" />
        API: {exchange}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-sm bg-blue-500/10 border border-blue-500/30 text-blue-400 font-medium whitespace-nowrap ${sizes[size]}`}
    >
      <ShieldCheck size={iconSizes[size]} className="flex-shrink-0" />
      Верифицирован
    </span>
  );
}
