FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    pyyaml \
    requests \
    anthropic \
    openai \
    psycopg2-binary \
    redis \
    boto3

# Copy configuration
COPY nanda-config.yaml /config/

# Create a simple NANDA agent runner
RUN echo '#!/usr/bin/env python3\n\
import os\n\
import time\n\
import yaml\n\
import logging\n\
\n\
logging.basicConfig(level=logging.INFO)\n\
logger = logging.getLogger("NANDA")\n\
\n\
def main():\n\
    config_path = os.getenv("NANDA_CONFIG", "/config/nanda-config.yaml")\n\
    logger.info(f"Starting NANDA agent with config: {config_path}")\n\
    \n\
    with open(config_path, "r") as f:\n\
        config = yaml.safe_load(f)\n\
    \n\
    logger.info(f"NANDA Agent {config.get(\"name\")} v{config.get(\"version\")} started")\n\
    \n\
    # Keep the container running\n\
    while True:\n\
        time.sleep(60)\n\
        logger.debug("NANDA agent heartbeat")\n\
\n\
if __name__ == "__main__":\n\
    main()' > /app/nanda_agent.py

RUN chmod +x /app/nanda_agent.py

CMD ["python", "/app/nanda_agent.py"]
