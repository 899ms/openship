import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the real runtime resolvers and real pool/idle timers. Only the
// network transports and database are replaced; no server is contacted.
const h = vi.hoisted(() => ({
  executors: [] as Array<{ closed: boolean; dispose: () => Promise<void>; readFile: () => Promise<string> }>,
  runtimes: [] as Array<{ name: string; dispose: () => Promise<void> }>,
  factoryCalls: 0,
  waitForFactory: null as Promise<void> | null,
  failDispose: false,
  invalidHostIdentity: false,
  disposalCalls: 0,
}));

vi.mock("@repo/adapters", async () => {
  const executor = () => {
    const value = {
      closed: false,
      async dispose() { value.closed = true; },
      async readFile() {
        if (value.closed) throw new Error("SSH connection was closed");
        if (h.invalidHostIdentity) throw new Error("host identity unavailable");
        return "0123456789abcdef0123456789abcdef";
      },
    };
    h.executors.push(value);
    return value;
  };
  const runtime = async (name = "docker") => {
    h.factoryCalls++;
    if (h.waitForFactory) await h.waitForFactory;
    const value = {
      name,
      async dispose() {
        h.disposalCalls++;
        if (h.failDispose) throw new Error("bridge cleanup failed");
      },
    };
    h.runtimes.push(value);
    return value;
  };
  return {
    ...(await import("../../../../packages/adapters/src/system/errors")),
    HOST_STATE_DIR: "/root/.openship",
    getPlatform: () => ({ target: "selfhosted", runtime: { name: "docker" } }),
    peekPlatform: () => undefined,
    createExecutor: executor,
    createHostExecutor: executor,
    hostChannelHealth: async () => ({ ok: true, code: "ok" }),
    probeTcp: async () => true,
    invalidateEnvironment: () => {},
    DockerRuntime: { create: () => runtime() },
    createPlatform: async (config: { runtime?: string; executor: unknown; localHost?: boolean }) => ({
      target: "selfhosted",
      runtime: await runtime(config.runtime),
      executor: config.executor,
      localHost: config.localHost,
    }),
  };
});

vi.mock("@repo/db", () => {
  const row = (id: string) => ({
    id, organizationId: "org", isLocal: id === "local",
    sshHost: id === "local" ? "127.0.0.1" : "remote.invalid",
    sshUser: "root", sshPort: h.invalidHostIdentity ? 0 : 22, sshAuthMethod: "password", sshPassword: "test-password",
  });
  return { repos: { server: { get: async (id: string) => row(id), getInOrganization: async (id: string) => row(id) } } };
});
vi.mock("@repo/platform/engine/lib/box-org", () => ({
  isLocalHostRow: async (row: { isLocal: boolean }) => row.isLocal,
  boxOwningOrgId: async () => "org",
}));
vi.mock("@repo/platform/engine/lib/startup/self-server", () => ({ findLocalServer: async () => null }));
vi.mock("@repo/platform/engine/lib/cloud/client", () => ({ cloudClient: {}, getOrgCloudToken: async () => null }));
vi.mock("@repo/platform/engine/lib/cloud/transport", () => ({ resolveOrgCloudUserId: async () => null }));
vi.mock("@repo/platform/engine/lib/provision-lock", () => ({ createProvisionLock: () => ({}) }));
vi.mock("@repo/platform/engine/lib/acme-config", () => ({ resolveAcmeProviderOptions: () => ({}) }));

import { sshManager } from "@repo/platform/engine/lib/ssh-manager";
import {
  createServerDockerRuntime,
  resolveDeploymentPlatform,
  resolveDeploymentRuntimeForRead,
  resolveTargetPlatform,
} from "@repo/platform/engine/lib/deployment-runtime";

const idleWindow = 6 * 60_000;
const advance = () => vi.advanceTimersByTimeAsync(idleWindow);

beforeEach(() => {
  sshManager.invalidate();
  h.executors = [];
  h.runtimes = [];
  h.factoryCalls = 0;
  h.waitForFactory = null;
  h.failDispose = false;
  h.invalidHostIdentity = false;
  h.disposalCalls = 0;
  vi.useFakeTimers();
});
afterEach(async () => {
  for (const runtime of h.runtimes) await runtime.dispose().catch(() => {});
  sshManager.invalidate();
  vi.useRealTimers();
});

