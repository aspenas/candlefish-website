#!/bin/bash
set -e

# Function to get secret from AWS Secrets Manager
get_secret() {
    aws secretsmanager get-secret-value --secret-id "$1" --query SecretString --output text
}

# Wait for RDS to be available
wait_for_postgres() {
    echo "Waiting for PostgreSQL to be available..."
    until PGPASSWORD=$DB_PASSWORD psql -h "$1" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 2
    done
    echo "PostgreSQL is up - continuing"
}

# Get database credentials from AWS Secrets Manager or environment
if [ -n "$AWS_SECRET_NAME" ]; then
    echo "Fetching credentials from AWS Secrets Manager..."
    SECRET_JSON=$(get_secret "$AWS_SECRET_NAME")
    export DB_HOST=$(echo "$SECRET_JSON" | jq -r '.host')
    export DB_PORT=$(echo "$SECRET_JSON" | jq -r '.port')
    export DB_NAME=$(echo "$SECRET_JSON" | jq -r '.dbname')
    export DB_USERNAME=$(echo "$SECRET_JSON" | jq -r '.username')
    export DB_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.password')
fi

# Update pgbouncer.ini with actual RDS endpoints
sed -i "s/candlefish-postgres-main.xxx.rds.amazonaws.com/${DB_HOST}/g" /etc/pgbouncer/pgbouncer.ini
sed -i "s/candlefish-postgres-read-1.xxx.rds.amazonaws.com/${DB_READ_HOST_1:-$DB_HOST}/g" /etc/pgbouncer/pgbouncer.ini
sed -i "s/candlefish-postgres-read-2.xxx.rds.amazonaws.com/${DB_READ_HOST_2:-$DB_HOST}/g" /etc/pgbouncer/pgbouncer.ini

# Create userlist.txt for authentication
echo "\"$DB_USERNAME\" \"md5$(echo -n "$DB_PASSWORD$DB_USERNAME" | md5sum | cut -d' ' -f1)\"" > /etc/pgbouncer/userlist.txt
echo "\"pgbouncer_admin\" \"md5$(echo -n "${ADMIN_PASSWORD:-admin123}pgbouncer_admin" | md5sum | cut -d' ' -f1)\"" >> /etc/pgbouncer/userlist.txt
echo "\"pgbouncer_stats\" \"md5$(echo -n "${STATS_PASSWORD:-stats123}pgbouncer_stats" | md5sum | cut -d' ' -f1)\"" >> /etc/pgbouncer/userlist.txt

# Set proper permissions
chmod 600 /etc/pgbouncer/userlist.txt

# Wait for main database to be available
wait_for_postgres "$DB_HOST"

# Start PgBouncer
echo "Starting PgBouncer..."
exec pgbouncer /etc/pgbouncer/pgbouncer.ini