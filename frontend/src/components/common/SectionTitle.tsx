type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  as?: 'h2' | 'h3';
};

export function SectionTitle({ eyebrow, title, as: Tag = 'h2' }: SectionTitleProps) {
  return (
    <div className="mb-6">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-widest text-saffron">{eyebrow}</p> : null}
      <Tag className="text-2xl font-semibold text-navy-dark">{title}</Tag>
      <div className="mt-2 h-1 w-16 bg-saffron" />
    </div>
  );
}
