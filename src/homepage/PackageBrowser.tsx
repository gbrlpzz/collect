import { useState } from "react";
import { PACKAGE_FILES, type PackageFile } from "./packageData";

/**
 * Interactive checkpoint-package browser. Content comes from packageData,
 * which derives everything from the canonical demo dataset in the repo.
 */
const bytes = (n: number) =>
  n >= 1024 ? (n / 1024).toFixed(1) + " KB" : n + " B";

function FileIcon({ file }: { file: PackageFile }) {
  const path = file.path;
  const isFolder = path.endsWith("/");
  if (isFolder) {
    return (
      <svg
        className="hp-package-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
      </svg>
    );
  }
  if (path.endsWith(".geojson")) {
    return (
      <svg
        className="hp-package-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    );
  }
  if (path.endsWith(".csv")) {
    return (
      <svg
        className="hp-package-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    );
  }
  if (path.endsWith(".md")) {
    return (
      <svg
        className="hp-package-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }
  return (
    <svg
      className="hp-package-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2M8 17h4" />
    </svg>
  );
}

export function PackageBrowser() {
  const [activePath, setActivePath] = useState(PACKAGE_FILES[0].path);
  const [copied, setCopied] = useState(false);

  const active =
    PACKAGE_FILES.find((file) => file.path === activePath) ?? PACKAGE_FILES[0];

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(active.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  // Group files: root files (no slash in path) and folder groups
  const rootFiles = PACKAGE_FILES.filter(
    (file) => !file.path.includes("/") || file.path.endsWith("/"),
  );
  const folders = [
    ...new Set(
      PACKAGE_FILES.filter(
        (file) => file.path.includes("/") && !file.path.endsWith("/"),
      ).map((file) => file.path.split("/")[0]),
    ),
  ];

  return (
    <div className="hp-package">
      <div
        className="hp-package-tree"
        role="tree"
        aria-label="Export package files"
      >
        <div className="hp-package-heading">
          <svg
            className="hp-package-archive-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
          </svg>
          <span>valpuesta_checkpoint-2026-08-04.zip</span>
        </div>

        {/* Root level files like manifest.json */}
        {rootFiles
          .filter((file) => !file.path.endsWith("/"))
          .map((file) => {
            const name = file.path;
            const isActive = file.path === activePath;
            return (
              <button
                type="button"
                className={`hp-package-file ${isActive ? "hp-package-file-active" : ""}`}
                key={file.path}
                onClick={() => setActivePath(file.path)}
              >
                <FileIcon file={file} />
                <span className="hp-package-file-name">{name}</span>
                {file.note && (
                  <em className="hp-package-file-note">{file.note}</em>
                )}
              </button>
            );
          })}

        {/* Folder groups */}
        {folders.map((folder) => {
          const filesInFolder = PACKAGE_FILES.filter(
            (file) =>
              file.path.startsWith(folder + "/") && !file.path.endsWith("/"),
          );
          return (
            <div className="hp-package-group" key={folder}>
              <div className="hp-package-folder">
                <svg
                  className="hp-package-folder-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
                </svg>
                <span>{folder}/</span>
              </div>
              {filesInFolder.map((file) => {
                const name = file.path.split("/").pop() ?? file.path;
                const isActive = file.path === activePath;
                return (
                  <button
                    type="button"
                    className={`hp-package-file hp-package-file-nested ${isActive ? "hp-package-file-active" : ""}`}
                    key={file.path}
                    onClick={() => setActivePath(file.path)}
                  >
                    <FileIcon file={file} />
                    <span className="hp-package-file-name">{name}</span>
                    {file.note && (
                      <em className="hp-package-file-note">{file.note}</em>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Folders as selectable items (e.g. media/) */}
        {rootFiles
          .filter((file) => file.path.endsWith("/"))
          .map((file) => {
            const isActive = file.path === activePath;
            return (
              <button
                type="button"
                className={`hp-package-file ${isActive ? "hp-package-file-active" : ""}`}
                key={file.path}
                onClick={() => setActivePath(file.path)}
              >
                <FileIcon file={file} />
                <span className="hp-package-file-name">{file.path}</span>
                {file.note && (
                  <em className="hp-package-file-note">{file.note}</em>
                )}
              </button>
            );
          })}
      </div>

      <div className="hp-package-pane">
        <div className="hp-package-file-heading">
          <div className="hp-package-file-title">
            <span className="hp-package-file-path">{active.path}</span>
            <span className="hp-package-meta">
              {bytes(new TextEncoder().encode(active.content).length)} ·{" "}
              {active.content.split("\n").length} lines
            </span>
          </div>
          <button
            type="button"
            className="hp-package-copy-btn"
            onClick={copyContent}
            aria-label="Copy file contents"
          >
            {copied ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="hp-package-code">
          <code>{active.content}</code>
        </pre>
      </div>
    </div>
  );
}
