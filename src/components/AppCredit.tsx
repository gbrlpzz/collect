import { CollectBrand } from "./CollectBrand";

/** Quiet end-of-content signature, following Dispatch without importing its
 * visual system into Collect. */
export function AppCredit() {
  return (
    <footer className="app-credit" aria-label="collect by gbrlpzz">
      <CollectBrand compact showMark={false} />
      <span>
        by{" "}
        <a
          href="https://gbrlpzz.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          gbrlpzz
        </a>
      </span>
    </footer>
  );
}
