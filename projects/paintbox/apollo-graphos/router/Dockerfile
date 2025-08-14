# Apollo Router Dockerfile
FROM ghcr.io/apollographql/router:v1.33.0 AS runtime

# Create app user for security
USER 1001

# Copy router configuration
COPY --chown=1001:1001 router.yaml /dist/config/router.yaml
COPY --chown=1001:1001 supergraph-schema.graphql /dist/config/supergraph-schema.graphql

# Set configuration environment variables
ENV APOLLO_ROUTER_CONFIG_PATH=/dist/config/router.yaml
ENV APOLLO_ROUTER_SUPERGRAPH_PATH=/dist/config/supergraph-schema.graphql
ENV APOLLO_ROUTER_LOG=info
ENV APOLLO_ROUTER_LISTEN=0.0.0.0:4100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4100/health || exit 1

# Expose port
EXPOSE 4100

# Start the router
ENTRYPOINT ["./router"]
