#!/bin/bash

# Inject Linkerd into all deployments
set -e

echo "🔗 Injecting Linkerd into deployments..."

# Namespaces to inject
NAMESPACES=("default" "production" "staging")

for ns in "${NAMESPACES[@]}"; do
    echo "Processing namespace: $ns"

    # Get all deployments in namespace
    deployments=$(kubectl get deploy -n $ns -o name 2>/dev/null || echo "")

    if [ -n "$deployments" ]; then
        for deploy in $deployments; do
            echo "  Injecting Linkerd into $deploy..."
            kubectl get $deploy -n $ns -o yaml | \
                linkerd inject - | \
                kubectl apply -f -
        done
    fi
done

# Apply service profiles
echo "Applying service profiles..."
kubectl apply -f linkerd-config.yaml

# Enable automatic injection for new deployments
for ns in "${NAMESPACES[@]}"; do
    kubectl annotate namespace $ns linkerd.io/inject=enabled --overwrite
done

echo "✅ Linkerd injection complete!"
echo ""
echo "View metrics with:"
echo "  linkerd viz stat deploy"
echo ""
echo "Access dashboard:"
echo "  linkerd viz dashboard"
