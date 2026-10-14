#!/usr/bin/env bash
set -euo pipefail

image=${1:?Usage: pull-image.sh IMAGE}

if docker image inspect "$image" >/dev/null 2>&1; then
  echo "Using local image: $image"
  exit 0
fi

sources=("$image")
case "$image" in
  public.ecr.aws/docker/library/*)
    # Both registries distribute Docker Official Images. Preserve the image tag.
    sources+=("docker.io/library/${image#public.ecr.aws/docker/library/}")
    ;;
esac

for attempt in 1 2 3 4 5; do
  for source in "${sources[@]}"; do
    echo "Pulling $source (attempt $attempt)"
    if docker pull "$source"; then
      if [ "$source" != "$image" ]; then
        docker tag "$source" "$image"
      fi
      echo "Image ready: $image (source: $source)"
      exit 0
    fi
    echo "::warning::Pull failed for $source"
  done

  if [ "$attempt" -lt 5 ]; then
    delay=$((15 * (2 ** (attempt - 1))))
    echo "All sources failed; retrying in ${delay}s"
    sleep "$delay"
  fi
done

echo "::error::Failed to pull $image from all sources after 5 attempts"
exit 1
