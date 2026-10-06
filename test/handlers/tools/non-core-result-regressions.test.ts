import { describe, expect, it } from 'vitest';
import { listsToolConfigs } from '@/handlers/tool-configs/lists.js';
import { openAiToolConfigs } from '@/handlers/tool-configs/openai/index.js';
import { workspaceMembersToolConfigs } from '@/handlers/tool-configs/workspace-members.js';
import {
  buildStructuredToolResult,
  ResultEncodingError,
} from '@/handlers/tools/result-contract.js';
import { ListMockFactory } from '@test/utils/mock-factories/ListMockFactory.js';
import { WorkspaceMemberMockFactory } from '@test/utils/mock-factories/WorkspaceMemberMockFactory.js';

describe('non-core result boundary regressions', () => {
  it.each(['getLists', 'getListDetails'] as const)(
    'omits absent list fields for %s',
    (name) => {
      const list = ListMockFactory.create();
      const { description: _description, ...expected } = list;
      const raw = { ...list, description: undefined };
      const collection = name === 'getLists';
      const result = buildStructuredToolResult(
        listsToolConfigs[name],
        collection ? [raw] : raw,
        {}
      );
      expect(result.structuredContent?.data).toEqual(
        collection ? [expected] : expected
      );
    }
  );

  it.each(['createList', 'updateListConfiguration'] as const)(
    'omits absent preview markers for %s',
    (name) => {
      const data = {
        list_id: 'list-1',
        name: 'List',
        parent_object: 'companies',
        fields_summary: {},
      };
      const result = buildStructuredToolResult(
        listsToolConfigs[name],
        { ...data, dry_run: undefined },
        {}
      );
      expect(result.structuredContent).toEqual({ data });
    }
  );

  it.each([undefined, {}])(
    'preserves memberships with entryValues %s',
    (entryValues) => {
      const list = ListMockFactory.create();
      const membership = {
        listId: list.id.list_id,
        listName: list.title,
        entryId: 'entry-1',
        entryValues,
      };
      const result = buildStructuredToolResult(
        listsToolConfigs.getRecordListMemberships,
        [membership],
        {}
      );
      const expected =
        entryValues === undefined
          ? {
              listId: membership.listId,
              listName: membership.listName,
              entryId: membership.entryId,
            }
          : membership;
      expect(result.structuredContent).toEqual({
        data: [expected],
        count: 1,
        next_cursor: null,
        // Bounded per-record membership set: no continuation (U5 disclosure).
        pagination: { supported: false, truncated: true },
      });
      expect(JSON.parse(result.content[0].text as string)).toEqual(
        result.structuredContent
      );
    }
  );

  it.each([
    'getListEntries',
    'filterListEntries',
    'advancedFilterListEntries',
    'filterListEntriesByParent',
    'filterListEntriesByParentId',
    'addRecordToList',
    'updateListEntry',
    'manageListEntry',
  ] as const)('omits absent entry fields for %s', (name) => {
    const entry = ListMockFactory.createListEntry('list-1', 'record-1');
    const raw = { ...entry, values: undefined, list_id: undefined };
    const collection = name.includes('Entries');
    const result = buildStructuredToolResult(
      listsToolConfigs[name],
      collection ? [raw] : raw,
      { listId: 'list-1' }
    );
    const expected = collection ? { ...entry } : entry;
    if (collection) delete expected.list_id;
    expect(result.structuredContent?.data).toEqual(
      collection ? [expected] : expected
    );
    expect(JSON.parse(result.content[0].text as string)).toEqual(
      result.structuredContent
    );
  });

  it('omits an absent nested entry identifier when list_id identifies the entry', () => {
    const result = buildStructuredToolResult(
      listsToolConfigs.getListEntries,
      [{ list_id: 'list-1', id: { entry_id: undefined } }],
      {}
    );
    expect(result.structuredContent?.data).toEqual([
      { list_id: 'list-1', id: {} },
    ]);
  });

  it.each([undefined, 'Search excerpt'])(
    'preserves connector search with snippet %s',
    (snippet) => {
      const item = {
        id: 'lists:list-1',
        title: 'List',
        url: 'https://app.attio.com/list-1',
        snippet,
        metadata: undefined,
      };
      const result = buildStructuredToolResult(
        openAiToolConfigs['openai-search'],
        [item],
        {}
      );
      const expected = {
        id: item.id,
        title: item.title,
        url: item.url,
        ...(snippet === undefined ? {} : { snippet }),
      };
      expect(result.structuredContent).toEqual({
        data: [expected],
        count: 1,
        next_cursor: null,
        // Bounded per-record membership set: no continuation (U5 disclosure).
        pagination: { supported: false, truncated: true },
      });
      expect(JSON.parse(result.content[0].text as string)).toEqual({
        results: [expected],
      });
    }
  );

  it('omits absent connector fetch metadata', () => {
    const data = {
      id: 'lists:list-1',
      title: 'List',
      url: 'https://app.attio.com/list-1',
      text: 'List details',
    };
    const result = buildStructuredToolResult(
      openAiToolConfigs['openai-fetch'],
      { ...data, metadata: undefined },
      {}
    );
    expect(result.structuredContent).toEqual({ data });
    expect(JSON.parse(result.content[0].text as string)).toEqual(data);
  });

  it.each([
    'listWorkspaceMembers',
    'searchWorkspaceMembers',
    'getWorkspaceMember',
  ] as const)('preserves an avatar-less member for %s', (name) => {
    const member = { ...WorkspaceMemberMockFactory.create(), avatar_url: null };
    const collection = name !== 'getWorkspaceMember';
    const result = buildStructuredToolResult(
      workspaceMembersToolConfigs[name],
      collection ? [member] : member,
      {}
    );
    expect(result.structuredContent?.data).toEqual(
      collection ? [member] : member
    );
    expect(JSON.parse(result.content[0].text as string)).toEqual(
      result.structuredContent
    );
  });

  it('still rejects malformed optional fields', () => {
    expect(() =>
      buildStructuredToolResult(
        listsToolConfigs.getRecordListMemberships,
        [
          {
            listId: 'list-1',
            listName: 'List',
            entryId: 'entry-1',
            entryValues: null,
          },
        ],
        {}
      )
    ).toThrow(ResultEncodingError);
    expect(() =>
      buildStructuredToolResult(
        openAiToolConfigs['openai-search'],
        [{ id: 'lists:list-1', title: 'List', url: 'url', snippet: null }],
        {}
      )
    ).toThrow(ResultEncodingError);
    expect(() =>
      buildStructuredToolResult(
        workspaceMembersToolConfigs.getWorkspaceMember,
        { ...WorkspaceMemberMockFactory.create(), avatar_url: 1 },
        {}
      )
    ).toThrow(ResultEncodingError);
  });
});
