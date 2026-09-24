"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FEATURED, type FeaturedItem } from "./featured-media";

function FeaturedVideo({
  poster,
  src,
  label,
  pausedAll,
}: {
  poster: string;
  src: string;
  label: string;
  pausedAll: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pausedRef = useRef(pausedAll);
  pausedRef.current = pausedAll;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (pausedAll) {
      video.pause();
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") {
      video.play().catch(() => undefined);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLVideoElement;
          if (pausedRef.current) {
            target.pause();
            continue;
          }
          if (entry.isIntersecting) {
            target.play().catch(() => undefined);
          } else {
            target.pause();
          }
        }
      },
      { threshold: 0.25, rootMargin: "60px" }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src, pausedAll]);

  return (
    <video
      ref={videoRef}
      className="of-feat-video"
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      poster={poster}
      src={src}
      aria-label={label}
    />
  );
}

function FeaturedCard({ item, pausedAll }: { item: FeaturedItem; pausedAll: boolean }) {
  const label = `${item.name} — ${item.kind}. Open in studio.`;
  return (
    <div className="of-feat-item">
      <a
        href="/studio"
        className="of-feat-card"
        aria-label={label}
        onMouseEnter={(e) => {
          if (!pausedAll) e.currentTarget.querySelector("video")?.play().catch(() => undefined);
        }}
      >
        <span className="of-feat-media">
          {item.video ? (
            <FeaturedVideo poster={item.poster} src={item.video} label={item.name} pausedAll={pausedAll} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="of-feat-video" src={item.poster} alt={item.name} loading="lazy" />
          )}
          <span className="of-feat-shade" aria-hidden="true" />
          <span className="of-feat-badge">{item.kind}</span>
          <span className="of-feat-text">
            <span className="of-feat-title">{item.name}</span>
            <span className="of-feat-tagline">{item.tagline}</span>
          </span>
          <span className="of-feat-glyph" aria-hidden="true">
            ↗
          </span>
        </span>
      </a>
      <p className="of-feat-caption">
        <span>{item.vendor}</span>
        <span aria-hidden="true">|</span>
        <span>{item.price}</span>
      </p>
    </div>
  );
}

export function FeaturedRail() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [pausedAll, setPausedAll] = useState(false);

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(".of-feat-item");
    const step = card ? card.offsetWidth + 18 : Math.round(rail.clientWidth * 0.8);
    rail.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  const items: FeaturedItem[] = Array.isArray(FEATURED) ? FEATURED : [];
  if (items.length === 0) return null;

  return (
    <section className="of-feat" aria-labelledby="of-feat-h">
      <div className="of-wrap of-feat-head">
        <p className="of-kicker of-feat-kicker">Featured</p>
        <h2 id="of-feat-h" className="of-feat-title-h">
          Featured models
        </h2>
        <div className="of-feat-arrows">
          <button
            type="button"
            className="of-feat-arrow-btn"
            onClick={() => setPausedAll((p) => !p)}
            aria-pressed={pausedAll}
            aria-label={pausedAll ? "Play all preview videos" : "Pause all preview videos"}
          >
            <span aria-hidden="true">{pausedAll ? "▶" : "⏸"}</span>
          </button>
          <button
            type="button"
            className="of-feat-arrow-btn"
            onClick={() => scrollByCard(-1)}
            aria-label="Scroll featured models back"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            className="of-feat-arrow-btn"
            onClick={() => scrollByCard(1)}
            aria-label="Scroll featured models forward"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div ref={railRef} className="of-feat-rail" role="region" aria-label="Featured models carousel" tabIndex={0}>
        {items.map((item) => (
          <FeaturedCard key={item.id} item={item} pausedAll={pausedAll} />
        ))}
      </div>
    </section>
  );
}
