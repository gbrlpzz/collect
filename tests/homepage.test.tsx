// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import * as React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { FlowDemo } from "../src/homepage/FlowDemo";
import { AttentionDemo } from "../src/homepage/AttentionDemo";
import { PackageBrowser } from "../src/homepage/PackageBrowser";
import { PreviewForm } from "../src/homepage/PreviewForm";
import { HomepageApp } from "../src/homepage/HomepageApp";
import { ATTENTION_CHECKS } from "../src/data/attentionChecks";

const storageEmpty = () => {
  if (typeof localStorage !== "undefined") expect(localStorage.length).toBe(0);
  if (typeof sessionStorage !== "undefined")
    expect(sessionStorage.length).toBe(0);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});

/**
 * The homepage demo must mirror the app's real frontend: the FlowDemo mounts
 * the real Collector/ContributorHome, uses the real schema fixture and the
 * real attention bank, and records nothing anywhere.
 */

describe("FlowDemo — real app frontend inside the iPhone mock-up", () => {
  it("renders the real Collector with the app's own copy", () => {
    render(<FlowDemo />);
    // The real flow opens on the section intro, then the required identifier.
    expect(screen.getByText("Site observation")).toBeTruthy();
    expect(
      screen.getByText("Capture the place before recording its condition."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeTruthy();
    // The iPhone chrome is present.
    expect(document.querySelector(".hp-iphone-screen")).toBeTruthy();
    expect(document.querySelector(".hp-dynamic-island")).toBeTruthy();
  });

  it("runs the full flow on the real home screen, syncs to Sent, and records nothing", async () => {
    render(<FlowDemo />);
    const viewport = () => document.querySelector(".hp-app-viewport")!;

    const stepTitle = () =>
      viewport().querySelector(".step-title")?.textContent?.trim() ?? "";
    const primaryButton = () =>
      screen.queryByRole("button", { name: /continue|skip|save observation/i });
    const homeReached = () =>
      screen.queryByRole("button", { name: /add observation/i }) !== null;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Advance through every step. Single answers auto-advance (~220 ms);
    // multi-select and optional steps need the primary button, so if the
    // title has not changed after an answer, press Continue/Skip. Save on
    // the last step (attention may be last and required — answer it first).
    for (let guard = 0; guard < 26; guard++) {
      await waitFor(() => expect(stepTitle()).not.toBe(""));
      const title = stepTitle();

      if (title === "Site code") {
        const input = viewport().querySelector("input");
        fireEvent.change(input!, { target: { value: "VA-023" } });
        await waitFor(() =>
          expect(primaryButton()).toHaveProperty("disabled", false),
        );
        fireEvent.click(primaryButton()!);
      } else if (title === "Date observed") {
        const input = viewport().querySelector('input[type="date"]');
        fireEvent.change(input!, { target: { value: "2026-08-10" } });
      } else {
        // Covers single/tri-state/attention steps (auto-advance) as well
        // as the attention step whose title is the check prompt itself.
        const option = viewport().querySelector(
          ".choice-button, .tri-state button",
        );
        if (option) {
          fireEvent.click(option);
        } else {
          fireEvent.click(primaryButton()!);
        }
      }

      await sleep(360);
      const primary = primaryButton();
      // Save is only clickable once the (required) last step is answered.
      if (
        primary &&
        !primary.disabled &&
        /save observation/i.test(primary.textContent ?? "")
      ) {
        fireEvent.click(primary);
        break;
      }
      // Multi-select and required-last steps (e.g. attention) stay put:
      // press the primary action so the walk continues to the next step.
      if (stepTitle() === title) {
        const current = primaryButton();
        if (current && !current.disabled) fireEvent.click(current);
        await sleep(360);
        if (homeReached()) break;
        const after = primaryButton();
        if (
          after &&
          !after.disabled &&
          /save observation/i.test(after.textContent ?? "")
        ) {
          fireEvent.click(after);
          break;
        }
      }
      if (homeReached()) break;
    }

    // The real ContributorHome appears after save.
    await waitFor(() => expect(homeReached()).toBe(true));
    expect(screen.getByText("Vernacular buildings — Valpuesta")).toBeTruthy();
    expect(screen.getByText(/Saved here/i)).toBeTruthy();

    // The demo never persists anything: no storage, no IndexedDB.
    storageEmpty();
    const databases = await indexedDB.databases();
    expect(
      databases.filter((db) => (db.name ?? "").startsWith("collect-local")),
    ).toEqual([]);

    // Background sync simulation completes on the real home screen.
    await waitFor(() => expect(screen.getByText("Sent")).toBeTruthy(), {
      timeout: 8000,
    });
    storageEmpty();
  }, 15000);
});

describe("AttentionDemo — real bank and real strip logic", () => {
  it("uses a prompt from the app's own attention bank", () => {
    render(<AttentionDemo />);
    const prompts = ATTENTION_CHECKS.map((check) => check.prompt);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(prompts).toContain(heading.textContent);
    expect(screen.getAllByRole("button", { name: /./ }).length).toBe(4);
  });

  it("shows the stored record and the stripped payload after answering", async () => {
    render(<AttentionDemo />);
    const options = screen.getAllByRole("button", { name: /./ });
    fireEvent.click(options[0]);
    await waitFor(() =>
      expect(screen.getByText(/what the dataset stores/i)).toBeTruthy(),
    );
    expect(screen.getByText(/check_key/i)).toBeTruthy();
    expect(screen.getByText(/never enters the payload/i)).toBeTruthy();
    // The stripped view must not contain the question text anywhere.
    const code = document.querySelectorAll("pre");
    const stripped = Array.from(code).find((el) =>
      el.textContent?.includes("values_after_commit"),
    );
    expect(stripped).toBeTruthy();
    expect(stripped!.textContent).not.toContain("What is");
  });
});

describe("PackageBrowser — derived from the canonical demo dataset", () => {
  it("defaults to manifest.json and shows derived files", () => {
    render(<PackageBrowser />);
    expect(screen.getByText("manifest.json")).toBeTruthy();
    expect(screen.getByText(/export_format_version/i)).toBeTruthy();

    fireEvent.click(screen.getByText("submissions.jsonl"));
    expect(screen.getByText(/VA-001/i)).toBeTruthy();

    fireEvent.click(screen.getByText("submissions.geojson"));
    expect(screen.getByText(/FeatureCollection/i)).toBeTruthy();

    fireEvent.click(screen.getByText("datacite.json"));
    expect(screen.getByText(/datacite.org\/schema\/kernel-4.4/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^media\//i }));
    expect(screen.getByText(/never recompresses/i)).toBeTruthy();
  });
});

describe("PreviewForm — research preview email CTA", () => {
  it("validates the email before sending", async () => {
    render(<PreviewForm />);
    fireEvent.click(screen.getByRole("button", { name: /request access/i }));
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("accepts a bare email (use case optional)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PreviewForm />);
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "researcher@lab.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /request access/i }));
    await waitFor(() =>
      expect(screen.getByText(/request received/i)).toBeTruthy(),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.email).toBe("researcher@lab.org");
    expect(body.use_case).toBeNull();
    expect(body.source).toBe("homepage");
    storageEmpty();
  });

  it("posts one row with the use case and shows the success state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PreviewForm />);

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "researcher@lab.org" },
    });
    fireEvent.change(screen.getByLabelText(/what would you collect/i), {
      target: {
        value:
          "A building survey in a valley with patchy coverage, published as a dataset.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /request access/i }));

    await waitFor(() =>
      expect(screen.getByText(/request received/i)).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/rest/v1/preview_requests");
    const body = JSON.parse(String(init.body));
    expect(body.email).toBe("researcher@lab.org");
    expect(body.source).toBe("homepage");
    expect(body.use_case).toContain("patchy coverage");
    storageEmpty();
  });

  it("asks for a sentence when a use case is provided but too short", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PreviewForm />);
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "researcher@lab.org" },
    });
    fireEvent.change(screen.getByLabelText(/what would you collect/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /request access/i }));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("HomepageApp — promotional home with email CTA", () => {
  it("prefills the research-preview form from the hero capture", async () => {
    const { container } = render(<HomepageApp />);
    const heroInput = container.querySelector(
      ".hp-capture input",
    ) as HTMLInputElement;
    fireEvent.change(heroInput, { target: { value: "lead@lab.org" } });
    fireEvent.click(container.querySelector(".hp-capture button")!);
    // The research-preview form receives the hero email (scoped: the hero
    // capture also has an email input).
    const formEmail = container.querySelector(
      '#preview input[type="email"]',
    ) as HTMLInputElement;
    await waitFor(() => expect(formEmail.value).toBe("lead@lab.org"));
    storageEmpty();
  });
});
