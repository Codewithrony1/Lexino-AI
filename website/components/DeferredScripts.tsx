type DeferredScriptsProps = {
  scripts: string[];
};

/**
 * Emits plain `<script defer>` tags into the server-rendered HTML.
 *
 * The previous approach appended these scripts from a `useEffect`, which meant
 * the browser could not discover them until React had downloaded, parsed and
 * hydrated - and they were then fetched one at a time, awaiting each `onload`.
 * Rendering real tags lets the browser start all the downloads while it is still
 * parsing the document, in parallel with CSS and fonts.
 *
 * `defer` preserves execution order (guaranteed by the HTML spec) and runs the
 * scripts after the DOM is parsed but before `DOMContentLoaded` fires, so
 * scripts that register `DOMContentLoaded` listeners still work.
 */
export function DeferredScripts({ scripts }: DeferredScriptsProps) {
  return (
    <>
      {scripts.map((src) => (
        <script key={src} src={src} defer />
      ))}
    </>
  );
}
