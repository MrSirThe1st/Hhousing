import Link from "next/link";

export interface CreateSuccessLink {
  href: string;
  label: string;
}

interface CreateSuccessBannerProps {
  message: string;
  links?: CreateSuccessLink[];
  className?: string;
}

/**
 * Shared success feedback after create/upload: stay on page, clear form, optional next-step links.
 */
export default function CreateSuccessBanner({
  message,
  links = [],
  className = ""
}: CreateSuccessBannerProps): React.ReactElement {
  return (
    <div
      className={`rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 ${className}`.trim()}
      role="status"
    >
      <p>{message}</p>
      {links.length > 0 ? (
        <p className="mt-2">
          {links.map((link, index) => (
            <span key={`${link.href}-${link.label}`}>
              {index > 0 ? " · " : null}
              <Link
                href={link.href}
                className="font-medium text-green-800 underline hover:no-underline"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
