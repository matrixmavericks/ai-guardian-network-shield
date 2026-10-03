import { lazy, type ComponentType } from "react";

// Route components that load on first visit, so the first page is small. Each
// can also be fetched ahead of time (see Prefetch in App).

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- pages take any props
type Loader = () => Promise<{ default: ComponentType<any> }>;
export type Page = ReturnType<typeof page>;

const RELOAD_KEY = "refyn-chunk-reload";

export const page = (load: Loader) => {
  let pending: ReturnType<Loader> | null = null;
  const fetchOnce = () =>
    (pending ??= load().catch((err) => {
      pending = null;
      throw err;
    }));

  const Component = lazy(() =>
    fetchOnce().catch((err) => {
      // A new version went live since this tab opened, so its old files are gone: reload once to pick up the new ones
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          return new Promise<never>(() => {});
        }
      } catch {
        /* no storage: fall through to the error */
      }
      throw err;
    }),
  );
  return Object.assign(Component, { preload: () => fetchOnce().catch(() => undefined) });
};
