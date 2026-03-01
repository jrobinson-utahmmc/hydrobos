#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  HydroBOS Deploy Script — Debian Production
# ══════════════════════════════════════════════════════════════
#  Usage:
#    ./deploy.sh                 Full deploy (install deps, build, start)
#    ./deploy.sh --clean         Stop containers, rebuild images, restart
#    ./deploy.sh --purge-everything  Nuclear option: remove ALL containers,
#                                    images, volumes, databases, and tunnel
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[HydroBOS]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✔${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
err()  { echo -e "${RED}  ✖${NC} $1"; }
die()  { err "$1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Detect docker compose command ──
# Resolves after dependencies are installed; used by all compose calls
DC=""
resolve_compose() {
  if docker compose version &>/dev/null; then
    DC="docker compose"
  elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
  else
    DC=""
  fi
}
resolve_compose

# ══════════════════════════════════════
#  Parse Arguments
# ══════════════════════════════════════
MODE="deploy"
for arg in "$@"; do
  case "$arg" in
    --clean)            MODE="clean" ;;
    --purge-everything) MODE="purge" ;;
    --help|-h)
      echo "Usage: ./deploy.sh [--clean | --purge-everything]"
      echo ""
      echo "  (no args)           Full deploy (install deps, build, start)"
      echo "  --clean             Stop, rebuild images from scratch, restart"
      echo "  --purge-everything  Remove ALL containers, images, volumes, and tunnel"
      exit 0
      ;;
    *) die "Unknown argument: $arg" ;;
  esac
done

# ══════════════════════════════════════
#  Preflight: Must be root (or sudo)
# ══════════════════════════════════════
if [[ $EUID -ne 0 ]]; then
  die "This script must be run as root (use sudo ./deploy.sh)"
fi

# ══════════════════════════════════════════════════════════════
#  PURGE MODE — Nuclear reset
# ══════════════════════════════════════════════════════════════
if [[ "$MODE" == "purge" ]]; then
  echo ""
  echo -e "${RED}${BOLD}  ╔══════════════════════════════════════════════╗${NC}"
  echo -e "${RED}${BOLD}  ║  ⚠  PURGE EVERYTHING — DESTRUCTIVE ACTION  ║${NC}"
  echo -e "${RED}${BOLD}  ╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo "  This will permanently destroy:"
  echo "    • All HydroBOS containers and images"
  echo "    • All Docker volumes (MongoDB data, Redis, Kafka)"
  echo "    • Cloudflared tunnel service"
  echo ""
  read -rp "  Type 'YES' to confirm: " confirm
  if [[ "$confirm" != "YES" ]]; then
    log "Aborted."
    exit 0
  fi

  log "Stopping all containers..."
  $DC down --remove-orphans --volumes 2>/dev/null || docker-compose down --remove-orphans --volumes 2>/dev/null || true
  $DC --profile dev-tools down --volumes 2>/dev/null || true

  log "Removing HydroBOS images..."
  docker images --format '{{.Repository}}:{{.Tag}}' | grep '^hydrobos/' | xargs -r docker rmi -f 2>/dev/null || true

  log "Pruning dangling images and build cache..."
  docker image prune -f 2>/dev/null || true
  docker builder prune -f 2>/dev/null || true

  log "Removing named volumes..."
  docker volume rm hydrobos_mongo_data hydrobos_redis_data hydrobos_kafka_data 2>/dev/null || true

  # Stop system MongoDB if running on the host
  if systemctl is-active --quiet mongod 2>/dev/null; then
    log "Stopping host MongoDB (mongod)..."
    systemctl stop mongod
    systemctl disable mongod 2>/dev/null || true
    ok "Host MongoDB stopped and disabled"
  fi

  # Remove cloudflared tunnel service
  if systemctl is-active --quiet cloudflared 2>/dev/null; then
    log "Removing cloudflared tunnel..."
    cloudflared service uninstall 2>/dev/null || true
    ok "Cloudflared tunnel service removed"
  fi

  log "Removing .env file..."
  rm -f .env

  echo ""
  ok "Purge complete. Run ./deploy.sh to start fresh."
  exit 0
fi

