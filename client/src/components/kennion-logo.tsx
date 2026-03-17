import { Link } from "wouter";

interface KennionLogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

export function KennionLogo({ size = "md", linkTo = "/" }: KennionLogoProps) {
  // Fixed 200px width as requested
  const logoWidth = 200;

  const content = (
    <div className="cursor-pointer" data-testid="logo-kennion">
      <svg
        width={logoWidth}
        viewBox="0 0 200 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Blue rounded square icon */}
        <rect
          x="2"
          y="2"
          width="46"
          height="46"
          rx="8"
          fill="#2563EB"
        />
        {/* kennion text */}
        <text
          x="60"
          y="28"
          fontFamily="sans-serif"
          fontSize="20"
          fontWeight="600"
          fill="currentColor"
        >
          kennion
        </text>
        {/* Benefit Advisors text */}
        <text
          x="60"
          y="42"
          fontFamily="sans-serif"
          fontSize="10"
          fill="#2563EB"
        >
          Benefit Advisors
        </text>
      </svg>
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}
