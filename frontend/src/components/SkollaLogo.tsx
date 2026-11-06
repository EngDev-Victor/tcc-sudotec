export function SkollaLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top-right S-wing with fold tip */}
      <path
        d="M 10 58 L 10 28 Q 10 10 28 10 L 74 10 L 90 4 L 88 26 Q 86 42 68 44 L 34 44 Q 18 44 18 58 Z"
        fill="#F5C200"
      />
      {/* Bottom-left S-wing with fold tip */}
      <path
        d="M 90 42 L 90 72 Q 90 90 72 90 L 26 90 L 10 96 L 12 74 Q 14 58 32 56 L 66 56 Q 82 56 82 42 Z"
        fill="#F5C200"
      />
      {/* Dark hexagonal face — rendered on top of both wings */}
      <path
        d="M 36 30 L 64 30 L 72 38 L 72 62 L 64 70 L 36 70 L 28 62 L 28 38 Z"
        fill="#1A1818"
      />
      {/* Left eye — tall vertical pill */}
      <rect x="31" y="39" width="14" height="22" rx="7" fill="#F5C200" />
      {/* Right eye — tall vertical pill */}
      <rect x="55" y="39" width="14" height="22" rx="7" fill="#F5C200" />
    </svg>
  );
}

export function SkollaLogo({ white = false }: { white?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <SkollaLogoMark size={36} />
      <div>
        <p
          className={`text-lg font-black tracking-widest leading-none ${
            white ? "text-white" : "text-[#0D2C3A]"
          }`}
        >
          SKOLLA
        </p>
        <p
          className={`text-[9px] font-semibold tracking-wider uppercase leading-none mt-0.5 ${
            white ? "text-white/50" : "text-muted-foreground"
          }`}
        >
          Plataforma Escolar
        </p>
      </div>
    </div>
  );
}