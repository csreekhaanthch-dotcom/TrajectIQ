# TrajectIQ Enterprise Deployment Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [High Availability Setup](#high-availability-setup)
5. [Security Configuration](#security-configuration)
6. [Monitoring & Observability](#monitoring--observability)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRAJECTIQ ENTERPRISE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │   Frontend  │────▶│   API       │────▶│  Database   │           │
│  │   (React)   │     │   Gateway   │     │ (SQLCipher) │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│         │                  │                   │                    │
│         │                  ▼                   │                    │
│         │           ┌─────────────┐           │                    │
│         │           │   Scoring   │           │                    │
│         │           │   Engine    │◀──────────┘                    │
│         │           └─────────────┘                                │
│         │                  │                                        │
│         │                  ▼                                        │
│         │           ┌─────────────┐                                │
│         │           │    Redis    │                                │
│         │           │   (Cache)   │                                │
│         │           └─────────────┘                                │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                  Load Balancer (Nginx)                   │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Docker Deployment

### Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 4GB RAM minimum
- 20GB storage

### Quick Start

```bash
# Clone repository
git clone https://github.com/csreekhaanthch-dotcom/TrajectIQ.git
cd TrajectIQ

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f trajectiq
```

### Dockerfile

```dockerfile
# TrajectIQ Enterprise Docker Image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-xinerama0 \
    libxcb-xkb1 \
    libxkbcommon-x11-0 \
    sqlite3 \
    libsqlcipher-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY assets/ ./assets/
COPY tools/ ./tools/

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/backups

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV TRAJECTIQ_ENV=production
ENV TRAJECTIQ_DATA_DIR=/app/data
ENV TRAJECTIQ_LOG_DIR=/app/logs

# Create non-root user
RUN useradd -m -u 1000 trajectiq && \
    chown -R trajectiq:trajectiq /app
USER trajectiq

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sys; sys.exit(0)" || exit 1

# Default command
CMD ["python", "src/main.py"]
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  trajectiq:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: trajectiq-app
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - TRAJECTIQ_ENV=production
      - TRAJECTIQ_SECRET_KEY=${SECRET_KEY}
      - TRAJECTIQ_LICENSE_KEY=${LICENSE_KEY}
      - DATABASE_URL=sqlite:///data/trajectiq.db
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - trajectiq-data:/app/data
      - trajectiq-logs:/app/logs
      - trajectiq-backups:/app/backups
    depends_on:
      - redis
    networks:
      - trajectiq-network
    healthcheck:
      test: ["CMD", "python", "-c", "import sys; sys.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: trajectiq-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - trajectiq-network
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    container_name: trajectiq-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - trajectiq
    networks:
      - trajectiq-network

volumes:
  trajectiq-data:
  trajectiq-logs:
  trajectiq-backups:
  redis-data:

networks:
  trajectiq-network:
    driver: bridge
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.28+
- kubectl configured
- Helm 3.12+ (optional)
- Persistent storage class

### Namespace Configuration

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: trajectiq
  labels:
    app.kubernetes.io/name: trajectiq
    app.kubernetes.io/managed-by: kubectl
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: trajectiq-config
  namespace: trajectiq
data:
  TRAJECTIQ_ENV: "production"
  TRAJECTIQ_DATA_DIR: "/app/data"
  TRAJECTIQ_LOG_DIR: "/app/logs"
  REDIS_URL: "redis://trajectiq-redis:6379/0"
```

### Secrets

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: trajectiq-secrets
  namespace: trajectiq
type: Opaque
stringData:
  SECRET_KEY: "your-secret-key-here"
  LICENSE_KEY: "TRAJECTIQ-LICENSE-KEY"
  DATABASE_ENCRYPTION_KEY: "your-encryption-key"
```

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trajectiq
  namespace: trajectiq
  labels:
    app: trajectiq
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trajectiq
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: trajectiq
        version: v3.0.2
    spec:
      serviceAccountName: trajectiq
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: trajectiq
          image: trajectiq/enterprise:3.0.2
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
              name: http
          envFrom:
            - configMapRef:
                name: trajectiq-config
            - secretRef:
                name: trajectiq-secrets
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          volumeMounts:
            - name: data
              mountPath: /app/data
            - name: logs
              mountPath: /app/logs
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: trajectiq-data-pvc
        - name: logs
          emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: trajectiq
                topologyKey: kubernetes.io/hostname
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: trajectiq
  namespace: trajectiq
spec:
  type: ClusterIP
  ports:
    - port: 8000
      targetPort: 8000
      name: http
  selector:
    app: trajectiq
---
apiVersion: v1
kind: Service
metadata:
  name: trajectiq-headless
  namespace: trajectiq
spec:
  type: ClusterIP
  clusterIP: None
  ports:
    - port: 8000
      targetPort: 8000
      name: http
  selector:
    app: trajectiq
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trajectiq-ingress
  namespace: trajectiq
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
    - hosts:
        - trajectiq.yourdomain.com
      secretName: trajectiq-tls
  rules:
    - host: trajectiq.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: trajectiq
                port:
                  number: 8000
```

### Redis Deployment

```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trajectiq-redis
  namespace: trajectiq
spec:
  replicas: 1
  selector:
    matchLabels:
      app: trajectiq-redis
  template:
    metadata:
      labels:
        app: trajectiq-redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          volumeMounts:
            - name: redis-data
              mountPath: /data
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: trajectiq-redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: trajectiq-redis
  namespace: trajectiq
spec:
  type: ClusterIP
  ports:
    - port: 6379
      targetPort: 6379
  selector:
    app: trajectiq-redis
```

### Persistent Volume Claims

```yaml
# k8s/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: trajectiq-data-pvc
  namespace: trajectiq
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: trajectiq-redis-pvc
  namespace: trajectiq
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

---

## High Availability Setup

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: trajectiq-hpa
  namespace: trajectiq
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: trajectiq
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Pod Disruption Budget

```yaml
# k8s/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: trajectiq-pdb
  namespace: trajectiq
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: trajectiq
```

---

## Monitoring & Observability

### Prometheus ServiceMonitor

```yaml
# k8s/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: trajectiq-monitor
  namespace: trajectiq
spec:
  selector:
    matchLabels:
      app: trajectiq
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "TrajectIQ Enterprise",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(trajectiq_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Evaluation Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(trajectiq_evaluation_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Active Licenses",
        "type": "stat",
        "targets": [
          {
            "expr": "trajectiq_active_licenses"
          }
        ]
      }
    ]
  }
}
```

---

## Security Configuration

### Network Policy

```yaml
# k8s/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: trajectiq-netpol
  namespace: trajectiq
spec:
  podSelector:
    matchLabels:
      app: trajectiq
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: trajectiq
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: trajectiq-redis
      ports:
        - protocol: TCP
          port: 6379
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

---

## Backup & Recovery

### Automated Backup CronJob

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: trajectiq-backup
  namespace: trajectiq
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: trajectiq/backup:latest
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                  sqlite3 /app/data/trajectiq.db ".backup /backups/trajectiq_$TIMESTAMP.db"
                  find /backups -name "*.db" -mtime +30 -delete
              volumeMounts:
                - name: data
                  mountPath: /app/data
                - name: backups
                  mountPath: /backups
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: trajectiq-data-pvc
            - name: backups
              persistentVolumeClaim:
                claimName: trajectiq-backups-pvc
          restartPolicy: OnFailure
```

---

## Deployment Commands

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pdb.yaml

# Verify deployment
kubectl get pods -n trajectiq
kubectl get services -n trajectiq
kubectl logs -f deployment/trajectiq -n trajectiq

# Scale deployment
kubectl scale deployment trajectiq --replicas=5 -n trajectiq

# Rollback
kubectl rollout undo deployment/trajectiq -n trajectiq
```

---

**Document Version**: 3.0.2
**Last Updated**: March 2025
