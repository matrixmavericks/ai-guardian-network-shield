export const getPublicAppBaseUrl = (): string => {
  const configuredUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (typeof window === "undefined") return "";

  // Always use the primary custom domain for share links
  return "https://refyntech.us";
};

export const getPortfolioShareUrl = (token: string): string => {
  return `${getPublicAppBaseUrl()}/portfolio/shared/${token}`;
};
