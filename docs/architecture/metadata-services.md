# Metadata Services Architecture

## Overview

The metadata subsystem now uses a dedicated module under `src/services/metadata/` to enforce single responsibility boundaries for attribute discovery, caching, transformation, metrics, and error handling. `UniversalMetadataService` is a thin facade that delegates work to these specialised services while keeping the existing public API for universal handlers.

## Service Breakdown

- **MetadataDiscoveryService** – orchestrates Attio schema discovery, category filtering, and delegates caching/metrics to the shared `DiscoveryRunner` helper.
- **MetadataCacheService** – wraps the shared `CachingService` for TTL-aware attribute caching keyed by resource/object slug.
- **MetadataTransformService** – normalises Attio response shapes, builds title → slug mappings, and applies category filtering without mutating callers.
- **MetadataMetricsService** – records discovery timings, cache hit ratios, and exposes aggregated metrics for diagnostics.
- **MetadataRecordService** – fetches record-level attributes with structured error handling and logging scopes.
- **MetadataErrorService** – converts Attio failures into MCP-safe error payloads and consistent exceptions.
- **Task metadata utilities** – `task-metadata.ts` centralises static task attribute definitions and synonym mappings for reuse across services and tests.

## Dependency Injection

`metadata/index.ts` exposes `createDefaultMetadataServices()` which wires the production dependencies. `UniversalMetadataService` keeps backward-compatible static methods but internally owns a `UniversalMetadataFacade`. Tests (and future consumers) can swap dependencies via `UniversalMetadataService.useFacade()` or `UniversalMetadataService.reset()`.

## Testing Strategy

Unit suites now exist under `test/services/metadata/` validating metrics, transforms, record fetch logic, error wrapping, and discovery caching/metrics behaviour. The existing `UniversalMetadataService` tests exercise the facade to ensure API parity for universal handlers.
