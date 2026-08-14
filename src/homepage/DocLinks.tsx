import { Icon } from "../components/Icon";

const GITHUB_URL = "https://github.com/gbrlpzz/collect";
export const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

export interface DocItem {
  file: string;
  label?: string;
}

export function DocLinks({ docs }: { docs: DocItem[] }) {
  return (
    <div className="hp-doc-links" aria-label="Related technical documentation">
      {docs.map((doc, idx) => (
        <span className="hp-doc-link-item" key={doc.file}>
          {idx > 0 && (
            <span className="hp-doc-sep" aria-hidden="true">
              ·
            </span>
          )}
          <a
            href={DOCS(doc.file)}
            target="_blank"
            rel="noopener noreferrer"
            className="hp-doc-anchor"
          >
            <code>docs/{doc.file}</code>
            {doc.label && <span className="hp-doc-label">{doc.label}</span>}
            <Icon name="arrow-right" size={12} />
          </a>
        </span>
      ))}
    </div>
  );
}
