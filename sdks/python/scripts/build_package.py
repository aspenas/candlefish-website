#!/usr/bin/env python3
"""
Build script for the Candlefish Claude Config Python SDK.

This script helps build and verify the package before publishing to PyPI.
"""

import os
import subprocess
import sys
from pathlib import Path


def run_command(command: str, description: str) -> bool:
    """Run a shell command and return success status."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        if result.stdout.strip():
            print(f"   {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed: {e}")
        if e.stderr:
            print(f"   Error: {e.stderr}")
        return False


def check_dependencies() -> bool:
    """Check if required build dependencies are available."""
    print("🔍 Checking build dependencies...")
    
    required_packages = ["build", "twine", "pytest"]
    missing_packages = []
    
    for package in required_packages:
        if not run_command(f"python -c 'import {package}'", f"Checking {package}"):
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing required packages: {', '.join(missing_packages)}")
        print("   Install them with: pip install build twine pytest")
        return False
    
    print("✅ All build dependencies are available")
    return True


def run_tests() -> bool:
    """Run the test suite."""
    print("\n🧪 Running tests...")
    
    # Run pytest with coverage
    if not run_command("python -m pytest tests/ -v --cov=candlefish_claude_config --cov-report=term-missing", "Running test suite"):
        return False
    
    print("✅ All tests passed")
    return True


def run_linting() -> bool:
    """Run code quality checks."""
    print("\n🔍 Running code quality checks...")
    
    # Check if linting tools are available
    linting_tools = {
        "black": "python -m black --check candlefish_claude_config/",
        "isort": "python -m isort --check-only candlefish_claude_config/",
        "mypy": "python -m mypy candlefish_claude_config/",
        "flake8": "python -m flake8 candlefish_claude_config/"
    }
    
    all_passed = True
    
    for tool, command in linting_tools.items():
        try:
            subprocess.run(f"python -c 'import {tool}'", shell=True, check=True, capture_output=True)
            if not run_command(command, f"Running {tool}"):
                print(f"   ℹ️  {tool} checks failed (non-critical)")
                # Don't fail the build for linting issues
        except subprocess.CalledProcessError:
            print(f"   ⚠️  {tool} not available, skipping")
    
    return True


def build_package() -> bool:
    """Build the package."""
    print("\n📦 Building package...")
    
    # Clean previous builds
    run_command("rm -rf build/ dist/ *.egg-info/", "Cleaning previous builds")
    
    # Build the package
    if not run_command("python -m build", "Building wheel and source distribution"):
        return False
    
    # Check the built packages
    if not run_command("python -m twine check dist/*", "Checking built packages"):
        return False
    
    print("✅ Package built successfully")
    return True


def verify_package() -> bool:
    """Verify the built package."""
    print("\n🔍 Verifying package contents...")
    
    # List contents of the wheel
    wheel_files = list(Path("dist").glob("*.whl"))
    if not wheel_files:
        print("❌ No wheel file found")
        return False
    
    wheel_file = wheel_files[0]
    if not run_command(f"python -m zipfile -l {wheel_file}", f"Listing contents of {wheel_file.name}"):
        return False
    
    # Check if we can install and import the package
    print("\n🔍 Testing package installation...")
    
    # Create a temporary virtual environment for testing
    test_env = "test_env"
    
    try:
        if not run_command(f"python -m venv {test_env}", "Creating test environment"):
            return False
        
        if not run_command(f"{test_env}/bin/pip install {wheel_file}", "Installing package in test environment"):
            return False
        
        if not run_command(f"{test_env}/bin/python -c 'import candlefish_claude_config; print(f\"SDK version: {{candlefish_claude_config.__version__}}\")'", "Testing package import"):
            return False
        
        print("✅ Package installation and import successful")
        return True
    
    finally:
        # Clean up test environment
        run_command(f"rm -rf {test_env}", "Cleaning up test environment")


def show_package_info():
    """Show information about the built package."""
    print("\n📊 Package Information:")
    
    wheel_files = list(Path("dist").glob("*.whl"))
    sdist_files = list(Path("dist").glob("*.tar.gz"))
    
    if wheel_files:
        wheel_file = wheel_files[0]
        wheel_size = wheel_file.stat().st_size
        print(f"   📦 Wheel: {wheel_file.name} ({wheel_size:,} bytes)")
    
    if sdist_files:
        sdist_file = sdist_files[0]
        sdist_size = sdist_file.stat().st_size
        print(f"   📦 Source dist: {sdist_file.name} ({sdist_size:,} bytes)")
    
    print(f"   📁 Build artifacts: {len(list(Path('dist').iterdir()))} files")


def show_publish_instructions():
    """Show instructions for publishing to PyPI."""
    print("\n🚀 Ready to publish!")
    print("   To publish to PyPI, run:")
    print("   ")
    print("   # Test on PyPI Test (recommended first)")
    print("   python -m twine upload --repository testpypi dist/*")
    print("   ")
    print("   # Publish to PyPI")
    print("   python -m twine upload dist/*")
    print("   ")
    print("   Make sure you have your PyPI credentials configured!")
    print("   Visit: https://candlefish.ai/sdks/python for more information")


def main():
    """Main build script."""
    print("🔨 Candlefish Claude Config Python SDK - Build Script")
    print("=" * 60)
    
    # Change to script directory
    script_dir = Path(__file__).parent
    package_dir = script_dir.parent
    os.chdir(package_dir)
    
    print(f"📁 Working directory: {package_dir}")
    print(f"🐍 Python version: {sys.version}")
    
    # Run all build steps
    steps = [
        ("Check dependencies", check_dependencies),
        ("Run tests", run_tests),
        ("Run linting", run_linting),
        ("Build package", build_package),
        ("Verify package", verify_package)
    ]
    
    for step_name, step_func in steps:
        print(f"\n{'='*20} {step_name} {'='*20}")
        
        if not step_func():
            print(f"\n❌ Build failed at step: {step_name}")
            sys.exit(1)
    
    # Show final information
    print("\n" + "="*60)
    print("🎉 BUILD SUCCESSFUL!")
    print("="*60)
    
    show_package_info()
    show_publish_instructions()


if __name__ == "__main__":
    main()