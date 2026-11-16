# AWS EC2 Production Deployment Guide

This guide walks you through deploying the **Zerodha AI Financial Intelligence Platform** on an **AWS EC2** instance using Docker and Nginx.

---

## 1. Launch AWS EC2 Instance

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/ec2/).
2. Select your preferred AWS Region (Recommended: **ap-south-1 Mumbai** for lowest latency to NSE and Zerodha Kite servers).
3. Click **Launch Instance**:
   - **Name:** `zerodha-ai-platform`
   - **OS / AMI:** Ubuntu Server 24.04 LTS (64-bit x86)
   - **Instance Type:** 
     - *Free Tier testing:* `t2.micro` or `t3.micro` (1 vCPU, 1 GB RAM)
     - *Recommended Production:* `t3.small` (2 vCPU, 2 GB RAM) or `t4g.small`
   - **Key Pair:** Create a new key pair (e.g. `zerodha-key.pem`) and download it.
   - **Storage:** 20 GB gp3 SSD.

### Configure Security Group (Firewall Rules)
Under **Network settings**, allow the following inbound ports:

| Type | Protocol | Port Range | Source | Description |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `My IP` | Secure terminal access |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Web access for frontend & API |
| **HTTPS** | TCP | `443` | `0.0.0.0/0` | SSL secure web access |

Click **Launch Instance**.

---

## 2. Connect to Your EC2 Instance

Open your local terminal and connect using SSH:

```bash
chmod 400 zerodha-key.pem
ssh -i "zerodha-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

## 3. Install Docker & Docker Compose on EC2

Run this quick setup script on the EC2 instance:

```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install Docker, Docker Compose, and Git
sudo apt install -y docker.io docker-compose-v2 git

# Allow your ubuntu user to run Docker commands without sudo
sudo usermod -aG docker ubuntu
newgrp docker

# Verify Docker installation
docker --version
docker compose version
```

---

## 4. Clone Repository & Configure Environment

```bash
# Clone the repository
git clone https://github.com/crushervp/zerodha-ai-financial-intelligence-platform.git
cd zerodha-ai-financial-intelligence-platform

# Create your production environment file
cp .env.example .env

# Edit .env and paste your GEMINI_API_KEY
nano .env
```

Save and exit nano by pressing `Ctrl + O`, `Enter`, and then `Ctrl + X`.

---

## 5. Build and Launch the Application

Launch all services in the background:

```bash
docker compose up -d --build
```

Docker will automatically:
1. Build the Next.js production frontend container.
2. Build the FastAPI Python backend container with all quantitative libraries.
3. Start the Nginx reverse proxy routing port 80 traffic seamlessly between the frontend and API.

---

## 6. Access and Verify the Site

Open your browser and navigate to:

👉 **`http://<YOUR_EC2_PUBLIC_IP>`**

- **Frontend Dashboard:** `http://<YOUR_EC2_PUBLIC_IP>`
- **Operations & Audit Telemetry:** `http://<YOUR_EC2_PUBLIC_IP>/operations`
- **FastAPI OpenAPI Docs:** `http://<YOUR_EC2_PUBLIC_IP>/docs`

---

## 7. Useful Operational Commands

```bash
# Check status of running containers
docker compose ps

# View live consolidated logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Restart services
docker compose restart

# Stop all containers
docker compose down

# Update to latest code from GitHub and restart
git pull origin main
docker compose up -d --build
```

---

## 8. (Optional) Custom Domain & Free SSL with Let's Encrypt

If you point a domain (e.g. `zerodha.yourdomain.com`) to your EC2 Public IP:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx container temporarily to obtain certificate
docker compose stop nginx

# Generate certificate
sudo certbot certonly --standalone -d zerodha.yourdomain.com

# Start containers back up
docker compose start nginx
```
