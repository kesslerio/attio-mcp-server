---
title: Fix prompt tool-name catalog drift
type: fix
status: active
date: 2026-06-09
---

# Fix prompt tool-name catalog drift

## Summary

Fix issue #1189 by aligning bundled prompt instructions and prompt-facing docs with the active tool surface. The work should remove stale tool names from generated v1 prompt text, add a registry-backed regression test, and update docs that describe the prompt/tool naming contract.

---

## Problem Frame

The v1 prompt catalog still teaches agents to call names such as `records_query`, `tasks.create`, `deals.list`, and `web.search`. The current server exposes canonical snake_case names in `src/constants/tool-names.ts`, search/fetch compatibility tools in `src/handlers/tool-configs/openai/index.ts`, and limited compatibility aliases in `src/config/tool-aliases.ts`. The stale prompt text can cause avoidable tool-call failures even though the underlying server capabilities exist.

---

## Requirements

- R1. Prompt-generated tool references must resolve through the default registry or through explicitly supported aliases.
- R2. Bundled v1 prompt instructions must stop recommending stale names such as `records_query`, dotted Attio verbs, and `web.search` / `web.fetch`.
- R3. The prompt wording must stay user-facing and task-oriented rather than exposing internal implementation jargon.
- R4. Tests must catch future prompt/tool-name drift across the full v1 prompt catalog, not only one prompt.
- R5. Prompt-facing documentation and examples must match the active tool surface.

---

## Key Technical Decisions

- **Use canonical names in prompts:** Prefer current canonical names from `src/constants/tool-names.ts` over adding new compatibility aliases for stale prompt wording. The aliases in `src/config/tool-aliases.ts` are for backward compatibility with external callers, while bundled prompts should model the current API.
- **Validate prompt output, not only source text:** Build representative messages from every prompt in `src/prompts/v1/index.ts` and inspect generated text. This catches interpolation paths and conditional instructions that a source-only scan can miss.
- **Allowlist true non-Attio tool references narrowly:** `search` and `fetch` are exposed by the OpenAI compatibility configs, but `web.search` and `web.fetch` are not. The regression test should allow only names that resolve through the registry/alias set or are documented as prose-only non-tools.
- **Keep the fix local to prompt/catalog surfaces:** Do not redesign the prompt system or broaden the compatibility alias registry unless implementation proves the active registry itself is incomplete.

---

## Implementation Units

### U1. Audit and replace stale v1 prompt references

- **Goal:** Replace stale prompt tool names with active canonical names while preserving the workflow intent of each prompt.
- **Files:** `src/prompts/v1/*.ts`
- **Patterns:** Follow current prompt builders such as `buildPeopleSearchMessages` and existing dry-run wording in write prompts.
- **Expected changes:** Use `search_records` for record resolution/search instructions, `update_record` for record updates, `create_record` for task creation where tasks are represented as records, `list_notes` for notes, and `search` / `fetch` for OpenAI compatibility search instructions.
- **Test Scenarios:** Generated messages for all v1 prompts contain no `records_query`, no dotted Attio names such as `tasks.create`, and no `web.search` / `web.fetch`.

### U2. Add registry-backed prompt tool-name validation

- **Goal:** Add a regression test that validates tool-like references emitted by prompt builders against the active tool registry and alias registry.
- **Files:** `test/prompts/v1/tool-name-catalog.test.ts`, `test/prompts/v1/people-search.test.ts`
- **Patterns:** Reuse v1 prompt registry from `src/prompts/v1/index.ts`; use existing Vitest style from `test/prompts/v1/people-search.test.ts`.
- **Test Scenarios:** The test extracts backticked tool-like tokens from representative prompt output and fails when a token does not resolve through canonical tools, supported aliases, or a narrow explicit allowlist. The existing people-search test should assert `search_records` instead of `records_query`.

### U3. Update prompt-facing docs and standards

- **Goal:** Align user-facing docs and tool quality guidance with the current naming contract.
- **Files:** `README.md`, `docs/api/prompts-api.md`, `docs/usage/playbooks/*.md`, `docs/tools/tool-quality-standards.md`
- **Patterns:** Keep docs concise and oriented around user-visible tool names. Avoid documenting internal aliases as the preferred path.
- **Test Scenarios:** Repository scan for stale prompt/tool names returns no active-source matches outside historical migration docs or intentional test fixtures.

---

## Scope Boundaries

- This plan does not add new Attio capabilities.
- This plan does not remove existing compatibility aliases.
- This plan does not redesign prompt schemas, prompt discovery, or tool-mode behavior.
- Historical docs may keep old names only when explicitly framed as deprecated migration context.

---

## Acceptance Examples

- AE1. Given a user runs `people_search.v1`, when the prompt message is generated, then it instructs the agent to call `search_records` rather than `records_query`.
- AE2. Given a prompt asks for a follow-up task, when the message is generated, then it uses an active record-creation/update path rather than `tasks.create`.
- AE3. Given the prompt catalog gains a new prompt later, when that prompt emits a stale backticked tool name, then the new catalog validation test fails.
- AE4. Given prompt-facing docs mention tool naming, when a reader follows the examples, then the examples use names exposed by the default server surface.

---

## Risks & Dependencies

- The prompt text compresses complex workflows into short instructions, so replacing dotted names with universal tools must preserve enough argument guidance for agents to act.
- Some docs may contain historical stale names. The implementation should distinguish active guidance from migration history rather than deleting useful historical context.
- Local validation depends on installed dependencies and the repo's Bun toolchain. If local dependencies are unavailable, CI must be treated as the final validation gate and local blockers must be disclosed in the PR.

---

## Sources

- Issue #1189 describes the stale prompt catalog and acceptance criteria.
- `src/constants/tool-names.ts` defines canonical MCP-compliant tool names.
- `src/config/tool-aliases.ts` defines supported compatibility aliases.
- `src/handlers/tool-configs/openai/index.ts` exposes `search` and `fetch` compatibility tools.
- `src/prompts/v1/index.ts` defines the v1 prompt catalog to validate.
