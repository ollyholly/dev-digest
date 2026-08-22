import type { DevDigestApiPort } from '../port/devdigest-api.js';
import { projectConventions } from '../projections/conventions.js';

export type ConventionStatusFilter = 'accepted' | 'pending' | 'rejected' | 'all';

export class ConventionsService {
  constructor(private readonly api: DevDigestApiPort) {}

  async list(repoId: string, status: ConventionStatusFilter) {
    const result = await this.api.listConventions(repoId);
    return projectConventions(repoId, result, status);
  }
}
