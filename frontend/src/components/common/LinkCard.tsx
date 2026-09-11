type LinkCardProps = {
  title: string;
  href: string;
  description?: string;
  external?: boolean;
};

export function LinkCard({ title, href, description, external }: LinkCardProps) {
  const extra = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <a
      href={href}
      {...extra}
      className="block h-full border border-slate-300 bg-white p-4 shadow-sm transition hover:border-navy hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
    >
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      {external ? <p className="mt-3 text-xs text-slate-500">Opens in a new tab</p> : null}
    </a>
  );
}
