import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

interface Job {
  deploymentId: string;
  action: 'plan_and_apply' | 'destroy';
  execute: () => Promise<void>;
}

class DeploymentQueue extends EventEmitter {
  private queue: Job[] = [];
  private running = false;
  private activeJobs = new Map<string, boolean>();

  enqueue(job: Job) {
    this.queue.push(job);
    this.activeJobs.set(job.deploymentId, true);
    logger.info(`Job enqueued: ${job.action} for deployment ${job.deploymentId}`);
    this.processNext();
  }

  isActive(deploymentId: string): boolean {
    return this.activeJobs.has(deploymentId);
  }

  private async processNext() {
    if (this.running) return;
    const job = this.queue.shift();
    if (!job) return;

    this.running = true;
    try {
      await job.execute();
    } catch (err) {
      logger.error(`Job failed: ${job.action} for deployment ${job.deploymentId}`, { error: (err as Error).message });
    } finally {
      this.activeJobs.delete(job.deploymentId);
      this.running = false;
      this.processNext();
    }
  }
}

export const deploymentQueue = new DeploymentQueue();
