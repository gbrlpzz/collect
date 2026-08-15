// Two installable identities share this shell. The role is fixed before
// React paints so the PWA chrome never follows the device appearance.
// Kept as a plain blocking script (external file, no modules) so the
// Content-Security-Policy can require script-src 'self' without hashes.
(function () {
  var role = new URLSearchParams(window.location.search).get("role");
  var admin = role === "admin";
  var surface = admin ? "admin" : "contributor";
  document.documentElement.dataset.collectSurface = surface;
  document.documentElement.style.colorScheme = admin ? "dark" : "light";

  var manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = admin ? "/manifest-admin.webmanifest" : "/manifest.webmanifest";
  document.head.appendChild(manifest);

  var theme = document.createElement("meta");
  theme.name = "theme-color";
  theme.content = admin ? "#000000" : "#f5f5f7";
  document.head.appendChild(theme);

  var statusBar = document.createElement("meta");
  statusBar.name = "apple-mobile-web-app-status-bar-style";
  statusBar.content = admin ? "black-translucent" : "default";
  document.head.appendChild(statusBar);

  var touch = document.createElement("link");
  touch.rel = "apple-touch-icon";
  touch.href = admin ? "/apple-touch-icon-admin.png" : "/apple-touch-icon.png";
  document.head.appendChild(touch);

  var icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/svg+xml";
  icon.href = admin ? "/icon-admin.svg" : "/icon.svg";
  document.head.appendChild(icon);

  var title = document.createElement("meta");
  title.name = "apple-mobile-web-app-title";
  title.content = admin ? "collect Admin" : "collect";
  document.head.appendChild(title);
  document.title = admin
    ? "collect Admin — field operations"
    : "collect — trustworthy field evidence, offline on any phone";
})();
