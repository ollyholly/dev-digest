export type BlastRadiusStub = {
  implemented: false;
  message: string;
  repo_id: string;
  changed_files: string[];
};

const STUB_MESSAGE =
  'Blast radius is not implemented in the lab build. Complete the L04 homework to wire repo-intel.';

export class BlastRadiusService {
  getStub(repoId: string, changedFiles: string[]): BlastRadiusStub {
    return {
      implemented: false,
      message: STUB_MESSAGE,
      repo_id: repoId,
      changed_files: changedFiles,
    };
  }
}
