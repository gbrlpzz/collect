const GITHUB_URL = "https://github.com/gbrlpzz/collect";
export const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

export function DocLinks({ files }: { files: string[] }) {
  return (
    <p className="hp-doc-ref">
      {files.map((file, idx) => (
        <span key={file}>
          {idx > 0 && " · "}
          <a href={DOCS(file)} target="_blank" rel="noopener noreferrer">
            docs/{file}
          </a>
        </span>
      ))}
    </p>
  );
}
