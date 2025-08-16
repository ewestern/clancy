# Check if NVM is installed by looking for either the NVM script or directory
NVM_INSTALLED := $(shell command -v nvm >/dev/null 2>&1 || [ -d "$$HOME/.nvm" ] && echo "yes" || echo "no")
DB_NAME := connect_hub
REPO := 702853186114.dkr.ecr.us-east-1.amazonaws.com
IMAGE_NAME := clancy/connect-hub
IMAGE_REPO := $(REPO)/$(IMAGE_NAME)
PROFILE := clancy

.PHONY: setup-nvm
setup-nvm:
ifeq ($(NVM_INSTALLED),no)
	@echo "Installing NVM..."
	@curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
	@echo "NVM installed. Please restart your terminal or run:"
	@echo "    source ~/.nvm/nvm.sh"
else
	@echo "NVM is already installed"
endif

# Helper target to ensure correct node version is installed and used
.PHONY: setup-node
setup-node: setup-nvm
	@echo "Setting up Node.js..."
	@. ~/.nvm/nvm.sh && nvm install
	@. ~/.nvm/nvm.sh && nvm use

# Main setup target
.PHONY: setup
setup: setup-node
	npm install

# Install project dependencies
.PHONY: install
install: setup-node
	@echo "Installing project dependencies..."
	npm ci
	@echo "Building project..."
	npm run build

# Development setup
.PHONY: dev-setup
dev-setup: install
	@echo "Setting up development environment..."
	npm run dev

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist
	rm -rf node_modules

# AWS Profile handling - use 'default' if not specified
PROFILE ?= default

login:
	@if [ "$(PROFILE)" = "default" ]; then \
		aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(REPO); \
	else \
		aws ecr get-login-password --region us-east-1 --profile $(PROFILE) | docker login --username AWS --password-stdin $(REPO); \
	fi

push-image: login
	@echo "Retrieving NPM token from .npmrc..."
	docker build --build-arg NPM_TOKEN=$$(grep '//npm.pkg.github.com/:_authToken=' .npmrc | cut -d'=' -f2) -t $(IMAGE_NAME):latest .
	docker tag $(IMAGE_NAME):latest $(IMAGE_REPO):latest
	docker push $(IMAGE_REPO):latest


reset-dev-database:
	dropdb $(DB_NAME) || true
	createdb $(DB_NAME) || true
	npx tsx node_modules/.bin/drizzle-kit migrate
	npx tsx node_modules/.bin/drizzle-kit push 
	psql $(DB_NAME) -f test_data_connect_hub.sql
