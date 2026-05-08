# Deployment Guide — VPS KVM (Hostinger)

> **Target:** Ubuntu 24.04 LTS · KVM VPS · Hostinger  
> **Stack:** Nginx · PHP 8.3-FPM · MySQL 8.x · Redis · Supervisor · Certbot  
> **CI/CD:** GitHub Actions  
> **Domains:** `api.yourdomain.com` (Laravel API) · `app.yourdomain.com` (React SPA)

---

## 1. Initial Server Setup

### 1.1 Connect and Update

```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
timedatectl set-timezone Asia/Manila
```

### 1.2 Create Deploy User

```bash
adduser deploy
usermod -aG sudo deploy
# Set up SSH key for deploy user
mkdir -p /home/deploy/.ssh
cat ~/.ssh/authorized_keys > /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 1.3 Harden SSH

```bash
nano /etc/ssh/sshd_config
```
Set:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 22
```
```bash
systemctl restart sshd
```

### 1.4 Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
ufw status
```

### 1.5 Fail2Ban

```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 2. Install Required Software

### 2.1 Nginx

```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

### 2.2 PHP 8.3 + FPM + Extensions

```bash
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php
apt update
apt install -y \
  php8.3 \
  php8.3-fpm \
  php8.3-mysql \
  php8.3-redis \
  php8.3-mbstring \
  php8.3-xml \
  php8.3-curl \
  php8.3-zip \
  php8.3-bcmath \
  php8.3-intl \
  php8.3-tokenizer \
  php8.3-cli \
  php8.3-gd
```

Verify:
```bash
php8.3 -v
php8.3-fpm --version
```

### 2.3 MySQL 8

```bash
apt install mysql-server -y
mysql_secure_installation
# Answer: set root password, remove anon users, disallow remote root, remove test db
```

Create database and user:
```sql
mysql -u root -p
CREATE DATABASE ihris CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ihris_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES, TRIGGER ON ihris.* TO 'ihris_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> **Security:** Do NOT grant `SUPER` or `FILE` to the application user.

### 2.4 Redis

```bash
apt install redis-server -y
nano /etc/redis/redis.conf
```
Set:
```
requirepass YOUR_REDIS_PASSWORD
bind 127.0.0.1
```
```bash
systemctl enable redis-server
systemctl restart redis-server
```

### 2.5 Composer

```bash
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
composer --version
```

### 2.6 Node.js 22 (for frontend build)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

---

## 3. Deploy the Laravel API

### 3.1 Directory Setup

```bash
mkdir -p /var/www/ihris-api
chown -R deploy:www-data /var/www/ihris-api
```

### 3.2 Clone Repository

```bash
su - deploy
cd /var/www/ihris-api
git clone https://github.com/YOUR_ORG/iHRIS.git .
# Or only the api/ subfolder — see CI/CD section
```

### 3.3 Install PHP Dependencies

```bash
cd /var/www/ihris-api/api
composer install --no-dev --optimize-autoloader --no-interaction
```

### 3.4 Configure Environment

```bash
cp .env.example .env
nano .env
```

Production `.env` values:
```env
APP_NAME=iHRIS
APP_ENV=production
APP_KEY=                          # Set via: php artisan key:generate
APP_DEBUG=false
APP_URL=https://api.yourdomain.com
APP_TIMEZONE=Asia/Manila
FRONTEND_URL=https://app.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ihris
DB_USERNAME=ihris_user
DB_PASSWORD=YOUR_STRONG_PASSWORD

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_PORT=6379

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

MAIL_MAILER=smtp
MAIL_HOST=smtp.yourdomain.com
MAIL_PORT=587
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD=YOUR_MAIL_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="iHRIS"

SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com
LOG_CHANNEL=daily
LOG_LEVEL=warning
```

Generate app key:
```bash
php artisan key:generate
```

### 3.5 Run Migrations and Seeders

```bash
php artisan migrate --force
php artisan db:seed --class=ProductionSeeder --force
```

### 3.6 File Permissions

```bash
chown -R deploy:www-data /var/www/ihris-api/api
chmod -R 755 /var/www/ihris-api/api
chmod -R 775 /var/www/ihris-api/api/storage
chmod -R 775 /var/www/ihris-api/api/bootstrap/cache
```

### 3.7 Storage Link

```bash
php artisan storage:link
```

