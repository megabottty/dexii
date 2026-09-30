#!/usr/bin/env node
/**
 * One source of truth for "which build is this?".
 *
 * version  = MAJOR.MINOR from package.json + an automatic BUILD number, so it
 *            climbs with every deploy without anyone editing package.json.
 *            BUILD is the commit count on the built branch. If the checkout is a
 *            shallow clone we try to unshallow it (via the remote, then straight
 *            from GitHub), then ask the GitHub API for the count; only if all of
 *            that fails does BUILD fall back to a UTC timestamp (YYYYMMDDHHMM),
 *            which is 12 digits and so can never be mistaken for a count.
 * build    = short commit (Render sets RENDER_GIT_COMMIT; locally we ask git).
 *
 * `npm run build` calls writeBuildInfo() (via postbuild-index.js), which stamps
 * the client and writes server/build-info.json for /api/version. Requiring this
 * module has no side effects; running it directly writes and prints the file.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD_INFO_PATH = path.join(ROOT, 'server', 'build-info.json');

function git(args, timeout = 5000) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], timeout }).toString().trim();
  } catch {
    return null;
  }
}

/** GitHub URL of this repo: Render sets RENDER_GIT_REPO_SLUG; locally read the origin remote. */
function repoSlug() {
  const fromEnv = process.env.RENDER_GIT_REPO_SLUG;
  if (fromEnv) return fromEnv;
  const origin = git('remote get-url origin') || '';
  const match = origin.match(/github\.com[/:]([^/]+\/[^/.]+)/);
  return match ? match[1] : null;
}

/**
 * Commit count via the GitHub API (public repo): the Link header of
 * /commits?sha=<commit>&per_page=1 names the last page, which is the count.
 * Runs in a child Node process so this module can stay synchronous.
 */
function commitCountFromGitHub(slug, commit) {
  if (!slug || !commit) return null;
  const script = `
    const url = 'https://api.github.com/repos/${slug}/commits?sha=${commit}&per_page=1';
    fetch(url, { headers: { 'User-Agent': 'dexii-build', Accept: 'application/vnd.github+json' } })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const link = res.headers.get('link') || '';
        const last = link.match(/[?&]page=(\\d+)>; rel="last"/);
        process.stdout.write(last ? last[1] : '1');
      })
      .catch((err) => { process.stderr.write(String(err.message)); process.exit(1); });
  `;
  try {
    const out = execSync(`"${process.execPath}" -e "${script.replace(/"/g, '\\"')}"`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000
    }).toString().trim();
    return /^\d+$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

function buildNumber() {
  const isShallow = () => git('rev-parse --is-shallow-repository') === 'true';
  const hasGit = git('rev-parse --is-shallow-repository') !== null;

  if (hasGit && isShallow()) {
    // Render clones shallowly. Try to pull the history in: first through whatever remote
    // is configured, then straight from GitHub (the repo is public).
    git('fetch --unshallow --quiet', 60000);
    if (isShallow()) {
      const slug = repoSlug();
      const branch = process.env.RENDER_GIT_BRANCH || 'HEAD';
      if (slug) git(`fetch --unshallow --quiet https://github.com/${slug}.git ${branch}`, 60000);
    }
    if (isShallow()) console.warn('build-info: could not unshallow the git checkout');
  }

  if (hasGit && !isShallow()) {
    const count = git('rev-list --count HEAD');
    if (count && /^\d+$/.test(count)) return { number: count, source: 'commits' };
  }

  const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || git('rev-parse HEAD');
  const fromGitHub = commitCountFromGitHub(repoSlug(), commit);
  if (fromGitHub) return { number: fromGitHub, source: 'github' };

  console.warn('build-info: no commit count available, using a timestamp');
  return { number: new Date().toISOString().replace(/\D/g, '').slice(0, 12), source: 'timestamp' };
}

function computeBuildInfo() {
  const pkg = require(path.join(ROOT, 'package.json'));
  const [major = '0', minor = '0'] = String(pkg.version || '0.0.0').split('.');
  const { number, source } = buildNumber();
  const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || git('rev-parse HEAD') || null;
  return {
    version: `${major}.${minor}.${number}`,
    buildNumberSource: source,
    commit,
    build: commit ? commit.slice(0, 7) : 'dev',
    branch: process.env.RENDER_GIT_BRANCH || git('rev-parse --abbrev-ref HEAD') || null,
    commitMessage: git('log -1 --pretty=%s'),
    buildTime: new Date().toISOString()
  };
}

function writeBuildInfo(info = computeBuildInfo()) {
  fs.writeFileSync(BUILD_INFO_PATH, JSON.stringify(info, null, 2) + '\n');
  return info;
}

module.exports = { computeBuildInfo, writeBuildInfo, commitCountFromGitHub, BUILD_INFO_PATH };

if (require.main === module) {
  console.log(JSON.stringify(writeBuildInfo(), null, 2));
}
