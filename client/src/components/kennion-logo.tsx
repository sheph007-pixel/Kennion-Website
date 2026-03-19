import { Link } from "wouter";

interface KennionLogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

export function KennionLogo({ size = "md", linkTo = "/" }: KennionLogoProps) {
  const content = (
    <img
      src="https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/5004437337/logo/qGPs3ykt503dCIwP_qHVHmcxV3JVHXZucQ.png"
      alt="Kennion Benefit Advisors"
      className="cursor-pointer h-auto"
      data-testid="logo-kennion"
    />
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}
