/**
 * Логотип BOFLAN + вращающееся пунктирное кольцо.
 */
export function BoflanLogoLoader({ className = "", size = 40 }: { className?: string; size?: number }) {
  const ring = Math.max(size + 10, 44);
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: ring, height: ring }}
      role="status"
      aria-label="Загрузка"
    >
      <div
        className="absolute rounded-2xl border-2 border-dashed border-white/35 animate-spin"
        style={{
          width: ring,
          height: ring,
          animationDuration: "2.2s",
        }}
      />
      <div
        className="relative rounded-full overflow-hidden bg-white shadow-lg ring-2 ring-white/15"
        style={{ width: size, height: size }}
      >
        <img
          src="/boflan-logo.png"
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    </div>
  );
}
