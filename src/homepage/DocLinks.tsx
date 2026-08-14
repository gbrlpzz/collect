const GITHUB_URL = "https://github.com/gbrlpzz/collect";
export const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

export function DocLinks({ files }: { files: string[] }) {
  return (
    <div className="hp-doc-ref" aria-label="Related technical documentation">
      {files.map((file) => (
        <div key={file} className="hp-doc-ref-item">
          <a href={DOCS(file)} target="_blank" rel="noopener noreferrer">
            docs/{file}
          </a>
        </div>
      ))}
    </div>
  );
}
