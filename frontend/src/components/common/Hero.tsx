import { useCallback, useEffect, useId, useState } from 'react';
import { HERO_SLIDES } from '../../data/site';

export function Hero() {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = HERO_SLIDES[index] ?? HERO_SLIDES[0];

  const go = useCallback((next: number) => {
    setIndex((next + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => go(index + 1), 7000);
    return () => window.clearInterval(timer);
  }, [go, index, paused]);

  if (!slide) return null;

  return (
    <section
      className="relative overflow-hidden bg-navy-dark"
      aria-roledescription="carousel"
      aria-label="Scheme banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[280px] sm:min-h-[380px] lg:min-h-[460px]">
        {HERO_SLIDES.map((item, i) => (
          <img
            key={item.id}
            src={item.image}
            alt={item.alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        <div className="absolute inset-0 bg-navy-dark/55" />
        <div className="relative z-10 mx-auto flex min-h-[280px] max-w-6xl flex-col justify-end px-4 py-10 sm:min-h-[380px] lg:min-h-[460px]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-saffron">Government of Maharashtra</p>
          <h1 className="mt-2 max-w-3xl text-2xl font-semibold text-white sm:text-4xl">Swami Vivekananda Yuva Suraksha Yojana</h1>
          <p id={`${id}-quote`} className="mt-4 max-w-2xl text-sm italic text-blue-50 sm:text-lg" aria-live="polite">
            {slide.quote}
          </p>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        <button type="button" className="bg-white/90 px-3 py-2 text-sm font-semibold text-navy hover:bg-white" onClick={() => go(index - 1)} aria-label="Previous banner">
          Previous
        </button>
        <button type="button" className="bg-white/90 px-3 py-2 text-sm font-semibold text-navy hover:bg-white" onClick={() => go(index + 1)} aria-label="Next banner">
          Next
        </button>
      </div>
      <div className="absolute bottom-4 left-4 z-10 flex gap-2" role="tablist" aria-label="Banner slides">
        {HERO_SLIDES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show banner ${i + 1}`}
            className={`h-2.5 w-8 ${i === index ? 'bg-saffron' : 'bg-white/60'}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
