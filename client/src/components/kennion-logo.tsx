import { Link } from "wouter";

interface KennionLogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

// Vector logo: size it by height.
const HEIGHTS = { sm: "h-7", md: "h-9", lg: "h-11" } as const;

export function KennionLogo({ size = "md", linkTo = "/" }: KennionLogoProps) {
  const content = (
    <img
      src="/kennion-logo.svg"
      alt="Kennion Benefit Advisors"
      className={`cursor-pointer w-auto ${HEIGHTS[size]}`}
      data-testid="logo-kennion"
    />
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}
