import { AttioWorkspaceMember } from '../../../src/types/attio.js';

export class WorkspaceMemberMockFactory {
  /**
   * Generate a mock workspace member with optional overrides
   */
  static create(
    overrides: Partial<AttioWorkspaceMember> = {}
  ): AttioWorkspaceMember {
    const timestamp = new Date().toISOString();
    const randomId = `mock-member-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      id: {
        workspace_member_id: randomId,
        workspace_id: 'mock-workspace-id',
        ...overrides.id,
      },
      first_name: 'John',
      last_name: 'Doe',
      email_address: 'john.doe@example.com',
      access_level: 'editor' as const,
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides,
    };
  }

  /**
   * Generate multiple mock workspace members
   */
  static createMany(
    count: number,
    overrides: Partial<AttioWorkspaceMember> = {}
  ): AttioWorkspaceMember[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        first_name: `User${index + 1}`,
        last_name: 'Test',
        email_address: `user${index + 1}@example.com`,
        ...overrides,
      })
    );
  }

  /**
   * Generate a mock admin workspace member
   */
  static createAdmin(
    overrides: Partial<AttioWorkspaceMember> = {}
  ): AttioWorkspaceMember {
    return this.create({
      first_name: 'Admin',
      last_name: 'User',
      email_address: 'admin@example.com',
      access_level: 'admin' as const,
      ...overrides,
    });
  }

  /**
   * Generate a mock viewer workspace member
   */
  static createViewer(
    overrides: Partial<AttioWorkspaceMember> = {}
  ): AttioWorkspaceMember {
    return this.create({
      first_name: 'Viewer',
      last_name: 'User',
      email_address: 'viewer@example.com',
      access_level: 'viewer' as const,
      ...overrides,
    });
  }
}
