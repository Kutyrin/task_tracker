const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const image = 'public.ecr.aws/docker/library/postgres:17';
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';

function run(scenario, requestedImage = image) {
  return spawnSync(bash, ['-c', `
    docker() {
      echo "docker $*"
      case "$1" in
        image) [ "$SCENARIO" = cached ] ;;
        pull)
          case "$SCENARIO" in
            primary) return 0 ;;
            fallback|tag_failure) [[ "$2" == docker.io/library/* ]] ;;
            *) return 1 ;;
          esac ;;
        tag) [ "$SCENARIO" != tag_failure ] ;;
        *) return 99 ;;
      esac
    }
    sleep() { echo "sleep $*"; }
    source .github/scripts/pull-image.sh "$REQUESTED_IMAGE"
  `], {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env, SCENARIO: scenario, REQUESTED_IMAGE: requestedImage },
    encoding: 'utf8',
  });
}

test('cached images do not contact a registry', () => {
  const result = run('cached');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /docker pull/);
});

test('successful ECR pull does not contact the fallback', () => {
  const result = run('primary');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /docker pull public\.ecr\.aws/);
  assert.doesNotMatch(result.stdout, /docker\.io|docker tag/);
});

test('ECR failure pulls the same official tag from Docker Hub and retags it', () => {
  const result = run('fallback');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /docker pull docker\.io\/library\/postgres:17/);
  assert.ok(result.stdout.includes(`docker tag docker.io/library/postgres:17 ${image}`));
  assert.doesNotMatch(result.stdout, /sleep/);
});

test('failure of both registries exits nonzero after bounded backoff', () => {
  const result = run('unavailable');
  assert.equal(result.status, 1);
  assert.equal((result.stdout.match(/docker pull/g) || []).length, 10);
  assert.deepEqual([...result.stdout.matchAll(/sleep (\d+)/g)].map(match => Number(match[1])), [15, 30, 60, 120]);
});

test('a failed retag cannot be reported as success', () => {
  const result = run('tag_failure');
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout, /Image ready/);
});

test('GHCR images are retried without inventing a Docker Hub fallback', () => {
  const result = run('unavailable', 'ghcr.io/axllent/mailpit:v1.31.3');
  assert.equal(result.status, 1);
  assert.equal((result.stdout.match(/docker pull/g) || []).length, 5);
  assert.doesNotMatch(result.stdout, /docker\.io/);
});