# ══════════════════════════════════════════════════════════════
#  CLEAN MODE — Rebuild from scratch
# ══════════════════════════════════════════════════════════════
if [[ "$MODE" == "clean" ]]; then
  log "Clean rebuild requested"

  log "Stopping all containers..."
  $DC down --remove-orphans 2>/dev/null || docker-compose down --remove-orphans 2>/dev/null || true

  log "Removing HydroBOS images..."
  docker images --format '{{.Repository}}:{{.Tag}}' | grep '^hydrobos/' | xargs -r docker rmi -f 2>/dev/null || true

  log "Pruning build cache..."
  docker builder prune -f 2>/dev/null || true

  ok "Clean complete — continuing with full deploy..."
  echo ""
fi

# ══════════════════════════════════════════════════════════════
#  STEP 1: System Dependencies
# ══════════════════════════════════════════════════════════════
log "Checking system dependencies..."

apt_updated=false
ensure_apt_updated() {
  if [[ "$apt_updated" == false ]]; then
    log "Updating apt package index..."
    apt-get update -qq
    apt_updated=true
  fi
}

# ── Ensure Docker CE apt repo is configured ──
ensure_docker_repo() {
  if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
    log "Adding official Docker apt repository..."
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg \
      | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt_updated=true
    ok "Docker repo added"
  fi
}

# ── Docker ──
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  ensure_apt_updated
  ensure_docker_repo
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  ok "Docker installed"
else
  ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' || echo 'detected')"
fi

# ── Docker API version compatibility ──
# The docker CLI and docker compose plugin may have different API versions baked in.
# If either is newer than the daemon, commands fail with "client version X.XX is too
# new". We proactively detect the server's max API version and pin it so ALL Docker
# binaries (CLI, compose plugin, buildx) use the compatible version.
_server_api=$(docker version --format '{{.Server.APIVersion}}' 2>/dev/null || true)

if [[ -z "$_server_api" ]]; then
  # docker version itself may have failed due to version mismatch — parse the error
  _server_api=$(docker version 2>&1 | grep -oE 'Maximum supported API version is [0-9.]+' | grep -oE '[0-9.]+$' || true)
fi

if [[ -n "$_server_api" ]]; then
  export DOCKER_API_VERSION="$_server_api"
  ok "Docker API version pinned to $DOCKER_API_VERSION (daemon max)"
else
  warn "Could not detect Docker daemon API version — compose may fail if versions mismatch"
fi

# ── Docker Compose (v2 plugin) ──
if ! docker compose version &>/dev/null; then
  log "Installing Docker Compose plugin..."
  ensure_apt_updated
  ensure_docker_repo
  apt-get install -y -qq docker-compose-plugin
  if ! docker compose version &>/dev/null; then
    # Fallback: install standalone binary
    log "apt install failed — installing standalone docker-compose..."
    COMPOSE_VERSION=$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | head -1 | cut -d'"' -f4)
    COMPOSE_VERSION=${COMPOSE_VERSION:-v2.29.1}
    curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    # Also install as a plugin so `docker compose` works
    mkdir -p /usr/local/lib/docker/cli-plugins
    ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
    ok "Docker Compose ${COMPOSE_VERSION} installed (standalone)"
  else
    ok "Docker Compose plugin installed"
  fi
else
  ok "Docker Compose $(docker compose version --short 2>/dev/null || echo 'available')"
fi

# Re-resolve compose command after potential install
resolve_compose
if [[ -z "$DC" ]]; then
  die "Docker Compose could not be installed. Install it manually and re-run."
fi

# ── Git ──
if ! command -v git &>/dev/null; then
  log "Installing git..."
  ensure_apt_updated
  apt-get install -y -qq git
  ok "Git installed"
else
  ok "Git $(git --version | awk '{print $3}')"
fi

# ── Cloudflared ──
if ! command -v cloudflared &>/dev/null; then
  log "Installing cloudflared..."
  ensure_apt_updated

  # Use the official Cloudflare package repo
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
    | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
    | tee /etc/apt/sources.list.d/cloudflared.list
  apt-get update -qq
  apt-get install -y -qq cloudflared
  ok "Cloudflared installed"
else
  ok "Cloudflared $(cloudflared --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1)"
