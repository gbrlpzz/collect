import { useEffect, useState } from "react";
import { PACKAGE_FILES } from "./packageData";

/**
 * Interactive checkpoint-package browser. Content comes from packageData,
 * which derives everything from the canonical demo dataset in the repo.
 */
const bytes = (n: number) =>
  n >= 1024 ? (n / 1024).toFixed(1) + " KB" : n + " B";

export function PackageBrowser() {
  const [activePath, setActivePath] = useState(PACKAGE_FILES[0].path);

  const active =
    PACKAGE_FILES.find((file) => file.path === activePath) ?? PACKAGE_FILES[0];

  // Render the tree: folders, then files, in package order.
  const folders = [
    ...new Set(PACKAGE_FILES.map((file) => file.path.split("/")[0])),
  ];

  return (
    <div className="hp-package">
      <div
        className="hp-package-tree"
        role="tree"
        aria-label="Export package files"
      >
        <div className="hp-package-heading">
          valpuesta_checkpoint-2026-08-04.zip
        </div>
        {folders.map((folder) => (
          <div key={folder}>
            <div className="hp-package-folder">{folder}/</div>
            {PACKAGE_FILES.filter(
              (file) =>
                file.path.startsWith(folder + "/") ||
                file.path === folder + "/",
            ).map((file) => {
              const name = file.path.endsWith("/")
                ? file.path
                : (file.path.split("/").pop() ?? file.path);
              return (
                <button
                  type="button"
                  className={`hp-package-file ${file.path === activePath ? "hp-package-file-active" : ""}`}
                  key={file.path}
                  onClick={() => setActivePath(file.path)}
                >
                  <Icon file={file} />
                  <span>{name}</span>
                  {file.note && <em>{file.note}</em>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="hp-package-pane">
        <div className="hp-package-file-heading">
          <span>{active.path}</span>
          <span className="hp-package-meta">
            {bytes(new TextEncoder().encode(active.content).length)}
          </span>
        </div>
        <pre className="hp-package-code">
          <code>{active.content}</code>
        </pre>
      </div>
    </div>
  );
}

function Icon({ file }: { file: { path: string } }) {
  const folder = file.path.endsWith("/");
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
      {folder ? (
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
      ) : (
        <path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4" />
      )}
    </svg>
  );
}
