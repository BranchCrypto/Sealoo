package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

type Server struct {
	cfg      Config
	chain    *Chain
	upstream *Upstream
	tickets  *Store
}

func newServer(cfg Config, chain *Chain, up *Upstream, tickets *Store) *Server {
	return &Server{cfg: cfg, chain: chain, upstream: up, tickets: tickets}
}

func (s *Server) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /v1/challenge", s.handleChallenge)
	mux.HandleFunc("POST /v1/ticket", s.handleTicket)
	mux.HandleFunc("POST /v1/chat/completions", s.handleCompletions)
	mux.HandleFunc("GET /v1/usage", s.handleUsage)
	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleChallenge(w http.ResponseWriter, r *http.Request) {
	addr, err := parseAddress(r.URL.Query().Get("address"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	taskID, err := parseHash(r.URL.Query().Get("taskId"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	msg := challengeMessage(s.cfg.PublicURL, s.cfg.WorkCredit, s.cfg.ChainID, addr, taskID)
	writeJSON(w, http.StatusOK, map[string]any{"message": msg})
}

type ticketReq struct {
	Address   string `json:"address"`
	TaskID    string `json:"taskId"`
	Signature string `json:"signature"`
}

func (s *Server) handleTicket(w http.ResponseWriter, r *http.Request) {
	var req ticketReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	addr, err := parseAddress(req.Address)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	taskID, err := parseHash(req.TaskID)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	msg := challengeMessage(s.cfg.PublicURL, s.cfg.WorkCredit, s.cfg.ChainID, addr, taskID)
	recovered, err := recoverPersonalSign(msg, req.Signature)
	if err != nil || !bytesEqualAddr(recovered, addr) {
		writeErr(w, http.StatusUnauthorized, "bad signature")
		return
	}
	locked, err := s.chain.requireLocked(addr, taskID)
	if err != nil {
		writeErr(w, http.StatusForbidden, err.Error())
		return
	}
	if !locked.Estimate.IsInt64() {
		writeErr(w, http.StatusForbidden, "invalid estimate")
		return
	}
	est := int(locked.Estimate.Int64())
	if est <= 0 {
		writeErr(w, http.StatusForbidden, "invalid estimate")
		return
	}
	token, err := s.tickets.issue(Session{
		Address:        addr,
		TaskID:         taskID,
		EstimateCredit: est,
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ticket")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"token":          token,
		"expiresIn":      s.cfg.TicketTTL,
		"estimateCredit": est,
	})
}

func (s *Server) handleCompletions(w http.ResponseWriter, r *http.Request) {
	token := bearerToken(r.Header.Get("Authorization"))
	sess, err := s.tickets.get(token)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	if creditFromTokens(sess.TotalTokens) >= sess.EstimateCredit {
		writeErr(w, http.StatusPaymentRequired, "credit exhausted")
		return
	}
	if _, err := s.chain.requireLocked(sess.Address, sess.TaskID); err != nil {
		writeErr(w, http.StatusForbidden, err.Error())
		return
	}
	body, err := readLimited(w, r, 1<<20)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "body")
		return
	}
	status, raw, usage, err := s.upstream.chatCompletions(body)
	if err != nil {
		code := http.StatusBadGateway
		if strings.Contains(err.Error(), "stream") || strings.Contains(err.Error(), "invalid json") {
			code = http.StatusBadRequest
		}
		writeErr(w, code, err.Error())
		return
	}
	if status < 300 {
		if _, err := s.tickets.addUsage(token, usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens); err != nil {
			writeErr(w, http.StatusUnauthorized, err.Error())
			return
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(raw)
}

func (s *Server) handleUsage(w http.ResponseWriter, r *http.Request) {
	token := bearerToken(r.Header.Get("Authorization"))
	sess, err := s.tickets.get(token)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"address":          sess.Address.Hex(),
		"taskId":           sess.TaskID.Hex(),
		"estimateCredit":   sess.EstimateCredit,
		"prompt_tokens":    sess.PromptTokens,
		"completion_tokens": sess.CompletionTokens,
		"total_tokens":     sess.TotalTokens,
		"actualCredit":     sess.actualCredit(),
	})
}

func parseAddress(s string) (common.Address, error) {
	if !common.IsHexAddress(s) {
		return common.Address{}, errBad("address")
	}
	return common.HexToAddress(s), nil
}

func parseHash(s string) (common.Hash, error) {
	b, err := decodeHex(s)
	if err != nil || len(b) != 32 {
		return common.Hash{}, errBad("taskId")
	}
	return common.BytesToHash(b), nil
}

type simpleError string

func (e simpleError) Error() string { return string(e) }

func errBad(field string) error { return simpleError("bad " + field) }

func bytesEqualAddr(a, b common.Address) bool {
	return strings.EqualFold(a.Hex(), b.Hex())
}

func readLimited(w http.ResponseWriter, r *http.Request, n int64) ([]byte, error) {
	defer r.Body.Close()
	return io.ReadAll(http.MaxBytesReader(w, r.Body, n))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"message": msg, "type": "gateway_error"},
	})
}
