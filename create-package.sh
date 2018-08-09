#!/bin/bash

# Reads a list of package names from standard input and creates a `package.json` file
# that depends on all of them.

cat<<EOF
{
  "name": "fake-project",
  "private": true,
  "optionalDependencies": {
EOF

sep=''
while read pkg
do
    echo "    $sep\"$pkg\": \"*\""
    sep=','
done

cat<<EOF
  }
}
EOF
