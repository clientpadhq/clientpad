# ClientPad Promo Video

HyperFrames composition for a short X-ready product demo of ClientPad.

## What it shows

- Preview vs Live mode
- Operator email/password login
- Readiness telemetry
- WhatsApp diagnostics
- Inbox and pipeline operations
- Open-source packaging and install commands

## Render

From this folder:

```bash
npx hyperframes lint
npx hyperframes inspect
npx hyperframes preview
npx hyperframes render --output clientpad-promo.mp4
```

If HyperFrames cannot find FFmpeg, point it at the installed binary before rendering:

```powershell
$env:PATH = "C:\Program Files\ShareX;$env:PATH"
```

Then rerun `npx hyperframes render`.
