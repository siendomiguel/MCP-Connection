FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Environment variables (override with railway or .env file)
ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO
# Crucial to run in SSE mode
ENV MCP_TRANSPORT=sse

# Note: Railway automatically sets PORT environment variable
# The application will use PORT if set, otherwise defaults to 8000

# Run the MCP server
CMD ["python", "main.py"]
