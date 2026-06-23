import Link from "next/link";

export type Crumb = { label: string; href?: string };

/** A trail of links back up the navigation hierarchy. The last item is the
 *  current page (rendered as plain text). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1.5">
      <ol className="flex flex-wrap items-center gap-1.5 type-body-xs text-subtle">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="focus-ring rounded transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? "text-muted" : undefined}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last && (
                <span aria-hidden className="text-subtle/50">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-line bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
        <h1 className="type-title-h5 text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl type-body-sm text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A back link rendered under the page header, above the page content. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="focus-ring -ml-1 mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 type-label-sm text-muted transition-colors hover:text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}

/** Standard page content padding wrapper. */
export function PageBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-6 py-6 sm:px-8 ${className}`}>{children}</div>;
}
