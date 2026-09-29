/**
 * The Android app (a Trusted Web Activity, package us.refyntech.app) opens
 * refyntech.us/login?app=android in Chrome. Google Play doesn't allow selling
 * plans outside Play billing, so inside the app we hide prices, checkout and
 * upgrade prompts; accounts and plans are handled by schools and the website.
 *
 * The flag lives in sessionStorage so it covers the app's tab only and never
 * leaks into the same person's normal Chrome browsing.
 */
export const ANDROID_PACKAGE = "us.refyntech.app";
const KEY = "refyn-android-app";

const detect = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("app") === "android";
    const fromReferrer = document.referrer.startsWith(`android-app://${ANDROID_PACKAGE}`);
    if (fromUrl || fromReferrer) sessionStorage.setItem(KEY, "1");
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const IN_ANDROID_APP = detect();

if (IN_ANDROID_APP && typeof document !== "undefined") document.documentElement.classList.add("refyn-android-app");

/** Copy shown in the app wherever the website would offer plans or payment. */
export const APP_PLAN_NOTE = "Plans are managed by your school or your Refyn account administrator.";
