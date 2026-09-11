type PageBannerProps = {
  title: string;
  subtitle?: string;
};

export function PageBanner({ title, subtitle }: PageBannerProps) {
  return (
    <div className="border-b-4 border-saffron bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-saffron">SV Yuva Suraksha Yojana</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-blue-100 sm:text-base">{subtitle}</p> : null}
      </div>
    </div>
  );
}
