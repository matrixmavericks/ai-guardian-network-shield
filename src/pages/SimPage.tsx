import React, { Suspense, lazy, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SpaceShell } from "@/components/spaces/ui";
import { simById } from "@/components/sims/registry";

const cache = new Map<string, React.LazyExoticComponent<React.ComponentType>>();

/** One simulation, loaded on demand. */
const SimPage: React.FC = () => {
  const { id = "" } = useParams();
  const meta = simById(id);
  const Sim = useMemo(() => {
    if (!meta) return null;
    if (!cache.has(meta.id)) cache.set(meta.id, lazy(meta.load));
    return cache.get(meta.id)!;
  }, [meta]);
  if (!meta || !Sim) {
    return (
      <SpaceShell>
        <div className="m-auto max-w-[420px] p-6 text-center">
          <p className="text-[17px] font-semibold text-white">That simulation doesn't exist</p>
          <Link to="/sims" className="mt-3 inline-flex text-[13.5px] text-lp-sky hover:underline">See all simulations</Link>
        </div>
      </SpaceShell>
    );
  }
  return (
    <Suspense fallback={<SpaceShell><div className="m-auto flex items-center gap-2 text-[13.5px] text-lp-mute"><Loader2 className="h-5 w-5 animate-spin text-lp-sky" /> Loading {meta.title}…</div></SpaceShell>}>
      <Sim key={meta.id} />
    </Suspense>
  );
};

export default SimPage;
