import "./studio.css";

/**
 * Instant sheen on the route segment.
 *
 * `/studio` is a dynamic, authenticated route: the server has to read a
 * session and a wallet before it can render anything real. Without a loading
 * boundary the browser keeps showing the previous page for that entire stretch,
 * so a click on "Open studio" reads as a hang. This renders the moment the
 * router commits to the navigation, so the click lands immediately and the
 * studio surface blooms into the same frame it will occupy.
 *
 * It is a skeleton, not a claim: bars and a shimmer, no status language, no
 * invented numbers — and it announces itself to screen readers as a loading
 * state rather than as content.
 */
export default function StudioLoading() {
  return (
    <div className="of-studio-loading" role="status" aria-busy="true" aria-live="polite">
      <span className="of-studio-sr">Loading the studio…</span>

      {/* Mirrors the studio's own bar so the swap does not shift the page. */}
      <div className="of-studio-top" aria-hidden>
        <span className="of-skel of-skel--brand" />
        <span className="of-skel of-skel--balance" />
      </div>

      <div className="of-studio-loading-body" aria-hidden>
        <span className="of-skel of-skel--tabs" />
        <span className="of-skel of-skel--title" />
        <span className="of-skel of-skel--line" />
        <div className="of-studio-loading-dock">
          <span className="of-skel of-skel--prompt" />
          <span className="of-skel of-skel--rail" />
        </div>
      </div>
    </div>
  );
}
