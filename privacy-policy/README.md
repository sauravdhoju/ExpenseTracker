# ETracko — Privacy Policy site

A self-contained static page (plain HTML + CSS, no build step). Move this whole folder anywhere.

```
privacy-policy/
├── index.html      the policy
├── styles.css      styles (brand colours, light/dark, mobile-friendly)
├── assets/         app icon + favicon
└── .nojekyll       tells GitHub Pages to serve files as-is
```

## Deploy on GitHub Pages

1. Create a repository, e.g. `etracko-privacy`, and push the **contents** of this folder to its root.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. After a minute it is live at `https://<your-username>.github.io/etracko-privacy/`.

Use that URL as the privacy-policy link in the Google Play Console and in the Google Cloud OAuth consent screen.

## Updating

Edit `index.html`, change the "Effective" date in the header, commit and push.
