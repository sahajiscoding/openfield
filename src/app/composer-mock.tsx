"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MockTab = "video" | "image";

const TABS: Record<
  MockTab,
  { label: string; model: string; chips: string[]; prompt: string }
> = {
  video: {
    label: "Video",
    model: "seedance-2.5",
    chips: ["16:9", "5s", "720p + audio"],
    prompt:
      "A lone projectionist in a flooded art-deco cinema, lantern light on black water, slow dolly in, 35mm grain",
  },
  image: {
    label: "Image",
    model: "soul-2",
    chips: ["4:3", "HD", "enhance on"],
    prompt:
      "Editorial portrait of a jazz singer in a smoke-filled club, single spotlight, medium format, shallow depth of field",
  },
};

const ORDER: MockTab[] = ["video", "image"];

/**
 * Landing-page composer that actually works: tabs switch the demo shot,
 * the prompt is editable, and Generate deep-links into /studio with the
 * model + prompt preselected (see StudioShell query prefill).
 */
export function ComposerMock() {
  const router = useRouter();
  const [tab, setTab] = useState<MockTab>("video");
  const [prompt, setPrompt] = useState(TABS.video.prompt);
  const active = TABS[tab];

  function switchTab(next: MockTab) {
    setTab(next);
    setPrompt(TABS[next].prompt);
  }

  function go() {
    if (!prompt.trim()) return;
    const q = new URLSearchParams({
      model: active.model,
      prompt: prompt.trim().slice(0, 2000),
    });
    router.push(`/studio?${q.toString()}`);
  }

  return (
    <div className="of-composer-mock" aria-label="Try a prompt — opens the studio with this shot loaded">
      <div className="of-mock-tabs" role="tablist" aria-label="Demo shot type">
        {ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`of-mock-tab${tab === id ? " of-mock-tab--on" : ""}`}
            onClick={() => switchTab(id)}
          >
            {TABS[id].label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <div className="of-mock-prompt">
          <label className="of-sr" htmlFor="of-mock-input">
            Demo prompt — edit it, then press Generate
          </label>
          <textarea
            id="of-mock-input"
            className="of-mock-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") go();
            }}
          />
        </div>
        <div className="of-mock-row">
          <span className="of-chip of-chip--lime">{tab === "video" ? "Seedance 2.5" : "Soul 2"}</span>
          {active.chips.map((c) => (
            <span key={c} className="of-chip">{c}</span>
          ))}
          <button type="submit" className="of-generate" disabled={!prompt.trim()}>
            Generate ⏎
          </button>
        </div>
      </form>
    </div>
  );
}
