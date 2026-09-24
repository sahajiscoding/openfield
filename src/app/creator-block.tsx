"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateTab = "video" | "image";

const TABS: Record<CreateTab, { label: string; model: string; modelLabel: string; prompt: string }> = {
  video: {
    label: "Video",
    model: "seedance-2.5",
    modelLabel: "Seedance 2.5",
    prompt: "A lone traveler crossing a neon night market in the rain, cinematic dolly-in, anamorphic glow",
  },
  image: {
    label: "Image",
    model: "soul-2",
    modelLabel: "Soul 2",
    prompt: "Editorial portrait of a jazz singer in a smoke-filled club, single spotlight, medium format",
  },
};
const ORDER: CreateTab[] = ["video", "image"];

const QUICK_LINKS = [
  { label: "Reference to video", href: "/studio?model=seedance-2.5" },
  { label: "Image editing", href: "/studio?model=soul-2" },
  { label: "Your library", href: "/studio" },
];

/* Thumbnails reuse royalty-free Pexels posters (same pool as Featured). */
const TILES = [
  {
    label: "Image",
    sub: "Soul 2",
    href: "/studio?model=soul-2",
    img: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    label: "Video",
    sub: "Seedance 2.5",
    href: "/studio?model=seedance-2.5",
    img: "https://images.pexels.com/photos/3624368/pexels-photo-3624368.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    label: "Edit",
    sub: "Qwen Image 3",
    href: "/studio?model=soul-2",
    img: "https://images.pexels.com/photos/2050297/pexels-photo-2050297.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    label: "Models",
    sub: "44 models",
    href: "/#pricing",
    img: "https://images.pexels.com/photos/6431040/pexels-photo-6431040.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
];

export function CreatorBlock() {
  const router = useRouter();
  const [tab, setTab] = useState<CreateTab>("video");
  const [prompt, setPrompt] = useState(TABS.video.prompt);
  const active = TABS[tab];

  function switchTab(next: CreateTab) {
    setTab(next);
    setPrompt(TABS[next].prompt);
  }

  function go() {
    const text = prompt.trim() || active.prompt;
    const q = new URLSearchParams({ model: active.model, prompt: text.slice(0, 2000) });
    router.push(`/studio?${q.toString()}`);
  }

  return (
    <section className="of-wrap of-create" aria-labelledby="create-h">
      <div className="of-create-toggle" role="tablist" aria-label="What to create">
        {ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`of-create-pill${tab === id ? " of-create-pill--on" : ""}`}
            onClick={() => switchTab(id)}
          >
            {TABS[id].label}
          </button>
        ))}
      </div>

      <h2 id="create-h" className="of-create-title">
        What do you want to create?
      </h2>

      <div className="of-create-grid">
        <div className="of-create-left">
          <form
            className="of-create-box"
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
          >
            <label className="of-sr" htmlFor="of-create-input">
              Describe a scene, or start with a reference
            </label>
            <textarea
              id="of-create-input"
              className="of-create-input"
              rows={4}
              placeholder="Describe a scene, or start with a reference..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") go();
              }}
            />
            <div className="of-create-bar">
              <span className="of-create-attach" aria-hidden="true">
                ⌁
              </span>
              <span className="of-create-model">
                {active.modelLabel} <span aria-hidden="true">›</span>
              </span>
              <span className="of-create-count">44 models</span>
              <button type="submit" className="of-create-go">
                Open studio <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
          <div className="of-create-links">
            {QUICK_LINKS.map((l) => (
              <a key={l.label} className="of-create-link" href={l.href}>
                {l.label} <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </div>

        <div className="of-create-tiles">
          {TILES.map((t) => (
            <a key={t.label} className="of-create-tile" href={t.href} aria-label={`Open ${t.label} in the studio`}>
              <span className="of-create-thumb" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt="" loading="lazy" />
              </span>
              <span className="of-create-tile-t">{t.label}</span>
              <span className="of-create-tile-s">{t.sub}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
