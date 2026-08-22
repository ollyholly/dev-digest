import type { WireAgent } from '../adapter/wire-schemas.js';

export type AgentProjection = {
  id: string;
  name: string;
  description: string;
  provider: string;
  model: string;
  enabled: boolean;
  repo_intel: boolean;
};

export function projectAgents(agents: WireAgent[]): { agents: AgentProjection[] } {
  return {
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      provider: a.provider,
      model: a.model,
      enabled: a.enabled,
      repo_intel: a.repo_intel ?? true,
    })),
  };
}
