import posthog from "posthog-js";

const CONSENT_KEY = "doroboty-posthog-consent-v1";
const PROJECT_KEY = import.meta.env.VITE_POSTHOG_PROJECT_KEY?.trim() ?? "";
const API_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() ?? "";
let initialized = false;
let consentOverride: AnalyticsConsent | undefined;

export type AnalyticsConsent = "accepted" | "declined" | null;

type PortalScreen =
  | "home"
  | "job_search"
  | "job_detail"
  | "application_form"
  | "applications"
  | "employer_candidates"
  | "employer_jobs"
  | "workspace"
  | "methodology"
  | "privacy"
  | "other";

type PrototypeView = "candidate" | "employer" | "questions";

export type ProductAnalyticsEvent =
  | { name: "portal.screen_viewed"; properties: { screen: PortalScreen } }
  | { name: "portal.application_submitted" }
  | { name: "poznajmy_cie.screen_viewed"; properties: { view: PrototypeView } }
  | { name: "poznajmy_cie.answers_submitted" }
  | { name: "poznajmy_cie.followup_saved" };

function isLocalHost(): boolean {
  return (
    typeof window === "undefined" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  );
}

export function isAnalyticsConfigured(): boolean {
  return (
    !import.meta.env.DEV &&
    import.meta.env.VITE_POSTHOG_ENABLED === "true" &&
    PROJECT_KEY.length > 0 &&
    API_HOST.startsWith("https://") &&
    (!isLocalHost() || import.meta.env.VITE_POSTHOG_ALLOW_LOCAL === "true")
  );
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (consentOverride !== undefined) return consentOverride;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

function initializePostHog(): void {
  if (initialized || !isAnalyticsConfigured()) return;

  try {
    posthog.init(PROJECT_KEY, {
      api_host: API_HOST,
      defaults: "2026-08-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      disable_capture_url_hashes: true,
      person_profiles: "never",
      persistence: "memory",
      before_send: (event) => {
        if (!event) return null;
        const properties = { ...event.properties };
        for (const key of Object.keys(properties)) {
          const normalizedKey = key.toLowerCase();
          if (
            normalizedKey.includes("url") ||
            normalizedKey.includes("path") ||
            normalizedKey.includes("referrer")
          ) {
            delete properties[key];
          }
        }
        return { ...event, properties };
      },
    });
    initialized = true;
  } catch {
    initialized = false;
  }
}

export function initializeAnalyticsFromStoredConsent(): void {
  if (getAnalyticsConsent() === "accepted") initializePostHog();
}

export function acceptAnalyticsConsent(): boolean {
  consentOverride = "accepted";
  let saved = true;
  try {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
  } catch {
    saved = false;
  }

  if (initialized) posthog.opt_in_capturing({ captureEventName: false });
  else initializePostHog();
  return saved;
}

export function declineAnalyticsConsent(): boolean {
  consentOverride = "declined";
  if (initialized) posthog.opt_out_capturing();
  try {
    window.localStorage.setItem(CONSENT_KEY, "declined");
    return true;
  } catch {
    try {
      window.localStorage.removeItem(CONSENT_KEY);
    } catch {
      // Keep the in-memory refusal active if persistent storage is unavailable.
    }
    return false;
  }
}

export function captureProductEvent(event: ProductAnalyticsEvent): void {
  if (getAnalyticsConsent() !== "accepted" || !isAnalyticsConfigured()) return;
  initializePostHog();
  if (!initialized) return;

  if ("properties" in event) posthog.capture(event.name, event.properties);
  else posthog.capture(event.name);
}
