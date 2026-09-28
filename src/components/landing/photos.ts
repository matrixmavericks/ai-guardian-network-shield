// Every photo on the landing page lives here, so swapping one is a one-line change.
// These come from Unsplash (free to use under the Unsplash License). Real photos
// from your own classrooms will always beat stock — drop them in /public and
// point `src` at them (e.g. "/photos/hero.jpg"), keeping a similar crop.

export type LandingPhoto = {
  /** Unsplash photo id (the part after "photo-") or an absolute/local URL */
  src: string;
  alt: string;
  /** CSS object-position, to keep faces in frame when the crop changes */
  position?: string;
};

export const photos = {
  hero: {
    src: "1509062522246-3755977927d7",
    alt: "Students working together at their desks in a classroom",
    position: "50% 40%",
  },
  classroom: {
    src: "1577896851231-70ef18881754",
    alt: "A teacher leading a lesson with her students",
    position: "50% 35%",
  },
  studyGroup: {
    src: "1427504494785-3a9ca7044f45",
    alt: "Students studying together",
    position: "50% 50%",
  },
} satisfies Record<string, LandingPhoto>;

const isUnsplashId = (src: string) => /^\d{10,}-[0-9a-f]+$/.test(src);

export const photoUrl = (src: string, width: number) =>
  isUnsplashId(src)
    ? `https://images.unsplash.com/photo-${src}?auto=format&fit=crop&w=${width}&q=72`
    : src;

export const photoSrcSet = (src: string, widths: number[]) =>
  isUnsplashId(src) ? widths.map((w) => `${photoUrl(src, w)} ${w}w`).join(", ") : undefined;
