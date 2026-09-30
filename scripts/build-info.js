#!/usr/bin/env node
/**
 * One source of truth for "which build is this?".
 *
 * version  = MAJOR.MINOR from package.json + an automatic BUILD number, so it
 *            climbs with every deploy without anyone editing package.json.
 *            BUILD is the commit count on the built branch. If the checkout is a
 *            shallow clone we try to unshallow it; if that fails (or git is
 *            missing) BUILD falls back to a UTC timestamp (YYYYMMDDHHMM), which
 *            is 12 digits and so can never be mistaken for a commit count.
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

function buildNumber() {
  if (git('rev-parse --is-shallow-repository') === 'true') {
    git('fetch --unshallow --quiet', 60000);
  }
  const count = git('rev-parse --is-shallow-repository') === 'false' ? git('rev-list --count HEAD') : null;
  if (count && /^\d+$/.test(count)) return { number: count, source: 'commits' };
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

module.exports = { computeBuildInfo, writeBuildInfo, BUILD_INFO_PATH };

if (require.main === module) {
  console.log(JSON.stringify(writeBuildInfo(), null, 2));
}
