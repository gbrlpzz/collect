import { useState } from "react";
import { strToU8, zipSync } from "fflate";
import { PACKAGE_FILES } from "./packageData";
import { Icon } from "../components/Icon";
import { downloadZip } from "../lib/download";

/**
 * Interactive checkpoint-package browser.
 * Directly explores the canonical demo research archive specification (docs/export-format.md).
 */
function FileTypeIcon({ path }: { path: string }) {
  if (path.endsWith("/")) return <Icon name="folder" size={15} />;
  if (
    path.endsWith(".json") ||
    path.endsWith(".jsonl") ||
    path.endsWith(".geojson")
  )
    return <Icon name="file" size={15} />;
  if (path.endsWith(".csv")) return <Icon name="sliders" size={15} />;
  return <Icon name="file" size={15} />;
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

  const downloadDemoArchive = () => {
    const entries: Record<string, Uint8Array> = {};
    for (const file of PACKAGE_FILES) {
      if (file.path.endsWith("/")) continue;
      entries[file.path] = strToU8(file.content);
    }
    const archive = zipSync(entries, { level: 0 });
    downloadZip(archive, "valpuesta_checkpoint-2026-08-04.zip");
  };

  // Group files into root and folders
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
      {/* File List Pane */}
      <div
        className="hp-package-tree"
        role="tree"
        aria-label="Export package files"
      >
        <div className="hp-package-heading">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <Icon name="archive" size={15} />
            <span
              style={{
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              valpuesta_checkpoint-2026-08-04.zip
            </span>
          </div>
          <button
            type="button"
            className="hp-package-copy-btn"
            onClick={downloadDemoArchive}
            aria-label="Download demo archive ZIP"
            title="Download ZIP"
          >
            <Icon name="download" size={13} />
            <span>ZIP</span>
          </button>
        </div>

        <div className="hp-package-list">
          {/* Root files (e.g. manifest.json, datacite.json) */}
          {rootFiles
            .filter((f) => !f.path.endsWith("/"))
            .map((file) => {
              const isActive = file.path === activePath;
              return (
                <button
                  type="button"
                  className={`hp-package-file ${isActive ? "hp-package-file-active" : ""}`}
                  key={file.path}
                  onClick={() => setActivePath(file.path)}
                >
                  <FileTypeIcon path={file.path} />
                  <span className="hp-package-file-name">{file.path}</span>
                </button>
              );
            })}

          {/* Folder groups */}
          {folders.map((folder) => {
            const filesInFolder = PACKAGE_FILES.filter(
              (f) => f.path.startsWith(`${folder}/`) && !f.path.endsWith("/"),
            );
            return (
              <div className="hp-package-group" key={folder}>
                <div className="hp-package-folder">
                  <Icon name="folder" size={14} />
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
                      <FileTypeIcon path={file.path} />
                      <span className="hp-package-file-name">{name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Media folder item */}
          {rootFiles
            .filter((f) => f.path.endsWith("/"))
            .map((file) => {
              const isActive = file.path === activePath;
              return (
                <button
                  type="button"
                  className={`hp-package-file ${isActive ? "hp-package-file-active" : ""}`}
                  key={file.path}
                  onClick={() => setActivePath(file.path)}
                >
                  <FileTypeIcon path={file.path} />
                  <span className="hp-package-file-name">{file.path}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Code / Content Viewer Pane */}
      <div className="hp-package-pane">
        <div className="hp-package-file-heading">
          <div className="hp-package-file-title">
            <span className="hp-package-file-path">{active.path}</span>
          </div>
          <button
            type="button"
            className="hp-package-copy-btn"
            onClick={copyContent}
            aria-label="Copy file contents"
          >
            <Icon name={copied ? "check" : "file"} size={13} />
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <pre className="hp-package-code">
          <code>{active.content}</code>
        </pre>
      </div>
    </div>
  );
}
