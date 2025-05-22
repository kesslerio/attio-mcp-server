import { tasksToolConfigs } from '../../src/handlers/tool-configs/tasks';
import * as tasksModule from '../../src/objects/tasks';

jest.mock('../../src/objects/tasks');

const mockedTasks = tasksModule as jest.Mocked<typeof tasksModule>;

describe('Tasks Tool Configs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('create-task formats result', async () => {
    const mockTask = { id: { task_id: 't1' }, content: 'do', status: 'todo', created_at: '', updated_at: '' } as any;
    mockedTasks.createTask.mockResolvedValueOnce(mockTask);
    const result = await tasksToolConfigs.createTask.handler('do');
    const formatted = tasksToolConfigs.createTask.formatResult?.(result) || '';
    expect(mockedTasks.createTask).toHaveBeenCalled();
    expect(formatted).toContain('t1');
  });

  it('list-tasks formats list', async () => {
    const mock = [
      { id: { task_id: 'a' }, content: 'one', status: 'todo' },
      { id: { task_id: 'b' }, content: 'two', status: 'todo' }
    ] as any[];
    mockedTasks.listTasks.mockResolvedValueOnce(mock);
    const result = await tasksToolConfigs.listTasks.handler();
    const formatted = tasksToolConfigs.listTasks.formatResult?.(result) || '';
    expect(mockedTasks.listTasks).toHaveBeenCalled();
    expect(formatted).toContain('Found 2 tasks');
  });
});
