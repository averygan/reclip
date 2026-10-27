SINGLETON = reclip
COMMANDS  =

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
# Strip the leading 'v' from a git tag (v1.0.2 -> 1.0.2) so the app and the
# artifact names report the bare semver the user sees.
VERSION := $(VERSION:v%=%)
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS = -s -w -X main.version=$(VERSION) -X main.commit=$(COMMIT)

ifndef GOAMD64
	GOAMD64 = v2
endif
GOOS    = $(shell uname -s | tr [A-Z] [a-z])
GOARCH  = $(shell uname -m | tr [A-Z] [a-z])
ifeq ($(GOARCH), amd64)
	GOARGS = GOAMD64=$(GOAMD64)
else
	GOARGS =
endif

GOBIN    = CC=/usr/bin/clang go
UPXBIN   = upx
GOBUILD  = $(GOARGS) $(GOBIN) build -ldflags="$(LDFLAGS)"
BINFILES = $(SINGLETON) $(COMMANDS)

TARGETS = darwin-arm64 darwin-amd64 linux-arm64 linux-amd64 windows-amd64

.PHONY: one all build clean upx upxx release $(BINFILES)

one:
	@echo "Compile one ($(GOOS)/$(GOARCH), $(VERSION))..."
ifneq ($(SINGLETON),)
		CGO_ENABLED=1 $(GOBUILD) -o ./bin/$(SINGLETON) ./
		fyne package --release --os darwin  --icon ./assets/icon.png --exe ./bin/$(SINGLETON)
endif
ifneq ($(COMMANDS),)
	for one in $(COMMANDS); do \
		CGO_ENABLED=1 $(GOBUILD) -o ./bin/$$one ./cmd/$$one; \
	done
endif

all: clean one build

build: $(BINFILES)
	@echo "✅ Build success."

$(SINGLETON):
	@echo "Compile $@ ($(VERSION))..."
	@for target in $(TARGETS); do \
		os=$${target%-*}; \
		arch=$${target#*-}; \
		echo "  -> $$os/$$arch"; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch $(GOBUILD) -o ./bin/$@-$(VERSION)-$$target ./; \
	done

$(COMMANDS):
	@echo "Compile $@ ($(VERSION))..."
	@for target in $(TARGETS); do \
		os=$${target%-*}; \
		arch=$${target#*-}; \
		echo "  -> $$os/$$arch"; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch $(GOBUILD) -o ./bin/$@-$(VERSION)-$$target ./cmd/$@; \
	done

clean:
	rm -f $(BINFILES:%=./bin/%)
	rm -f ./bin/$(SINGLETON)-*
	rm -rf $(SINGLETON).app
	@echo "✅ Clean complete."

upx: clean one
	$(UPXBIN) $(BINFILES:%=./bin/%)

upxx: clean one
	$(UPXBIN) --ultra-brute $(BINFILES:%=./bin/%)

release: clean build
	@echo "📦 Generating SHA256SUMS..."
	cd bin && sha256sum * > SHA256SUMS
	@echo "✅ Release artifacts in bin/ (version $(VERSION)):"
	@ls -lh bin/
