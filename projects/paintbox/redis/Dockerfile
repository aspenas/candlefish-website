FROM redis:7-alpine

# Create data directory with proper permissions
RUN mkdir -p /data && chown redis:redis /data

# Copy Redis configuration
COPY redis.conf /usr/local/etc/redis/redis.conf
RUN chown redis:redis /usr/local/etc/redis/redis.conf

# Switch to non-root user (redis user already exists in the base image)
USER redis

# Expose Redis port
EXPOSE 6379

# Run Redis with custom configuration
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
