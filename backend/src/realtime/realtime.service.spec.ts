import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    service = new RealtimeService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should emit an event to a project room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });

    service.setServer({
      to,
    } as never);

    service.emitToProject(1, 'project.updated', {
      id: 10,
    });

    expect(to).toHaveBeenCalledWith('project:1');
    expect(emit).toHaveBeenCalledWith('project.updated', {
      id: 10,
    });
  });

  it('should emit an event to a task room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });

    service.setServer({
      to,
    } as never);

    service.emitToTask(100, 'task.updated', {
      id: 100,
    });

    expect(to).toHaveBeenCalledWith('task:100');
    expect(emit).toHaveBeenCalledWith('task.updated', {
      id: 100,
    });
  });

  it('should emit an event to a user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });

    service.setServer({
      to,
    } as never);

    service.emitToUser(42, 'project.created', {
      id: 10,
    });

    expect(to).toHaveBeenCalledWith('user:42');
    expect(emit).toHaveBeenCalledWith('project.created', {
      id: 10,
    });
  });

  it('should not emit to a project room when server is not initialized', () => {
    const to = jest.fn();

    expect(() => {
      service.emitToProject(1, 'project.updated', {
        id: 10,
      });
    }).not.toThrow();

    expect(to).not.toHaveBeenCalled();
  });

  it('should not emit to a task room when server is not initialized', () => {
    const to = jest.fn();

    expect(() => {
      service.emitToTask(100, 'task.updated', {
        id: 100,
      });
    }).not.toThrow();

    expect(to).not.toHaveBeenCalled();
  });

  it('should not emit to a user room when server is not initialized', () => {
    const to = jest.fn();

    expect(() => {
      service.emitToUser(42, 'project.created', {
        id: 10,
      });
    }).not.toThrow();

    expect(to).not.toHaveBeenCalled();
  });

  it('should replace the current server when setServer is called again', () => {
    const firstEmit = jest.fn();
    const firstTo = jest.fn().mockReturnValue({ emit: firstEmit });

    const secondEmit = jest.fn();
    const secondTo = jest.fn().mockReturnValue({ emit: secondEmit });

    service.setServer({
      to: firstTo,
    } as never);

    service.setServer({
      to: secondTo,
    } as never);

    service.emitToProject(1, 'project.updated', {
      id: 10,
    });

    expect(firstTo).not.toHaveBeenCalled();
    expect(secondTo).toHaveBeenCalledWith('project:1');
    expect(secondEmit).toHaveBeenCalledWith('project.updated', {
      id: 10,
    });
  });
});
