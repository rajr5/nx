#!/usr/bin/env bash

./scripts/link.sh fast

if [ -n "$1" ]; then
  jest --maxWorkers=1 ./build/e2e/schematics/$1.test.js
else
  jest --maxWorkers=1 ./build/e2e/schematics
fi


