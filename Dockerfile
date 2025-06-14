FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY migrations/ ./migrations/

# Set Python path
ENV PYTHONPATH=/app/src

# Create non-root user
RUN useradd --create-home --shell /bin/bash agent-core
RUN chown -R agent-core:agent-core /app
USER agent-core

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "agent_core.main:app", "--host", "0.0.0.0", "--port", "8000"] 