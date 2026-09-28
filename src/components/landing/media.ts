import landingVideo from "./refyn-landing-video.webm.asset.json";

// The local Vite preview doesn't proxy media asset paths; use the hosted preview
// origin while developing, and the same-origin asset path in production.
export const BG_VIDEO = import.meta.env.DEV
  ? `https://id-preview--${landingVideo.project_id}.lovable.app${landingVideo.url}`
  : landingVideo.url;
