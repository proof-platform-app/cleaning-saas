# Production Deployment v1 — CleanProof

> **Target:** Ubuntu 22.04 VPS with Nginx + Gunicorn + PostgreSQL + HTTPS
> **Domain:** app.cleanproof.com
> **Last Updated:** 2026-02-13

---

## Directory Structure (Final)

```
/opt/cleanproof/
├── backend/                    # Django application
│   ├── venv/                   # Python virtual environment
│   ├── staticfiles/            # collectstatic output (served by Nginx)
│   ├── media/                  # User uploads (logos, photos)
│   │   └── company_logos/      # Company logo uploads
│   ├── .env.production         # Production environment (SECRET!)
│   └── config/                 # Django settings
├── frontend/                   # Built React SPA (dist/ contents)
│   ├── index.html
│   └── assets/
├── logs/                       # Gunicorn logs
│   ├── gunicorn_access.log
│   └── gunicorn_error.log
└── backups/                    # (optional, can use /var/backups)
```

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Setup](#2-server-setup)
3. [PostgreSQL Setup](#3-postgresql-setup)
4. [Backend Deployment](#4-backend-deployment)
5. [Nginx Configuration](#5-nginx-configuration)
6. [HTTPS Setup (Let's Encrypt)](#6-https-setup-lets-encrypt)
7. [Frontend Deployment](#7-frontend-deployment)
8. [Systemd Services](#8-systemd-services)
9. [Backups](#9-backups)
10. [Monitoring & Logs](#10-monitoring--logs)
11. [Verification Checklist](#11-verification-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

### Required Access
- SSH access to VPS (root or sudo user)
- Domain DNS configured: `app.cleanproof.com` → VPS IP
- Git repository access

### VPS Requirements
- Ubuntu 22.04 LTS
- Minimum 1GB RAM, 20GB disk
- Public IPv4 address

---

## 2. Server Setup

### 2.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Required Packages

```bash
# Python and build tools
sudo apt install -y python3 python3-pip python3-venv python3-dev build-essential

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib libpq-dev

# Nginx
sudo apt install -y nginx

# Certbot (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Node.js 20.x (for frontend build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Git
sudo apt install -y git

# Useful tools
sudo apt install -y curl htop
```

### 2.3 Create Application User

```bash
# Create user without password (login via sudo only)
sudo adduser --system --group --home /opt/cleanproof cleanproof

# Create directory structure
sudo mkdir -p /opt/cleanproof/{backend,frontend,logs,backups}
sudo chown -R cleanproof:cleanproof /opt/cleanproof
```

### 2.4 Configure Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify
sudo ufw status
```

---

## 3. PostgreSQL Setup

### 3.1 Generate Secure Password

```bash
# Generate a 32-character random password (save this!)
openssl rand -base64 32
```

### 3.2 Create Database and User

```bash
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE USER cleanproof WITH PASSWORD 'YOUR_GENERATED_PASSWORD';
CREATE DATABASE cleanproof OWNER cleanproof;
GRANT ALL PRIVILEGES ON DATABASE cleanproof TO cleanproof;
\q
```

### 3.3 Test Connection

```bash
psql -U cleanproof -h localhost -d cleanproof
# Enter password when prompted, type \q to exit
```

---

## 4. Backend Deployment

### 4.1 Clone Repository

```bash
cd /opt/cleanproof
sudo -u cleanproof git clone YOUR_REPO_URL backend
```

### 4.2 Create Virtual Environment & Install Dependencies

```bash
cd /opt/cleanproof/backend
sudo -u cleanproof python3 -m venv venv
sudo -u cleanproof ./venv/bin/pip install --upgrade pip
sudo -u cleanproof ./venv/bin/pip install -r requirements.txt
sudo -u cleanproof ./venv/bin/pip install gunicorn psycopg2-binary
```

### 4.3 Create Environment File

Copy the example and edit:
```bash
sudo -u cleanproof cp .env.production.example .env.production
sudo nano /opt/cleanproof/backend/.env.production
```

**Required values:**
```bash
# Security
DEBUG=False
SECRET_KEY=<run: python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
ALLOWED_HOSTS=app.cleanproof.com
CORS_ORIGINS=https://app.cleanproof.com
CSRF_TRUSTED_ORIGINS=https://app.cleanproof.com
SECURE_SSL_REDIRECT=True

# Database
DATABASE_URL=postgres://cleanproof:YOUR_DB_PASSWORD@localhost:5432/cleanproof

# Email (Gmail SMTP)
EMAIL_HOST_PASSWORD=<your-gmail-app-password>
```

Set secure permissions:
```bash
sudo chmod 600 /opt/cleanproof/backend/.env.production
sudo chown cleanproof:cleanproof /opt/cleanproof/backend/.env.production
```

### 4.4 Run Migrations & Collect Static

```bash
cd /opt/cleanproof/backend

# Load env and run migrations
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && ./venv/bin/python manage.py migrate'

# Collect static files
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && ./venv/bin/python manage.py collectstatic --noinput'
```

### 4.5 Verify Django Config

```bash
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && ./venv/bin/python manage.py check --deploy'
```

### 4.6 Create Media Directory

```bash
sudo -u cleanproof mkdir -p /opt/cleanproof/backend/media/company_logos
sudo chmod 755 /opt/cleanproof/backend/media
```

---

## 5. Nginx Configuration

### 5.1 Create Site Configuration

```bash
sudo nano /etc/nginx/sites-available/cleanproof
```

**Full configuration:**
```nginx
# CleanProof Production Configuration
# Domain: app.cleanproof.com

upstream cleanproof_api {
    server 127.0.0.1:8000;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name app.cleanproof.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.cleanproof.com;

    # SSL (certbot will fill these in)
    ssl_certificate /etc/letsencrypt/live/app.cleanproof.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.cleanproof.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Logging
    access_log /var/log/nginx/cleanproof_access.log;
    error_log /var/log/nginx/cleanproof_error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Client max body size (file uploads)
    client_max_body_size 10M;

    # ==========================
    # API Backend (/api/)
    # ==========================
    location /api/ {
        proxy_pass http://cleanproof_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://cleanproof_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ==========================
    # Static Files (Django)
    # ==========================
    location /static/ {
        alias /opt/cleanproof/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ==========================
    # Media Files (User uploads)
    # ==========================
    location /media/ {
        alias /opt/cleanproof/backend/media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # ==========================
    # Frontend (React SPA)
    # ==========================
    location / {
        root /opt/cleanproof/frontend;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 5.2 Enable Site

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/cleanproof /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. HTTPS Setup (Let's Encrypt)

### 6.1 Obtain Certificate

```bash
sudo certbot --nginx -d app.cleanproof.com
```

Follow the prompts and choose to redirect HTTP to HTTPS.

### 6.2 Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## 7. Frontend Deployment

### 7.1 Build Frontend (on dev machine)

```bash
cd dubai-control

# Create production env
cp .env.production.example .env.production
# Edit VITE_API_BASE_URL=https://app.cleanproof.com

# Install & build
npm ci
npm run build
```

### 7.2 Deploy to Server

```bash
# From dev machine
rsync -avz --delete dist/ user@server:/opt/cleanproof/frontend/

# On server: fix permissions
sudo chown -R cleanproof:cleanproof /opt/cleanproof/frontend
```

---

## 8. Systemd Services

### 8.1 Create Gunicorn Service

```bash
sudo nano /etc/systemd/system/cleanproof-api.service
```

Content:
```ini
[Unit]
Description=CleanProof API (Gunicorn)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=notify
User=cleanproof
Group=cleanproof
WorkingDirectory=/opt/cleanproof/backend
EnvironmentFile=/opt/cleanproof/backend/.env.production
ExecStart=/opt/cleanproof/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    --timeout 60 \
    --access-logfile /opt/cleanproof/logs/gunicorn_access.log \
    --error-logfile /opt/cleanproof/logs/gunicorn_error.log \
    --capture-output \
    config.wsgi:application
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 8.2 Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable cleanproof-api
sudo systemctl start cleanproof-api
sudo systemctl status cleanproof-api
```

---

## 9. Backups

### 9.1 Create Backup Script

```bash
sudo nano /usr/local/bin/cleanproof_backup_db.sh
```

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/cleanproof"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cleanproof_db_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"
sudo -u postgres pg_dump cleanproof | gzip > "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "cleanproof_db_*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup: $BACKUP_FILE"
```

```bash
sudo chmod +x /usr/local/bin/cleanproof_backup_db.sh
```

### 9.2 Schedule Daily Backup

```bash
echo "0 3 * * * /usr/local/bin/cleanproof_backup_db.sh >> /var/log/cleanproof_backup.log 2>&1" | sudo crontab -
```

---

## 10. Monitoring & Logs

### View Logs

```bash
# Gunicorn service
sudo journalctl -u cleanproof-api -f

# Nginx
tail -f /var/log/nginx/cleanproof_access.log
tail -f /var/log/nginx/cleanproof_error.log

# Gunicorn files
tail -f /opt/cleanproof/logs/gunicorn_error.log
```

### Service Status

```bash
sudo systemctl status cleanproof-api
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

## 11. Verification Checklist

Run these after deployment:

```bash
# 1. Django deployment check
sudo -u cleanproof bash -c 'cd /opt/cleanproof/backend && set -a && source .env.production && set +a && ./venv/bin/python manage.py check --deploy'

# 2. Health endpoint (no auth required)
curl -I https://app.cleanproof.com/api/health/
# Expected: HTTP/2 200

# 3. Frontend loads
curl -I https://app.cleanproof.com/
# Expected: HTTP/2 200

# 4. Static files
curl -I https://app.cleanproof.com/static/admin/css/base.css
# Expected: HTTP/2 200

# 5. SSL certificate valid
echo | openssl s_client -servername app.cleanproof.com -connect app.cleanproof.com:443 2>/dev/null | openssl x509 -noout -dates
```

### RBAC Quick Check

```bash
# Login as Owner → should succeed
curl -X POST https://app.cleanproof.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"xxx"}'

# Owner billing access → 200
# Staff billing access → 403 FORBIDDEN
```

---

## 12. Troubleshooting

### 502 Bad Gateway
```bash
sudo systemctl status cleanproof-api
sudo journalctl -u cleanproof-api -n 50
sudo ss -tlnp | grep 8000
```

### Static/Media Not Loading
```bash
ls -la /opt/cleanproof/backend/staticfiles/
ls -la /opt/cleanproof/backend/media/
sudo nginx -t
```

### Database Connection Error
```bash
sudo systemctl status postgresql
psql -U cleanproof -h localhost -d cleanproof
```

---

## Quick Reference

### Key Paths

| Resource | Path |
|----------|------|
| Backend code | `/opt/cleanproof/backend/` |
| Frontend build | `/opt/cleanproof/frontend/` |
| Env file | `/opt/cleanproof/backend/.env.production` |
| Static files | `/opt/cleanproof/backend/staticfiles/` |
| Media uploads | `/opt/cleanproof/backend/media/` |
| Gunicorn logs | `/opt/cleanproof/logs/` |
| Nginx config | `/etc/nginx/sites-available/cleanproof` |
| Systemd service | `/etc/systemd/system/cleanproof-api.service` |
| DB backups | `/var/backups/cleanproof/` |

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/` | Health check (no auth, 200 OK) |
| `POST /api/auth/login/` | User login |
| `GET /api/settings/billing/` | Billing info (Owner/Manager) |

### Useful Commands

```bash
# Restart API
sudo systemctl restart cleanproof-api

# View live logs
sudo journalctl -u cleanproof-api -f

# Run migrations
cd /opt/cleanproof/backend
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && ./venv/bin/python manage.py migrate'

# Collect static
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && ./venv/bin/python manage.py collectstatic --noinput'
```

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-13 | v1.1: Fixed health endpoint path, clarified paths, added frontend env |
| 2026-02-13 | v1.0: Initial deployment guide |
