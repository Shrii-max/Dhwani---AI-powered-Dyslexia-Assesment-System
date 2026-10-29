# Microphone access

Dhwani uses the browser `MediaRecorder` and `getUserMedia` APIs. It never
simulates a successful recording.

## Figma Make preview

The Make preview is embedded in a host-controlled iframe. When that iframe's
permissions policy does not include `microphone`, Chromium reports:

> Permissions policy violation: microphone is not allowed in this document.

Application code and browser/Windows permission changes cannot override an
iframe permissions policy. Dhwani detects this case and does not label it as a
normal site-permission denial.

Use one of these top-level contexts for recording:

1. Open the published/deployed Dhwani URL directly in a new browser tab.
2. Run the project locally with `pnpm install` and `pnpm dev`, then open its
   localhost URL directly rather than embedding it in another page.

Microphone APIs require HTTPS, except that browsers treat `localhost` as a
secure context.
