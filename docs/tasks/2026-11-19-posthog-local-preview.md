# PostHog local preview

## Intent and acceptance criteria

Allow the user to verify the prepared PostHog integration in a local production preview, using their EU project and synthetic data. Collection still requires an enabled build, project key, HTTPS host and browser consent. Local collection requires the separate `VITE_POSTHOG_ALLOW_LOCAL=true` build flag; Vite development mode remains excluded. The flag is false by default.

## Verification

The repository-wide `./scripts/verify` stopped at the existing `FEATURES.md` formatting check. The configured preview build succeeded. A browser check loaded the PostHog configuration, but the SDK dropped automated browser events as bot traffic; delivery of an event must still be verified by a person. The project key is public but is supplied only to the local build environment and is not recorded here.
