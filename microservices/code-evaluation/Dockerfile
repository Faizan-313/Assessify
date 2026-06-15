FROM python:3.10-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends g++ nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

EXPOSE 7000

CMD ["python3", "app.py", "--serve"]
