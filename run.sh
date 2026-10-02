#!/bin/sh
set -eu
cd "$(dirname "$0")"
${CC:-cc} -std=c11 -O2 -Wall -Wextra server.c -o deadlock-lab
exec ./deadlock-lab "${1:-8080}"
