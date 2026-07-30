interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 28 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Sion Legacy Originals"
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 ${className}`}
    />
  );
}
