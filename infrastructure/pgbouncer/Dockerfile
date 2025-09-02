# PgBouncer Docker Image for Candlefish
FROM alpine:3.18

# Install PgBouncer and dependencies
RUN apk --no-cache add \
    pgbouncer \
    postgresql-client \
    ca-certificates \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Create pgbouncer user and directories
RUN adduser -D -s /bin/bash pgbouncer \
    && mkdir -p /var/log/pgbouncer /var/run/pgbouncer /etc/pgbouncer \
    && chown -R pgbouncer:pgbouncer /var/log/pgbouncer /var/run/pgbouncer /etc/pgbouncer

# Copy configuration files
COPY pgbouncer-config.ini /etc/pgbouncer/pgbouncer.ini
COPY entrypoint.sh /entrypoint.sh
COPY health-check.sh /health-check.sh

# Make scripts executable
RUN chmod +x /entrypoint.sh /health-check.sh

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD /health-check.sh || exit 1

# Expose PgBouncer port
EXPOSE 6432

# Run as pgbouncer user
USER pgbouncer

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]