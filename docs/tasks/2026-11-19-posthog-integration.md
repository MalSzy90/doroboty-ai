# PostHog event analytics and MCP access

## Request and intent

The user asked to connect the DoRoboty.ai application and the Poznajmy Cię prototype to PostHog through MCP. In this repository, both experiences are part of one Vite application and can be separated by event-name prefixes in one PostHog project.

## Acceptance criteria

- Event capture is disabled unless an HTTPS PostHog host, project key and explicit build flag are present.
- Capture starts only after a visitor separately opts in on the privacy page; that choice can be revoked.
- Only a fixed list of screen and completed-action events is sent. No answer text, CV content, names, record IDs or URL/path/referrer properties are captured. PostHog may receive the request IP and basic browser/session metadata. Automatic clicks/autocapture, built-in pageviews/pageleave, exceptions, surveys, feature-flag requests and session recordings are disabled; screen categories are custom events.
- The Vite development build and localhost never send events.
- The app and prototype expose separate event prefixes.
- The existing Codex/PostHog MCP connection is configured only if organization policy permits it.

## Implementation

- Added `posthog-js` 1.450.0 and environment placeholders in `.env.example`; no project key or host has been supplied.
- `src/lib/analytics.ts` applies explicit consent, allowlisted event types, memory-only SDK persistence, URL-property filtering and disabled autocapture, pageviews, pageleave, exception capture, surveys, feature flags, person profiles and session replay.
- The portal emits coarse screen categories and `portal.application_submitted`. Poznajmy Cię emits `poznajmy_cie.screen_viewed`, `poznajmy_cie.answers_submitted` and `poznajmy_cie.followup_saved`.
- The privacy page offers accept/revoke controls only when the build is configured. With the current build configuration, it reports that analytics is off.
- `FEATURES.md` records this contract and its limits.

## MCP status and remaining setup

PostHog plugin discovery returned `DISABLED_BY_ADMIN`, `NOT_AVAILABLE` and `installed: false`. The Codex MCP connection is therefore not configured; this managed restriction was not bypassed. PostHog's JavaScript SDK collects application events, while its hosted MCP server gives an agent access to PostHog; these are separate integrations. The current app has no PostHog project credentials, so it sends no events.

To finish the requested end-to-end connection, an organization administrator must enable PostHog for Codex. Separately, configure the PostHog project key, HTTPS host and `VITE_POSTHOG_ENABLED=true` in the build environment, then verify the named events after opting in. Review the participant-facing privacy notice before using a live deployment.

## Sources and verification

- [PostHog MCP documentation](https://posthog.com/docs/model-context-protocol): hosted MCP endpoint and supported Codex client.
- [PostHog JavaScript Web SDK documentation](https://posthog.com/docs/libraries/js): browser SDK initialization and capture configuration.
- Package installation completed from npm's public registry; npm reported 0 vulnerabilities for the installed dependency tree. No application tests, build or browser checks were run for this change.
