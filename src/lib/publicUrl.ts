export const getPublicAppBaseUrl = (): string => {
  const configuredUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (typeof window === "undefined") return "";

  // Preview URLs require Lovable access, so use published URL for share links
  if (window.location.hostname.includes("id-preview--")) {
    return "https://ai-guardian-network-shield.lovable.app";
  }

  return window.location.origin;
};

export const getPortfolioShareUrl = (token: string): string => {
  return `${getPublicAppBaseUrl()}/portfolio/shared/${token}`;
};
