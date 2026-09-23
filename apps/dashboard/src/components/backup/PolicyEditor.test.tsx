// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";
import { ModalProvider } from "@/context/ModalContext";
import { baseDictionary } from "@/i18n";
import type { BackupDestinationSummary } from "@/lib/api";
import { BackupSettings } from "@/app/(dashboard)/projects/[id]/components/BackupSettings";
import { PolicyEditor } from "./PolicyEditor";

const api = vi.hoisted(() => ({
  destinations: vi.fn(),
  createDestination: vi.fn(),
  createPolicy: vi.fn(),
  policies: vi.fn(),
  runs: vi.fn(),
  saved: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    backupDestinationsApi: {
      ...actual.backupDestinationsApi,
      list: api.destinations,
      create: api.createDestination,
    },
    backupsApi: {
      ...actual.backupsApi,
      createPolicy: api.createPolicy,
      listPolicies: api.policies,
      listRuns: api.runs,
    },
  };
});
vi.mock("@/context/ProjectSettingsContext", () => ({
  useProjectSettings: () => ({
    projectData: { id: "project-1" },
    servicesData: { services: [{ id: "service-1", name: "Database", image: "postgres:17" }] },
  }),
}));
// Keep the real destination form and server picker without unrelated JSX .js cards.
vi.mock("@/components/shared", async () => ({
  ServerSelector: (await import("@/components/shared/ServerSelector")).default,
}));

