#!/usr/bin/env bash
# For the Ubuntu 24.04 GitHub-hosted backend runner only.
set -euo pipefail

if [ ! -x /usr/lib/postgresql/17/bin/postgres ]; then
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl --fail --silent --show-error --retry 3 \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main' \
    | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get -o Acquire::Retries=3 update
  sudo apt-get -o Acquire::Retries=3 install -y postgresql-17 postgresql-client-17
fi

# Do not modify the runner's preinstalled main cluster.
sudo pg_createcluster 17 ci --port=5434 --start -- \
  --auth-local=peer --auth-host=scram-sha-256
sudo -u postgres /usr/lib/postgresql/17/bin/psql \
  -h /var/run/postgresql -p 5434 -v ON_ERROR_STOP=1 \
  -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres /usr/lib/postgresql/17/bin/createdb \
  -h /var/run/postgresql -p 5434 task_tracker

for attempt in {1..30}; do
  if version=$(PGPASSWORD=postgres /usr/lib/postgresql/17/bin/psql \
    -h 127.0.0.1 -p 5434 -U postgres -d task_tracker \
    -v ON_ERROR_STOP=1 -Atc 'SHOW server_version_num'); then
    if [[ ! "$version" =~ ^17[0-9]{4}$ ]]; then
      echo "::error::Expected PostgreSQL 17, got $version"
      exit 1
    fi
    echo 'PostgreSQL 17 is ready on port 5434'
    exit 0
  fi
  sleep 1
done
echo '::error::PostgreSQL did not become ready'
exit 1
