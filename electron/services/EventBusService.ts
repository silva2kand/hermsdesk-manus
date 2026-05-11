export type SilvaEvent = {
  id: string;
  type:
    | 'session.started'
    | 'session.finished'
    | 'token.generated'
    | 'token.draft'
    | 'reasoning.chunk'
    | 'plan.updated'
    | 'tool.called'
    | 'tool.result'
    | 'agent.step'
    | 'agent.thought'
    | 'agent.task.queued'
    | 'agent.task.started'
    | 'agent.task.finished'
    | 'agent.blackboard'
    | 'memory.read'
    | 'memory.write'
    | 'search.query'
    | 'search.result'
    | 'log'
    | 'metrics.update'
    | 'model.info'
    | 'channel.message.in'
    | 'channel.message.out'
    | 'channel.error'
    | 'channel.status'
    | 'mail.index.batch'
    | 'mail.action.proposed'
    | 'mail.action.approved'
    | 'mail.action.completed';
  sessionId: string;
  source: string;
  payload: any;
  createdAt: string;
};

const MAX_EVENTS = 500;

export class EventBusService {
  private win: any = null;

  constructor(private store: any) {}

  setWindow(win: any) {
    this.win = win;
  }

  emit(type: SilvaEvent['type'], source: string, payload: any = {}, sessionId = payload?.sessionId || 'global') {
    const event: SilvaEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      sessionId,
      source,
      payload,
      createdAt: new Date().toISOString()
    };
    const events = [event, ...this.getEvents()].slice(0, MAX_EVENTS);
    this.store.set('silvaEventBus', events);
    this.win?.webContents.send('silva:event', event);
    return event;
  }

  log(source: string, message: string, level: 'info' | 'warn' | 'error' = 'info', payload: any = {}) {
    return this.emit('log', source, { level, message, ...payload });
  }

  getEvents(limit = 200) {
    const events = this.store.get('silvaEventBus', []);
    return Array.isArray(events) ? events.slice(0, limit) : [];
  }
}
