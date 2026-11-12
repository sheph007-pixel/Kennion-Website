import { Link } from "wouter";

interface KennionLogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

// The PNG is high-res (2x), so size it by height rather than its natural size.
const HEIGHTS = { sm: "h-8", md: "h-11", lg: "h-14" } as const;

export function KennionLogo({ size = "md", linkTo = "/" }: KennionLogoProps) {
  const content = (
    <img
      src="/kennion-logo.png"
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
