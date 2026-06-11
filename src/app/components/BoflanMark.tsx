/**
 * Фирменный знак BOFLAN из загруженного макета (PNG), в скруглённой подложке.
 */
export function BoflanMark({
  size = 32,
  className = "",
  "aria-label": ariaLabel = "BOFLAN",
}: {
  size?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden bg-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-2 ring-white/20 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <img
        src="/boflan-logo.png"
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-cover scale-[1.02]"
        draggable={false}
      />
    </div>
  );
}
