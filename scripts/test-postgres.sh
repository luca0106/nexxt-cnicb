#!/usr/bin/env bash
set -euo pipefail
repo_dir=$(cd "$(dirname "$0")/.." && pwd)
pg_bin=$(pg_config --bindir)
pg_test_dir=$(mktemp -d /tmp/bankdesk-pg.XXXXXX)
cleanup() {
  "$pg_bin/pg_ctl" -D "$pg_test_dir/data" -m fast -w stop >/dev/null 2>&1 || true
  rm -rf -- "$pg_test_dir"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$pg_test_dir/data" --auth=trust --no-locale --encoding=UTF8 > "$pg_test_dir/init.log"
"$pg_bin/pg_ctl" -D "$pg_test_dir/data" -l "$pg_test_dir/server.log" -o "-k $pg_test_dir -h ''" -w start
cd "$repo_dir/backend"
TEST_POSTGRES_URL="postgresql://$(id -un)@/postgres?host=$pg_test_dir" ../venv/bin/python -m unittest discover -s tests -v