fi

# ══════════════════════════════════════════════════════════════
#  STEP 2: Handle Conflicting Host Services
# ══════════════════════════════════════════════════════════════
log "Checking for port conflicts..."

# Stop host MongoDB if it would conflict with the container
if systemctl is-active --quiet mongod 2>/dev/null; then
  warn "Host MongoDB (mongod) is running — stopping to avoid conflicts"
  systemctl stop mongod
  systemctl disable mongod 2>/dev/null || true
  ok "Host MongoDB stopped and disabled"
fi

# Check if port 27017 is still in use by something else
if ss -tlnp 2>/dev/null | grep -q ':27017 '; then
  PID=$(ss -tlnp 2>/dev/null | grep ':27017 ' | grep -oP 'pid=\K\d+' | head -1)
  if [[ -n "$PID" ]]; then
    PROC=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
    warn "Port 27017 in use by $PROC (PID $PID)"
    # Only kill if it's a mongo process, not our container
    if [[ "$PROC" == *"mongod"* ]] || [[ "$PROC" == *"mongos"* ]]; then
      kill "$PID" 2>/dev/null || true
      sleep 2
      ok "Killed stale mongod process"
    fi
  fi
fi

# Check for stale hydrobos containers from a previous run
stale=$(docker ps -aq --filter "name=hydrobos-" 2>/dev/null | wc -l)
if [[ "$stale" -gt 0 ]]; then
  warn "Found $stale stale HydroBOS container(s) — removing..."
  $DC down --remove-orphans 2>/dev/null || true
  ok "Stale containers removed"
fi

# Remove stale Docker network if labels conflict with current compose config
if docker network inspect hydrobos-network &>/dev/null; then
  _net_label=$(docker network inspect hydrobos-network --format '{{index .Labels "com.docker.compose.network"}}' 2>/dev/null || true)
  if [[ -n "$_net_label" && "$_net_label" != "hydrobos" ]]; then
    warn "Docker network 'hydrobos-network' has stale labels — removing..."
    # Disconnect any lingering containers first
    for cid in $(docker network inspect hydrobos-network --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null); do
      docker network disconnect -f hydrobos-network "$cid" 2>/dev/null || true
    done
    docker network rm hydrobos-network 2>/dev/null || true
    ok "Stale network removed (will be recreated)"
  fi
fi

# ══════════════════════════════════════════════════════════════
#  STEP 3: Environment File
# ══════════════════════════════════════════════════════════════
log "Checking environment configuration..."

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    log "No .env found — generating from .env.example..."
    cp .env.example .env

    # Generate a secure random JWT secret
    JWT=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
    ok ".env created with generated JWT_SECRET"
    warn "Review .env and set any additional secrets before going live"
  else
    die "No .env or .env.example found. Cannot continue without environment config."
  fi
else
  ok ".env exists"

  # Warn if JWT_SECRET is still the default
  if grep -q 'JWT_SECRET=hydrobos-dev-secret' .env 2>/dev/null || grep -q 'JWT_SECRET=change-me' .env 2>/dev/null; then
    warn "JWT_SECRET is still set to a default value — update it for production!"
  fi
fi

# ══════════════════════════════════════════════════════════════
#  STEP 4: Build & Start Services
# ══════════════════════════════════════════════════════════════
log "Building and starting HydroBOS..."

$DC build --parallel
ok "Images built"

$DC up -d
ok "Containers started"

# ── Wait for health checks ──
log "Waiting for services to become healthy..."

SERVICES=("mongodb" "redis" "kafka" "identity" "widget" "seo" "package-manager" "gateway" "client")
MAX_WAIT=120
ELAPSED=0

all_healthy() {
  for svc in "${SERVICES[@]}"; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "hydrobos-${svc}" 2>/dev/null || echo "missing")
    # client has no healthcheck, just check running
    if [[ "$svc" == "client" ]]; then
      running=$(docker inspect --format='{{.State.Running}}' "hydrobos-client" 2>/dev/null || echo "false")
      [[ "$running" != "true" ]] && return 1
    else
      [[ "$status" != "healthy" ]] && return 1
    fi
  done
  return 0
}

