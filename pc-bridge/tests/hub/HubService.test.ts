// SPDX-License-Identifier: MIT
/**
 * Tests für den Hub Service.
 */

import { describe, it, expect } from 'vitest';
import { HubService, WorkerClient } from '../../src/hub/index.js';

describe('HubService', () => {
  it('erstellt Hub-Instanz', () => {
    const hub = new HubService(0); // Port 0 = random
    expect(hub).toBeDefined();
    expect(hub.getWorkers()).toHaveLength(0);
    expect(hub.getTasks()).toHaveLength(0);
  });

  it('akzeptiert Task-Submissions', () => {
    const hub = new HubService(0);
    const task = hub.submitTask({
      id: 'test-1',
      title: 'Test Task',
      description: 'Beschreibung',
      requiredCapabilities: ['terminal'],
      payload: { command: 'echo hello' },
    });

    expect(task.status).toBe('queued');
    expect(hub.getTasks()).toHaveLength(1);
  });
});

describe('WorkerClient', () => {
  it('erstellt Worker-Instanz', () => {
    const worker = new WorkerClient({
      hubUrl: 'ws://localhost:9999',
      name: 'Test-Worker',
      capabilities: [
        { type: 'terminal', name: 'shell' },
        { type: 'filesystem', name: 'fs' },
      ],
    });

    expect(worker).toBeDefined();
  });
});
