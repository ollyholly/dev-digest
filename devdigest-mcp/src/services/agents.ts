import type { DevDigestApiPort } from '../port/devdigest-api.js';
import { projectAgents } from '../projections/agents.js';

export class AgentsService {
  constructor(private readonly api: DevDigestApiPort) {}

  async list(enabledOnly: boolean) {
    const agents = await this.api.listAgents();
    const filtered = enabledOnly ? agents.filter((a) => a.enabled) : agents;
    return projectAgents(filtered);
  }
}
