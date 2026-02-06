import { Link } from "wouter";

function PeopleGroupIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="24" cy="6" r="5" fill="currentColor" />
      <path
        d="M16 28c0-5.523 3.582-10 8-10s8 4.477 8 10"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="10" cy="9" r="4" fill="currentColor" opacity="0.75" />
      <path
        d="M2 26c0-4.418 3.134-8 7-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
      <circle cx="38" cy="9" r="4" fill="currentColor" opacity="0.75" />
      <path
        d="M46 26c0-4.418-3.134-8-7-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    </svg>
  );
}

interface KennionLogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

export function KennionLogo({ size = "md", linkTo = "/" }: KennionLogoProps) {
  const iconSizes = {
    sm: "h-5 w-auto",
    md: "h-6 w-auto",
    lg: "h-7 w-auto",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const content = (
    <div className="flex items-center gap-2 cursor-pointer" data-testid="logo-kennion">
      <PeopleGroupIcon className={`${iconSizes[size]} text-primary`} />
      <span className={`font-semibold tracking-tight ${textSizes[size]}`}>
        Kennion <span className="font-normal text-muted-foreground">Benefit Advisors</span>
      </span>
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}
