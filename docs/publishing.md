# Publishing

How to prepare and publish your extension to the Chrome Web Store.

## 1) Production build

```bash
pnpm clean
pnpm build
```

Artifacts will be in `packages/extension/dist/`.

## 2) Verify

- Open `chrome://extensions`, load the `dist/` folder
- Test core flows (popup opens, background events, content script injection)
- Check DevTools for errors

## 3) Versioning

- Bump `version` in the repo root `package.json` (used in the manifest)
- Optionally bump `displayName` or `name` in `packages/extension/package.json`

## 4) Create a ZIP

Zip the contents of `packages/extension/dist/` (the files inside, not the folder itself) and upload to the Chrome Web Store dashboard.

On macOS:

```bash
cd packages/extension/dist
zip -r ../extension.zip .
```

## 5) Submission checklist

- Manifest uses only the permissions you need
- All icons present: 16, 48, 128 (PNG)
- No console errors or uncaught exceptions
- Clear description and screenshots for the store listing

## 6) Updates

- Bump the root `version`
- Rebuild and re-zip `dist/`
- Submit as an update in the developer dashboard
