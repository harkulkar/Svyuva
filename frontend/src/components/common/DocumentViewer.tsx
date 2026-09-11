export function DocumentViewer({
  src,
  title,
  mime,
  canDownload = true
}: {
  src: string;
  title: string;
  mime?: string;
  canDownload?: boolean;
}) {
  // Callers must pass an authorised blob URL or authenticated download URL. Do not use permanent public document links.
  const isPdf = mime === 'application/pdf' || src.toLowerCase().endsWith('.pdf');
  const isImage = Boolean(mime?.startsWith('image/')) || /\.(png|jpe?g|gif|webp)$/i.test(src);

  return (
    <section className="border border-slate-300 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {canDownload ? (
          <a href={src} download className="min-h-11 border border-navy px-3 py-2 text-sm font-semibold text-navy">
            Download
          </a>
        ) : null}
      </div>
      {isPdf ? (
        <iframe title={title} src={src} className="mt-4 h-[70vh] w-full border border-slate-200" />
      ) : null}
      {isImage ? (
        <div className="mt-4 overflow-auto">
          <img src={src} alt={title} className="max-w-full" />
        </div>
      ) : null}
      {!isPdf && !isImage ? (
        <p className="mt-4 text-sm text-slate-700">
          This file type cannot be previewed here.{' '}
          {canDownload ? (
            <a href={src} className="font-semibold text-navy underline">
              Open or download
            </a>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
