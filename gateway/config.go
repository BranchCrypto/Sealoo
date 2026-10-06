package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	defaultListen     = ":8787"
	defaultPublicURL  = "http://127.0.0.1:8787"
	defaultDeepSeek   = "https://api.deepseek.com/v1"
	defaultModel      = "deepseek-chat"
	defaultRPC        = "https://api.avax-test.network/ext/bc/C/rpc"
	defaultWorkCredit = "0x16c3F7F78e9dca9f8B5D475bE812E773f34C1F67"
	defaultChainID    = 43113
	defaultTTL        = 7200
)

type Config struct {
	Listen      string
	PublicURL   string
	UpstreamKey string
	UpstreamURL string
	Model       string
	RPC         string
	WorkCredit  string
	ChainID     int
	TicketTTL   int
}

func loadConfig() (Config, error) {
	loadDotEnv()
	c := Config{
		Listen:      envOr("LISTEN", defaultListen),
		PublicURL:   strings.TrimRight(envOr("GATEWAY_PUBLIC_URL", defaultPublicURL), "/"),
		UpstreamKey: os.Getenv("DEEPSEEK_API_KEY"),
		UpstreamURL: strings.TrimRight(envOr("DEEPSEEK_BASE_URL", defaultDeepSeek), "/"),
		Model:       envOr("DEEPSEEK_MODEL", defaultModel),
		RPC:         envOr("FUJI_RPC", defaultRPC),
		WorkCredit:  envOr("WORK_CREDIT", defaultWorkCredit),
		ChainID:     envInt("CHAIN_ID", defaultChainID),
		TicketTTL:   envInt("TICKET_TTL_SEC", defaultTTL),
	}
	if c.UpstreamKey == "" {
		return Config{}, fmt.Errorf("set DEEPSEEK_API_KEY")
	}
	if c.TicketTTL <= 0 {
		c.TicketTTL = defaultTTL
	}
	return c, nil
}

func loadDotEnv() {
	paths := []string{".env"}
	if exe, err := os.Executable(); err == nil {
		paths = append(paths, filepath.Join(filepath.Dir(exe), ".env"))
	}
	for _, p := range paths {
		raw, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(raw), "\n") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "\ufeff"))
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			k, v, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			k = strings.TrimSpace(k)
			v = strings.Trim(strings.TrimSpace(v), `"'`)
			if k != "" && os.Getenv(k) == "" {
				_ = os.Setenv(k, v)
			}
		}
		return
	}
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
