# Recent issue verification — 2026-09-24

Baseline: `main` at `5a396e12`, after #928 merged. Review branch: `fix/recent-issues-20260924`.

Scope: all 13 open issues created since September 1, the five closed issues created since September 20, and new bugfix PR #938. Older issues and the previous 76-PR review remain recorded separately. A passing related test does not establish the cause of a report that has no reproduction or logs.

## Issue status

| Issue | Status against main | Evidence / remaining work |
| --- | --- | --- |
| [#937](https://github.com/oblien/openship/issues/937) | New feature; held | Adds explicit PHP version selection and matching generated build/runtime image pairs. Not implemented by the bugfix integration. |
| [#935](https://github.com/oblien/openship/issues/935) | New feature; held | Proposes stack worker/scheduler roles, presets and lifecycle/placement rules. This capability is not included in #928. |
| [#933](https://github.com/oblien/openship/issues/933) | Fixed on main | #934's shared notification content and structured email rendering are in #928. Its 72 notification/transport/access/SDK cases and source CI passed during integration. |
| [#931](https://github.com/oblien/openship/issues/931) | Fixed on main | #932 corrected the shared recovery-alert description; included in #928 with its notification regression coverage. |
| [#919](https://github.com/oblien/openship/issues/919) | Remains open; exact hang not reproduced | Main has outer-worker cancellation, prompt cancellation, execution acknowledgement, and self-hosted restart recovery. Forty current cancellation/lifecycle tests and 13 database admission/acknowledgement tests pass, including redeployment after acknowledgement. The report gives no failed phase or logs for its ten-day v0.7.2 hang, so these checks do not prove that original failure resolved. |
| [#917](https://github.com/oblien/openship/issues/917) | Remains open; not reproduced on current code | An isolated Bun/PGlite probe used the real bootstrap/reset routes and Better Auth sign-in handler. Special-character, Unicode, 8-character and 128-character passwords work; resets reject the old password, revoke old sessions and leave one credential. Thirty CLI setup/token/reset tests pass. The reporter's Ubuntu/Lightsail installation method, version and actual failure response are still needed. |
| [#915](https://github.com/oblien/openship/issues/915) | Fixed on main | #916, merge `4ad53d8a`, is an ancestor of main. Routing recovers a quarantined port only from fresh, verified runtime ownership under the target lock. Its earlier database-backed regressions and CI are recorded on the issue. |
| [#913](https://github.com/oblien/openship/issues/913) | Fixed on main | Amended #914, merge `0c60a056`, is included through #928. Certificate recovery excludes the ACME challenge upstream; the 14 targeted cases and full adapter suite passed during that review. |
| [#907](https://github.com/oblien/openship/issues/907) | Partial on main; completed on this branch | #909 corrected the mail hero button but left the footer's identical install action pointing at `/docs/install`. That URL still returns 404; quickstart returns 200. `96f55b29` changes the remaining footer link. Both mail-page install actions now target the existing quickstart document. |
| [#878](https://github.com/oblien/openship/issues/878) | Remains open; effective Compose input needed | The 27 current Compose build tests pass: an image-only GHCR service skips building and retains its image reference, while an explicit build recipe requests a build. No sanitized effective Compose/override configuration was supplied after the earlier request, so the reported rebuild cannot yet be attributed to a current defect. |
| [#877](https://github.com/oblien/openship/issues/877) | New feature; held | Adds the Porkbun DNS provider. |
| [#876](https://github.com/oblien/openship/issues/876) | Remains open; fresh-install cause unknown | Related Amavis restart cleanup (#885) and transport TLS (#477) fixes are already in main. Neither establishes the cause of this fresh-install queue failure; its deferred reason and matching mail logs are still missing. |
| [#869](https://github.com/oblien/openship/issues/869) | Partially addressed; full workflow still unavailable | Source-release/import corrections and the explicit unavailable-migration guard are in main. Three real route/database tests pass: preflight says unavailable; start returns 501 before export/project creation/SSH; the admin boundary remains enforced. Automatic whole-instance deployment/cutover to another self-hosted server is not implemented. Existing Data Transfer remains the alternative. |
| [#856](https://github.com/oblien/openship/issues/856) | New feature; held | Adds an Authentik catalog application. |
| [#846](https://github.com/oblien/openship/issues/846) | Confirmed limitation; remains open | The shared Compose parser still reports named networks as unsupported/flattened onto the project network; per-service external-network membership is not persisted or reapplied. A background worker depending on an external network is not fixed by #928. |
| [#819](https://github.com/oblien/openship/issues/819) | Mixed proposal; remains open | Main already guards control-plane service start/stop/restart/delete, project teardown/redeploy and reserved loopback routes. Multiple wildcard domains, revised default ports, and the proposed settings/telemetry surfaces are separate feature work. Do not close the whole proposal as fixed. |
| [#818](https://github.com/oblien/openship/issues/818) | Open improvement/proposal | Provider-specific DNS identity handling exists, but the requested secondary-domain verification notice, postmaster alias choice and submission-header policy are not completed by this review. |
| [#779](https://github.com/oblien/openship/issues/779) | Partly covered; broader proposal remains open | Existing image GC has the rollback keep-set, structured counts and system-job history. The requested per-image dry-run/retention explanations, age filter and control-plane image maintenance are additional work; current GC passing does not complete this issue. |

## PR #938

The server-list failure is real on main. Thirty new HTTP regression cases exercise the controller, actual shared operation validator and host-channel formatter with isolated storage, transport and authorization fixtures. Main fails 21 cases across list, detail and reachability for all seven channel states.

The submitted rename from `channel` to `code` does not fully fix it: healthy rows still have a null hint rejected by the contract, reachability still returns a string where an object was required, and existing clients/tests expect `channel`. The submitted change fails 25 of 36 new/existing channel cases. Its extra country fallback is unnecessary: the shared GeoIP helper already returns null for missing/private/unknown addresses.

Correction `26ec63bc` makes the shared contracts describe the established wire format and derives the engine annotation type from `ServerDetail`, without a second serializer or a dashboard-only workaround. The contributor's original `2ecd3cfd` commit is preserved in this branch. A maintainer push to the organization-owned fork was rejected with HTTP 403, so the reviewed continuation is published from the upstream review branch.

Verification: 76 focused API tests, all 14 contract tests, and the complete 172-test SDK suite pass. API and SDK TypeScript checks and the public SDK ESM/CommonJS/declaration build pass. The one-line #907 completion was checked against both live URL responses and the repository's documentation route; it adds no redundant unit test.

This branch contains the verified server-contract fix and remaining mail install link fix. It does not claim to complete the unresolved reports above, and it is not merged to main by this review.