### 3.8 Optimize for Production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## 4. Deploy the React Frontend

### 4.1 Build the Frontend

```bash
cd /var/www/ihris-api/web
npm ci
```

Create production env file:
```bash
nano .env.production
```
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

Build:
```bash
npm run build
```

### 4.2 Copy dist to Web Root

```bash
mkdir -p /var/www/ihris-web
cp -r /var/www/ihris-api/web/dist/* /var/www/ihris-web/
chown -R www-data:www-data /var/www/ihris-web
chmod -R 755 /var/www/ihris-web
```

---

## 5. Nginx Configuration

### 5.1 Laravel API Virtual Host

```bash
nano /etc/nginx/sites-available/ihris-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    root /var/www/ihris-api/api/public;
    index index.php;

    # SSL (Certbot fills these in)
    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none';" always;

    # Hide Nginx version
    server_tokens off;

    # Max upload size
    client_max_body_size 10M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.ht {
        deny all;
    }

    # Block access to sensitive files
    location ~* \.(env|log|sql|bak)$ {
        deny all;
    }

    # Access log
    access_log /var/log/nginx/ihris-api-access.log;
    error_log  /var/log/nginx/ihris-api-error.log;
}
```

### 5.2 React SPA Virtual Host

```bash
nano /etc/nginx/sites-available/ihris-web
```

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    root /var/www/ihris-web;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Content-Security-Policy "default-src 'self' https://api.yourdomain.com; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.yourdomain.com;" always;

    server_tokens off;

    # Serve SPA — all routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/ihris-web-access.log;
    error_log  /var/log/nginx/ihris-web-error.log;
}
```

### 5.3 Enable Sites

```bash
ln -s /etc/nginx/sites-available/ihris-api /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/ihris-web /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 6. SSL Certificates (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y

# Issue certificates for both domains
certbot --nginx -d api.yourdomain.com -d app.yourdomain.com \
  --non-interactive --agree-tos -m your@email.com

# Verify auto-renewal
certbot renew --dry-run
```

Certbot adds a cron job for auto-renewal. Verify:
```bash
systemctl list-timers | grep certbot
```

---

## 7. Supervisor (Queue Workers)

Laravel queues process emails, notifications, report generation, and payroll exports.

```bash
apt install supervisor -y
```

Create config:
```bash
nano /etc/supervisor/conf.d/ihris-worker.conf
```

```ini
[program:ihris-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/ihris-api/api/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=deploy
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/ihris-worker.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
stopwaitsecs=3600
```

```bash
supervisorctl reread
supervisorctl update
supervisorctl start ihris-worker:*
supervisorctl status
```

---

## 8. Laravel Scheduler

Add to crontab for `deploy` user:

```bash
crontab -e -u deploy
```

Add:
```cron
* * * * * cd /var/www/ihris-api/api && php artisan schedule:run >> /dev/null 2>&1
```

Scheduled tasks include:
- Permission cache warm-up
- Attendance auto-absent marking (end of day)
- Leave balance year-end reset
- Payroll report cleanup
- Log pruning

---

## 9. PHP-FPM Tuning

```bash
nano /etc/php/8.3/fpm/pool.d/www.conf
```

For a 2-4 core VPS with 4GB RAM:
```ini
pm = dynamic
pm.max_children = 20
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
pm.max_requests = 500
```

```bash
systemctl restart php8.3-fpm
```

---

## 10. MySQL Tuning

```bash
nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```ini
[mysqld]
innodb_buffer_pool_size = 512M   # ~50% of RAM for DB-heavy VPS
innodb_log_file_size = 128M
max_connections = 100
query_cache_size = 0             # Disable query cache (deprecated in MySQL 8)
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

```bash
systemctl restart mysql
```

---

## 11. GitHub Actions CI/CD Pipeline

Create `.github/workflows/deploy.yml` in the repository:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, bcmath, mysql, redis, zip, xml

      - name: Install Composer dependencies
        run: |
          cd api
          composer install --no-dev --optimize-autoloader --no-interaction

      - name: Run Tests
        run: |
          cd api
          cp .env.testing.ci .env
          php artisan key:generate
          php artisan test --parallel

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Build Frontend
        run: |
          cd web
          npm ci
          echo "VITE_API_BASE_URL=${{ secrets.VITE_API_BASE_URL }}" > .env.production
          npm run build

      - name: Audit dependencies
        run: |
          cd api && composer audit
          cd ../web && npm audit --audit-level=high

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            set -e

            # Pull latest
            cd /var/www/ihris-api
            git pull origin main

            # Backend
            cd api
            composer install --no-dev --optimize-autoloader --no-interaction
            php artisan migrate --force
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache
            php artisan event:cache

            # Frontend
            cd ../web
            npm ci
            npm run build
            cp -r dist/* /var/www/ihris-web/

            # Restart queue workers (pick up code changes)
            sudo supervisorctl restart ihris-worker:*

            # Reload PHP-FPM
            sudo systemctl reload php8.3-fpm
```

### Required GitHub Secrets

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP or hostname |
| `VPS_SSH_KEY` | Private SSH key for `deploy` user |
| `VITE_API_BASE_URL` | `https://api.yourdomain.com/api/v1` |

---

## 12. Zero-Downtime Deployment Notes

Laravel artisan commands run during deployment. To avoid downtime:

1. **Maintenance mode:** Run `php artisan down --render="maintenance"` before migrations if there are breaking schema changes
2. **Queue restart:** After deployment, use `php artisan queue:restart` (or `supervisorctl restart`) to reload workers — existing jobs complete first
3. **Cache clear order:** Always: config cache → route cache → view cache → opcache reset

For rolling zero-downtime deployments at scale, consider `deployer` or `envoyer`. For this VPS setup, brief Nginx reload (< 1 second) is acceptable.

---

## 13. Monitoring and Logs

### Log Locations
```
/var/log/nginx/ihris-api-access.log
/var/log/nginx/ihris-api-error.log
/var/log/nginx/ihris-web-access.log
/var/log/nginx/ihris-web-error.log
/var/log/supervisor/ihris-worker.log
/var/log/mysql/slow.log
/var/www/ihris-api/api/storage/logs/laravel-YYYY-MM-DD.log  (daily rotation)
```

### Useful Commands
```bash
# Tail Laravel logs
tail -f /var/www/ihris-api/api/storage/logs/laravel-$(date +%Y-%m-%d).log

# Check queue worker status
supervisorctl status

# Check failed jobs
cd /var/www/ihris-api/api && php artisan queue:failed

# Retry failed jobs
php artisan queue:retry all

# Monitor Nginx
nginx -t && systemctl status nginx

# Check PHP-FPM
systemctl status php8.3-fpm

# MySQL status
mysqladmin -u root -p status
```

---

## 14. Backup Strategy

### Database Backups

```bash
nano /home/deploy/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/home/deploy/backups/db
mkdir -p $BACKUP_DIR
mysqldump -u ihris_user -p'YOUR_STRONG_PASSWORD' ihris | gzip > $BACKUP_DIR/ihris_$DATE.sql.gz
# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

```bash
chmod +x /home/deploy/backup-db.sh
crontab -e -u deploy
# Add:
0 2 * * * /home/deploy/backup-db.sh
```

### File Backups

```bash
# Back up storage/ (uploads, generated files)
0 3 * * * tar -czf /home/deploy/backups/storage_$(date +\%Y\%m\%d).tar.gz \
  /var/www/ihris-api/api/storage/app 2>/dev/null
```

---

## 15. Production Checklist

Run before going live:

**Security:**
- [ ] `APP_DEBUG=false`
- [ ] SSH password auth disabled
- [ ] UFW firewall enabled (80, 443, 22 only)
- [ ] Fail2ban running
- [ ] `adminer-src.php` removed from `api/public/`
- [ ] MySQL remote root access disabled
- [ ] Redis password set

**Application:**
- [ ] `php artisan migrate --force` ran without errors
- [ ] `php artisan key:generate` run (new key, not `.env.example` default)
- [ ] Storage symlink created (`php artisan storage:link`)
- [ ] All caches cleared and rebuilt
- [ ] Queue worker running (`supervisorctl status`)
- [ ] Cron job added for scheduler

**Connectivity:**
- [ ] `https://api.yourdomain.com/api/v1/health` returns 200
- [ ] `https://app.yourdomain.com` loads the SPA
- [ ] CORS working — frontend can reach API
- [ ] SSL grade A on ssllabs.com

**Backups:**
- [ ] DB backup cron running
- [ ] First manual backup taken
- [ ] Restore procedure tested
