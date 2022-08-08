#!/bin/bash

if command -v shellcheck >/dev/null; then
    shellcheck "$1"
else
    echo "Error: shellcheck must be installed before committing to ensure linting can be executed"
    echo "       please see https://github.com/koalaman/shellcheck#installing for installation instructions"
    exit 1
fi
