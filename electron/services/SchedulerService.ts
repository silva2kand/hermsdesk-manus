import Store from 'electron-store';

type ScheduledTask = {
  id: string;
  name: string;
  trigger: string;
  task: string;
  status: 'Active' | 'Paused';
  agentId?: string;
  lastRunAt?: number;
  lastRunStatus?: 'queued' | 'failed';
  lastRunSummary?: string;
};

type ScheduledRun = {
  id: string;
  scheduleId: string;
  scheduleName: string;
  taskId?: string;
  status: 'queued' | 'failed';
  startedAt: number;
  agentId: string;
  message: string;
};

export class SchedulerService {
  private store: any;
  private workspaceService: any;
  private orchestrator: any;
  private timer: NodeJS.Timeout | null = null;
  private win: any = null;
  private runningIds = new Set<string>();

  constructor(sharedStore: any, workspaceService: any, orchestrator: any) {
    this.store = sharedStore || new Store({ name: 'scheduler', atomically: false, watch: false });
    this.workspaceService = workspaceService;
    this.orchestrator = orchestrator;
  }

  setWindow(win: any) {
    this.win = win;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(error => this.log('error', error.message)), 30000);
    this.tick().catch(error => this.log('error', error.message));
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getRuns(): ScheduledRun[] {
    return this.store.get('scheduledTaskRuns', []) as ScheduledRun[];
  }

  async runNow(scheduleId: string) {
    const schedules = this.getSchedules();
    const schedule = schedules.find(task => task.id === scheduleId);
    if (!schedule) return { ok: false, error: 'Scheduled task not found.' };
    return this.execute(schedule, 'Manual run');
  }

  private async tick() {
    const schedules = this.getSchedules();
    const now = new Date();
    for (const schedule of schedules) {
      if (schedule.status !== 'Active') continue;
      if (this.runningIds.has(schedule.id)) continue;
      if (!this.isDue(schedule, now)) continue;
      await this.execute(schedule, 'Scheduled run');
    }
  }

  private getSchedules(): ScheduledTask[] {
    const schedules = this.workspaceService.getScheduledTasks();
    return Array.isArray(schedules) ? schedules : [];
  }

  private async execute(schedule: ScheduledTask, reason: string) {
    this.runningIds.add(schedule.id);
    const agentId = schedule.agentId || 'hermes-full';
    const startedAt = Date.now();
    const message = `${reason}: ${schedule.name}\n\n${schedule.task || schedule.name}\n\nTrigger: ${schedule.trigger}`;

    try {
      const task = await this.orchestrator.createTask(message, agentId, this.win);
      const run: ScheduledRun = {
        id: Math.random().toString(36).slice(2),
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        taskId: task?.id,
        status: 'queued',
        startedAt,
        agentId,
        message
      };
      this.saveRun(run);
      this.updateSchedule(schedule.id, {
        lastRunAt: startedAt,
        lastRunStatus: 'queued',
        lastRunSummary: `Queued on ${new Date(startedAt).toLocaleString()} for ${agentId}`
      });
      this.log('info', `Scheduled task queued: ${schedule.name}`);
      return { ok: true, run, task };
    } catch (error: any) {
      const run: ScheduledRun = {
        id: Math.random().toString(36).slice(2),
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        status: 'failed',
        startedAt,
        agentId,
        message: error?.message || 'Scheduled task failed to queue.'
      };
      this.saveRun(run);
      this.updateSchedule(schedule.id, {
        lastRunAt: startedAt,
        lastRunStatus: 'failed',
        lastRunSummary: run.message
      });
      this.log('error', `Scheduled task failed: ${schedule.name} - ${run.message}`);
      return { ok: false, error: run.message, run };
    } finally {
      this.runningIds.delete(schedule.id);
    }
  }

  private saveRun(run: ScheduledRun) {
    const runs = this.getRuns();
    this.store.set('scheduledTaskRuns', [run, ...runs].slice(0, 100));
    this.win?.webContents.send('scheduler:run', run);
  }

  private updateSchedule(id: string, patch: Partial<ScheduledTask>) {
    const schedules = this.getSchedules().map(task => task.id === id ? { ...task, ...patch } : task);
    this.workspaceService.saveScheduledTasks(schedules);
    this.win?.webContents.send('scheduler:tasks-updated', schedules);
  }

  private isDue(schedule: ScheduledTask, now: Date) {
    const trigger = (schedule.trigger || '').toLowerCase().trim();
    const lastRunAt = schedule.lastRunAt || 0;
    if (!trigger) return false;

    if (trigger.includes('every hour')) {
      return Date.now() - lastRunAt >= 60 * 60 * 1000;
    }

    const minuteMatch = trigger.match(/every\s+(\d+)\s+minutes?/);
    if (minuteMatch) {
      return Date.now() - lastRunAt >= Number(minuteMatch[1]) * 60 * 1000;
    }

    const time = this.parseTime(trigger);
    const dueHour = time?.hour ?? 9;
    const dueMinute = time?.minute ?? 0;
    if (now.getHours() < dueHour || (now.getHours() === dueHour && now.getMinutes() < dueMinute)) {
      return false;
    }

    if (this.hasRunToday(lastRunAt, now)) return false;

    if (trigger.includes('first of every month')) {
      return now.getDate() === 1;
    }

    const dayIndex = this.parseDay(trigger);
    if (dayIndex !== null) {
      return now.getDay() === dayIndex;
    }

    return trigger.includes('every day') || trigger.includes('daily');
  }

  private hasRunToday(lastRunAt: number, now: Date) {
    if (!lastRunAt) return false;
    const last = new Date(lastRunAt);
    return last.getFullYear() === now.getFullYear() &&
      last.getMonth() === now.getMonth() &&
      last.getDate() === now.getDate();
  }

  private parseTime(trigger: string) {
    const match = trigger.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const suffix = match[3];
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }

  private parseDay(trigger: string) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const index = days.findIndex(day => trigger.includes(day));
    return index >= 0 ? index : null;
  }

  private log(type: 'info' | 'error', content: string) {
    this.win?.webContents.send('app:log', { type, content });
  }
}