const w = baseDictionary.widgets.backup.policyEditor;
const m = baseDictionary.misc.backups;
const addDestination = "Add new destination";
const destination: BackupDestinationSummary = {
  id: "destination-new",
  name: "Daily archive",
  kind: "sftp",
  endpoint: null,
  region: null,
  bucket: null,
  pathPrefix: "/backups/daily",
  sshHost: "backups.example.test",
  sshPort: 22,
  sshUser: "backup",
  serverId: null,
  hasAccessKeyId: false,
  hasSecretAccessKey: false,
  hasSftpPassword: true,
  hasSftpPrivateKey: false,
  hasSftpKeyPassphrase: false,
  lastVerifiedAt: null,
  lastVerifyError: null,
  isDefault: false,
  createdAt: "2026-09-23T00:00:00Z",
  updatedAt: "2026-09-23T00:00:00Z",
  stats: null,
};
const previousDestination = { ...destination, id: "destination-old", name: "Existing archive" };

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.destinations.mockResolvedValue({ data: [previousDestination] });
  api.createDestination.mockResolvedValue({ data: destination });
  api.createPolicy.mockResolvedValue({ data: { id: "policy-1" } });
  api.policies.mockResolvedValue({ data: [] });
  api.runs.mockResolvedValue({ data: [] });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function button(text: string, exact = true): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((node) =>
    exact ? node.textContent?.trim() === text : node.textContent?.includes(text),
  );
  expect(found, `button ${text}`).toBeDefined();
  return found!;
}
const click = (text: string, exact = true) => act(async () => button(text, exact).click());
function field(label: string): HTMLInputElement | HTMLTextAreaElement {
  const node = [...document.querySelectorAll("label")].find(
    (node) =>
      node.textContent?.trim() === label || node.firstElementChild?.textContent?.trim() === label,
  );
  const input =
    node?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea") ??
    node?.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  expect(input, `field ${label}`).toBeTruthy();
  return input!;
}
async function edit(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const prototype =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function open(settings = false) {
  await act(async () =>
    root.render(
      <I18nProvider>
        <ModalProvider>
          {settings ? (
            <BackupSettings />
          ) : (
            <PolicyEditor
              projectId="project-1"
              serviceId="service-1"
              onClose={api.close}
              onSaved={api.saved}
            />
          )}
        </ModalProvider>
      </I18nProvider>,
    ),
  );
}
async function openDestinationPicker() {
  const label = [...document.querySelectorAll("label")].find(
    (node) => node.textContent?.trim() === w.destination,
  );
  const trigger = label?.parentElement?.querySelector("button");
  expect(trigger).not.toBeNull();
  await act(async () => trigger!.click());
}
async function addSftpDestination() {
  await openDestinationPicker();
  await click(addDestination);
  expect(document.body.textContent).not.toContain(w.createTitle);
  await click(m.kindSftp, false);
  await edit(field(m.fieldName), destination.name);
  await edit(field(m.fieldHost), destination.sshHost!);
  await edit(field(m.fieldUser), destination.sshUser!);
  await edit(field(m.fieldPassword), "test-only-password");
  await edit(field(m.fieldPathPrefix), destination.pathPrefix!);
}
async function draftPolicy() {
  await click(w.methodPath, false);
  await edit(field(w.pathsLabel), "/data/uploads\n/data/reports");
  await click(w.presetWeekly);
  await edit(field(w.retainCount), "14");
}
function expectDraft() {
  expect(field(w.pathsLabel).value).toBe("/data/uploads\n/data/reports");
  expect(field(w.schedule).value).toBe("17 3 * * 0");
  expect(field(w.retainCount).value).toBe("14");
}

describe("backup policy destination creation", () => {
  it.each([false, true])(
    "creates and selects a destination without losing the policy draft (first destination: %s)",
    async (first) => {
      if (first) api.destinations.mockResolvedValue({ data: [] });
      await open();
      await draftPolicy();
      await addSftpDestination();
      await click(m.saveDestination);
      expect(api.createDestination).toHaveBeenCalledExactlyOnceWith({
        name: destination.name,
        kind: "sftp",
        sshHost: destination.sshHost,
        sshPort: 22,
        sshUser: destination.sshUser,
        sftpPassword: "test-only-password",
        pathPrefix: destination.pathPrefix,
      });
      expectDraft();
      expect(button(destination.name, false).textContent).toContain(destination.name);
      await openDestinationPicker();
      expect(document.querySelectorAll(`[role="option"][aria-selected="true"]`)).toHaveLength(1);
      expect(
        [...document.querySelectorAll('[role="option"]')].filter((node) =>
          node.textContent?.includes(destination.name),
        ),
      ).toHaveLength(1);
      await act(async () =>
        (document.querySelector('[role="option"][aria-selected="true"]') as HTMLElement).click(),
      );
      await click(w.createPolicy);
      expect(api.createPolicy).toHaveBeenCalledExactlyOnceWith(
        "project-1",
        expect.objectContaining({
          serviceId: "service-1",
          destinationId: destination.id,
          payloadKind: "path",
          payloadConfig: { paths: ["/data/uploads", "/data/reports"] },
          cronExpression: "17 3 * * 0",
          retainCount: 14,
        }),
      );
      expect(api.destinations).toHaveBeenCalledTimes(1);
    },
  );

  it("returns to the unchanged draft and selection when adding a destination is cancelled", async () => {
    await open();
    await draftPolicy();
    await addSftpDestination();
    await click(m.cancel);
    expectDraft();
    expect(button(previousDestination.name, false).textContent).toContain(previousDestination.name);
    expect(api.createDestination).not.toHaveBeenCalled();
    expect(api.close).not.toHaveBeenCalled();
  });

  it("keeps a failed destination save editable and selects it only after a successful retry", async () => {
    api.createDestination.mockRejectedValueOnce(new Error("Destination could not be saved"));
    await open();
    await draftPolicy();
    await addSftpDestination();
    await click(m.saveDestination);
    expect(document.body.textContent).toContain("Destination could not be saved");
    expect(field(m.fieldName).value).toBe(destination.name);
    expect(api.createPolicy).not.toHaveBeenCalled();
    await click(m.saveDestination);
    expectDraft();
    await click(w.createPolicy);
    expect(api.createPolicy).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({ destinationId: destination.id }),
    );
  });

  it("keeps the new destination when an older list request finishes after creation", async () => {
    let resolve!: (value: { data: BackupDestinationSummary[] }) => void;
    api.destinations.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await open();
    await addSftpDestination();
    await click(m.saveDestination);
    await act(async () => resolve({ data: [previousDestination] }));
    expect(button(destination.name, false).textContent).toContain(destination.name);
    await click(w.createPolicy);
    expect(api.createPolicy).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({ destinationId: destination.id }),
    );
  });

  it("keeps an in-flight destination save on its form until it can restore the policy draft", async () => {
    let resolve!: (value: { data: BackupDestinationSummary }) => void;
    api.createDestination.mockReturnValue(new Promise((done) => { resolve = done; }));
    await open();
    await draftPolicy();
    await addSftpDestination();
    const save = button(m.saveDestination);
    await act(async () => { save.click(); save.click(); });
    await act(async () => {
      document.querySelector<HTMLButtonElement>(`button[aria-label="${m.backToPicker}"]`)!.click();
    });
    // Switching forms during the request used to discard the fields and let its
    // eventual response replace a different destination choice.
    expect(field(m.fieldName).value).toBe(destination.name);
    expect(button(m.cancel).disabled).toBe(true);
    for (const close of document.querySelectorAll<HTMLButtonElement>("button:has(.lucide-x)")) {
      await act(async () => close.click());
    }
    expect(field(m.fieldName).value).toBe(destination.name);
    await act(async () => resolve({ data: destination }));
    expectDraft();
    expect(button(destination.name, false).textContent).toContain(destination.name);
    expect(api.createDestination).toHaveBeenCalledTimes(1);
  });

  it("keeps destination creation unavailable while the policy itself is being saved", async () => {
    let resolve!: (value: { data: { id: string } }) => void;
    api.createPolicy.mockReturnValue(new Promise((done) => { resolve = done; }));
    await open();
    await draftPolicy();
    const save = button(w.createPolicy);
    await act(async () => { save.click(); save.click(); });
    await openDestinationPicker();
    const add = [...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === addDestination);
    if (add) await act(async () => add.click());
    expect(document.body.textContent).not.toContain(m.modalAddTitle);
    expectDraft();
    await act(async () => resolve({ data: { id: "policy-1" } }));
    expect(api.saved).toHaveBeenCalledExactlyOnceWith({ id: "policy-1" });
    expect(api.createPolicy).toHaveBeenCalledTimes(1);
  });

  it("recovers a failed destination list without losing the draft", async () => {
    api.destinations.mockRejectedValueOnce(new Error("Destinations unavailable"));
    await open();
    await draftPolicy();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Destinations unavailable",
    );
    await click(w.retry);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expectDraft();
    expect(button(previousDestination.name, false).textContent).toContain(previousDestination.name);
  });

  it.each([0, 1])(
    "opens the project/service policy editor from settings with no destinations (button %s)",
    async (index) => {
      api.destinations.mockResolvedValue({ data: [] });
      await open(true);
      const create = [...document.querySelectorAll("button")].filter(
        (node) => node.textContent?.trim() === w.createPolicy,
      );
      expect(create[index].disabled).toBe(false);
      await act(async () => create[index].click());
      expect(document.body.textContent).toContain(w.createTitle);
      await openDestinationPicker();
      await click(addDestination);
      expect(document.body.textContent).toContain(m.modalAddTitle);
    },
  );
});