describe("runtime ownership of pooled connections", () => {
  it.each([
    ["local", "docker"], ["local", "bare"], ["remote", "docker"], ["remote", "bare"],
  ] as const)("keeps a %s %s deployment connected through a long build, then reclaims it", async (serverId, mode) => {
    const platform = await resolveTargetPlatform("server", mode, serverId, "org");
    await advance();
    await expect(h.executors[0].readFile()).resolves.toBeTruthy();
    await platform.runtime.dispose?.();
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });

  it("retains the local host channel even when the deployment has no server row", async () => {
    const platform = await resolveTargetPlatform("local", "bare", undefined, "org");
    await advance();
    expect(h.executors[0].closed).toBe(false);
    await platform.runtime.dispose?.();
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });

  it("releases each borrower once and leaves another deployment connected", async () => {
    const first = await resolveTargetPlatform("server", "docker", "remote", "org");
    const second = await resolveTargetPlatform("server", "docker", "remote", "org");
    expect(h.executors).toHaveLength(1);
    await first.runtime.dispose?.();
    await first.runtime.dispose?.();
    await advance();
    expect(h.executors[0].closed).toBe(false);
    await second.runtime.dispose?.();
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });

  it("holds the connection during platform creation and releases it when creation fails", async () => {
    let reject!: (reason: Error) => void;
    h.waitForFactory = new Promise<void>((_resolve, failure) => { reject = failure; });
    const pending = resolveTargetPlatform("server", "docker", "remote", "org");
    const failed = expect(pending).rejects.toThrow("creation failed");
    await vi.waitFor(() => expect(h.factoryCalls).toBe(1));
    await advance();
    const closedDuringCreation = h.executors[0].closed;
    reject(new Error("creation failed"));
    await failed;
    expect(closedDuringCreation).toBe(false);
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });

  it("releases the borrowed connection even when transport disposal rejects", async () => {
    const platform = await resolveTargetPlatform("server", "docker", "remote", "org");
    await advance();
    expect(h.executors[0].closed).toBe(false);
    h.failDispose = true;
    await expect(platform.runtime.dispose?.()).rejects.toThrow("bridge cleanup failed");
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });

  it("keeps a Docker inspection runtime connected until its caller disposes it", async () => {
    const runtime = await createServerDockerRuntime("remote", "org");
    await advance();
    expect(h.executors[0].closed).toBe(false);
    await runtime.dispose();
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });

  it.each(["deployment", "inspection"])("disposes a %s runtime if host identity resolution fails", async (kind) => {
    h.invalidHostIdentity = true;
    const meta = { deployTarget: "server", serverId: "remote", runtimeMode: "docker" } as const;
    const pending = kind === "deployment"
      ? resolveDeploymentPlatform(meta, { organizationId: "org" })
      : resolveDeploymentRuntimeForRead({ meta, organizationId: "org" } as never);
    await expect(pending).rejects.toThrow("invalid SSH port");
    expect(h.disposalCalls).toBe(1);
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });

  it("does not release a replacement connection when an invalidated runtime finishes", async () => {
    const first = await resolveTargetPlatform("server", "docker", "remote", "org");
    sshManager.invalidate("remote");
    const second = await resolveTargetPlatform("server", "docker", "remote", "org");
    expect(h.executors).toHaveLength(2);
    await first.runtime.dispose?.();
    await advance();
    expect(h.executors[0].closed).toBe(true);
    expect(h.executors[1].closed).toBe(false);
    await second.runtime.dispose?.();
    await advance();
    expect(h.executors[1].closed).toBe(true);
  });

  it("keeps a refreshed connection and its retired predecessor alive for their own borrowers", async () => {
    const first = await resolveTargetPlatform("server", "docker", "remote", "org");
    await sshManager.refreshAuthentication("remote", h.executors[0] as never);
    const second = await resolveTargetPlatform("server", "docker", "remote", "org");
    await advance();
    expect(h.executors.map((executor) => executor.closed)).toEqual([false, false]);
    await first.runtime.dispose?.();
    expect(h.executors[0].closed).toBe(true);
    expect(h.executors[1].closed).toBe(false);
    await second.runtime.dispose?.();
    await advance();
    expect(h.executors[1].closed).toBe(true);
  });

  it("keeps a scoped host command alive for longer than the idle window", async () => {
    let finish!: () => void;
    const work = new Promise<void>((resolve) => { finish = resolve; });
    const pending = sshManager.withHostExecutor(async () => work);
    await vi.waitFor(() => expect(h.executors).toHaveLength(1));
    await advance();
    const closedDuringWork = h.executors[0].closed;
    finish();
    await pending;
    expect(closedDuringWork).toBe(false);
    await advance();
    expect(h.executors[0].closed).toBe(true);
  });
});
