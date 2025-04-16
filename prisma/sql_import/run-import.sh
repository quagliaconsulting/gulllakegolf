#!/bin/bash
set -e

# Database import script using separate SQL files

# Load DB connection info from .env
if [ -f ../../.env ]; then
  export $(grep -v '^#' ../../.env | xargs)
  echo "Loaded environment from ../../.env"
else
  echo "Error: ../../.env file not found"
  exit 1
fi

# Parse the connection string manually
CONNECTION_STRING="${DATABASE_URL}"
DB_USER=$(echo "${CONNECTION_STRING}" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "${CONNECTION_STRING}" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "${CONNECTION_STRING}" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "${CONNECTION_STRING}" | sed -n 's/.*@[^:]*:\([^/]*\)\/.*/\1/p')
DB_NAME=$(echo "${CONNECTION_STRING}" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database connection info:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Set up DB credentials for psql
export PGPASSWORD=$DB_PASS

# Import data from SQL files in order
echo "Importing data tables..."
for table_file in tournament.sql teams.sql courses.sql schedule.sql formats.sql players.sql holes.sql new_tables.sql; do
  echo "Importing $table_file..."
  psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f $table_file
done

echo "Data import completed successfully!"