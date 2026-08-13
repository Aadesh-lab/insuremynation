#!/bin/sh
set -e

# No migration step: this service is a stateless proxy with no database.
echo "Starting server..."
exec ./bin/imagine_backend
