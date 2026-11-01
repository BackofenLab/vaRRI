import { spawnSync } from 'node:child_process';

export function readSourceState(directory, run = spawnSync) {
  const git = args => {
    const result = run('git', args, { cwd: directory, encoding: 'utf8' });
    if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
      throw new Error(`Cannot verify recording source: git ${args.join(' ')} failed.`);
    }
    return result.stdout.trim();
  };
  const revision = git(['rev-parse', 'HEAD']);
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision)) throw new Error('Cannot verify recording source revision.');
  return { revision, dirty: Boolean(git(['status', '--porcelain', '--untracked-files=all'])) };
}

export function recordingSourceState(before, after) {
  if (before.revision !== after.revision) {
    throw new Error('Source revision changed during recording; record again from one revision.');
  }
  return { revision: before.revision, dirty: before.dirty || after.dirty };
}
