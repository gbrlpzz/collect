import { describe, expect, it } from "vitest";
import { createSchemaDraft, publishSchemaDraft } from "../src/lib/adminBackend";
import { demoProject } from "../src/data/demoState";

describe("administrator interface preview", () => {
  it("edits and publishes a local schema draft without a configured backend", async () => {
    const draft = await createSchemaDraft(demoProject);

    expect(draft).toMatchObject({
      id: `preview-schema-v${demoProject.schemaVersion + 1}`,
      version: demoProject.schemaVersion + 1,
      projectId: demoProject.id,
      fields: demoProject.fields,
    });
    await expect(publishSchemaDraft(draft)).resolves.toBeUndefined();
  });
});
