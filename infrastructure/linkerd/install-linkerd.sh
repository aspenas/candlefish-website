#!/bin/bash

# Linkerd Installation Script - Following https://linkerd.io/2.18/getting-started/
set -e

echo "🔗 Installing Linkerd 2.18 Service Mesh..."

# Step 1: Install the CLI
if ! command -v linkerd &> /dev/null; then
    echo "Installing Linkerd CLI..."
    curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
    export PATH=$PATH:$HOME/.linkerd2/bin
    echo 'export PATH=$PATH:$HOME/.linkerd2/bin' >> ~/.zshrc
fi

# Step 2: Validate Kubernetes cluster
echo "Validating Kubernetes cluster..."
linkerd check --pre

# Step 3: Install Linkerd control plane
echo "Installing Linkerd control plane..."
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Step 4: Verify installation
echo "Verifying Linkerd installation..."
linkerd check

# Step 5: Install Viz extension for observability
echo "Installing Linkerd Viz extension..."
linkerd viz install | kubectl apply -f -
linkerd viz check

# Step 6: Install Jaeger extension for distributed tracing
echo "Installing Linkerd Jaeger extension..."
linkerd jaeger install | kubectl apply -f -
linkerd jaeger check

echo "✅ Linkerd installation complete!"
echo ""
echo "Access the dashboard with:"
echo "  linkerd viz dashboard"
echo ""
echo "To inject Linkerd into a deployment:"
echo "  kubectl get deploy -o yaml | linkerd inject - | kubectl apply -f -"