while ! all_healthy; do
  if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    err "Timed out waiting for services (${MAX_WAIT}s)"
    echo ""
    log "Container status:"
    $DC ps
    echo ""
    log "Recent logs from unhealthy services:"
    for svc in "${SERVICES[@]}"; do
      status=$(docker inspect --format='{{.State.Health.Status}}' "hydrobos-${svc}" 2>/dev/null || echo "missing")
      if [[ "$status" != "healthy" && "$svc" != "client" ]]; then
        echo -e "\n${YELLOW}── ${svc} ──${NC}"
        docker logs --tail 20 "hydrobos-${svc}" 2>&1 || true
      fi
    done
    die "Deploy incomplete — fix the issues above and re-run"
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  printf "\r  ⏳ %ds / %ds ..." "$ELAPSED" "$MAX_WAIT"
done
echo ""
ok "All services healthy"

# ══════════════════════════════════════════════════════════════
#  STEP 5: Cloudflared Tunnel
# ══════════════════════════════════════════════════════════════
log "Configuring Cloudflare Tunnel..."

if cloudflared tunnel list 2>/dev/null | grep -q 'hydrobos'; then
  ok "Tunnel 'hydrobos' already exists"
else
  # Check if cloudflared is authenticated
  if [[ ! -f /root/.cloudflared/cert.pem ]] && [[ ! -f "$HOME/.cloudflared/cert.pem" ]]; then
    warn "Cloudflared is not authenticated"
    echo ""
    echo "  Run the following command to authenticate:"
    echo ""
    echo "    cloudflared tunnel login"
    echo ""
    echo "  Then create the tunnel:"
    echo ""
    echo "    cloudflared tunnel create hydrobos"
    echo ""
    echo "  After creating the tunnel, re-run this script."
    echo ""
  else
    log "Creating tunnel 'hydrobos'..."
    cloudflared tunnel create hydrobos
    ok "Tunnel created"
  fi
fi

# Get tunnel ID if tunnel exists
TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep 'hydrobos' | awk '{print $1}' || true)

if [[ -n "$TUNNEL_ID" ]]; then
  # Write/update the cloudflared config
  CRED_FILE="/root/.cloudflared/${TUNNEL_ID}.json"
  if [[ ! -f "$CRED_FILE" ]]; then
    CRED_FILE="$HOME/.cloudflared/${TUNNEL_ID}.json"
  fi

  mkdir -p /etc/cloudflared

  cat > /etc/cloudflared/config.yml <<CFEOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}

ingress:
  # HydroBOS client (main app)
  - service: http://localhost:3000
CFEOF

  ok "Cloudflared config written to /etc/cloudflared/config.yml"

  # Install and start as a systemd service
  if ! systemctl is-active --quiet cloudflared 2>/dev/null; then
    log "Installing cloudflared as a system service..."
    cloudflared service install 2>/dev/null || true
    systemctl enable cloudflared 2>/dev/null || true
    systemctl restart cloudflared
    ok "Cloudflared tunnel service running"
  else
    # Restart to pick up any config changes
    systemctl restart cloudflared
    ok "Cloudflared tunnel service restarted"
  fi

  echo ""
  echo -e "  ${CYAN}Tunnel ID:${NC}  ${TUNNEL_ID}"
  echo ""
  echo "  To route your domain, add a DNS CNAME record:"
  echo "    your-domain.com  →  ${TUNNEL_ID}.cfargotunnel.com"
  echo ""
  echo "  Or use:  cloudflared tunnel route dns hydrobos your-domain.com"
  echo ""
else
  warn "No tunnel found — skipping tunnel setup (see instructions above)"
fi

# ══════════════════════════════════════════════════════════════
#  Done
# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}  ║       🌊 HydroBOS Deployed Successfully     ║${NC}"
echo -e "${GREEN}${BOLD}  ╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "  Services:"
$DC ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || $DC ps
echo ""
echo "  Quick reference:"
echo "    Client:    http://localhost:3000"
echo "    Gateway:   http://localhost:5000"
echo "    Logs:      $DC logs -f [service]"
echo "    Stop:      $DC down"
echo "    Rebuild:   ./deploy.sh --clean"
echo ""
