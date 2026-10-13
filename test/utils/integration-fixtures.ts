import { randomUUID } from 'node:crypto';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

interface FixtureApi {
  get(path: string): Promise<{ data: unknown }>;
  delete(path: string): Promise<unknown>;
}

type FixtureKind = 'company' | 'list';
interface OwnedFixture {
  kind: FixtureKind;
  id: string;
  name: string;
  path: string;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};

/** Run-local fixtures: never discover deletion candidates by querying a workspace. */
export class IntegrationFixtures {
  private token: string | undefined;
  private identity: Promise<void> | undefined;
  private readonly pending = new Set<Promise<unknown>>();
  private closing = false;
  private readonly marker: string;
  private readonly owned: OwnedFixture[] = [];
  private sequence = 0;

  constructor(private readonly api: FixtureApi) {
    if (!shouldRunIntegrationTests()) {
      throw new Error(
        'Integration fixture writes require ATTIO_API_KEY and must not be skipped'
      );
    }
    const token = process.env.WORKSPACE_API_UUID;
    if (token && !uuid.test(token)) {
      throw new Error(
        'Integration fixture writes require a valid WORKSPACE_API_UUID (API token actor ID)'
      );
    }
    this.token = token;
    this.marker = randomUUID();
  }

  /** The callback must CREATE a new resource, never assert/upsert an existing one. */
  async create<T>(
    kind: FixtureKind,
    create: (name: string) => Promise<T>
  ): Promise<T> {
    if (this.closing) throw new Error('Integration fixture cleanup has begun');
    const operation = this.createOwned(kind, create);
    this.pending.add(operation);
    try {
      return await operation;
    } finally {
      this.pending.delete(operation);
    }
  }

  private async resolveIdentity(): Promise<void> {
    const response = await this.api.get('/self');
    const identity = object(response.data);
    const token = identity.client_id;
    if (
      identity.active !== true ||
      identity.token_level !== 'workspace' ||
      typeof token !== 'string' ||
      !uuid.test(token) ||
      identity.aud !== token
    ) {
      throw new Error('Integration fixture API-token actor UUID could not be resolved');
    }
    this.token = token;
  }

  private async createOwned<T>(
    kind: FixtureKind,
    create: (name: string) => Promise<T>
  ): Promise<T> {
    if (!this.token) {
      this.identity ??= this.resolveIdentity();
      await this.identity;
    }
    if (this.closing) throw new Error('Integration fixture cleanup has begun');
    const name = `IT-${this.token}-${this.marker}-${++this.sequence}`;
    const result = await create(name);
    const id = object(object(result).id)[
      kind === 'company' ? 'record_id' : 'list_id'
    ];
    if (typeof id !== 'string' || !uuid.test(id)) {
      throw new Error(
        `Fixture ${kind} creation returned no valid ID; cannot safely clean up`
      );
    }
    const fixture = {
      kind,
      id,
      name,
      path:
        kind === 'company'
          ? `/objects/companies/records/${id}`
          : `/lists/${id}`,
    };
    // Register before assertions so partial setup remains eligible for safe cleanup.
    this.owned.push(fixture);
    this.assertOwnership(result, fixture);
    return result;
  }

  private assertOwnership(value: unknown, fixture: OwnedFixture): void {
    const record = object(value);
    const id = object(record.id)[
      fixture.kind === 'company' ? 'record_id' : 'list_id'
    ];
    const values = object(record.values);
    const names = values.name;
    const name =
      fixture.kind === 'list'
        ? record.name
        : Array.isArray(names) && names.length === 1
          ? object(names[0]).value
          : undefined;
    const actor = object(record.created_by_actor);
    const creators = values.created_by;
    // created_by is the immutable creator; an attribute's created_by_actor is
    // only its last writer and cannot establish ownership of an existing record.
    const ownedByToken =
      fixture.kind === 'list'
        ? actor.type === 'api-token' && actor.id === this.token
        : Array.isArray(creators) &&
          creators.length === 1 &&
          object(creators[0]).referenced_actor_type === 'api-token' &&
          object(creators[0]).referenced_actor_id === this.token;
    if (id !== fixture.id || name !== fixture.name || !ownedByToken) {
      throw new Error(
        `Fixture ownership could not be verified for ${fixture.path}; refusing deletion or use`
      );
    }
  }

  async cleanup(): Promise<void> {
    this.closing = true;
    await Promise.allSettled([...this.pending]);
    const failures: string[] = [];
    // Lists first when created after their parent records; delete only recorded IDs.
    for (const fixture of [...this.owned].reverse()) {
      try {
        const response = await this.api.get(fixture.path);
        this.assertOwnership(object(response.data).data, fixture);
        await this.api.delete(fixture.path);
      } catch (error) {
        if (object(object(error).response).status !== 404) {
          // Do not include API bodies or credentials in teardown errors.
          failures.push(`cleanup/ownership check failed for ${fixture.path}`);
          continue;
        }
      }
      this.owned.splice(this.owned.indexOf(fixture), 1);
    }
    if (failures.length) throw new Error(failures.join('; '));
  }
}
