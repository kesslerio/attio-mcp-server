# Integration verification in CI

- **Runtime limit**: 30 minutes, plus the prerequisite check
- **Selection**: API/service/handler changes or the `run-integration-tests` PR label
- **Requirements**: `ATTIO_TEST_API_KEY` and `ATTIO_TEST_WORKSPACE_ID` secrets
- **Tasks**:
  - Credential availability check
  - Real API integration tests

In the active `smart-ci.yml` workflow, the existing change analysis or the
`run-integration-tests` label selects integration verification. The **Integration
Prerequisites** job checks availability before checkout, installation, or build.
For a selected trusted run, a missing `ATTIO_TEST_API_KEY` fails that prerequisite
and records that real API tests were not exercised. **Integration Tests** remains
skipped; it cannot report success from a missing-key early exit.

Untrusted fork pull requests receive no test credential and explicitly report
verification unavailable in the job summary; their integration test job is
skipped. This does not grant fork code access to secrets or use
`pull_request_target`. A present credential only admits the test job: its actual
test command still determines success or failure. Credentials must be configured
separately; this workflow does not provision them.

Run the offline workflow boundary tests with
`bun test scripts/ci/integration-workflow.test.ts`. They execute the prerequisite
shell with synthetic values and stub the test runner; they provide no live API
coverage.
