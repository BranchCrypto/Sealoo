package main

import (
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestCreditFromTokens(t *testing.T) {
	if creditFromTokens(0) != 0 {
		t.Fatal()
	}
	if creditFromTokens(1) != 1 {
		t.Fatal()
	}
	if creditFromTokens(1000) != 1 {
		t.Fatal()
	}
	if creditFromTokens(1001) != 2 {
		t.Fatal()
	}
}

func TestPersonalSignRoundTrip(t *testing.T) {
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	addr := crypto.PubkeyToAddress(key.PublicKey)
	task := common.HexToHash("0x" + strings.Repeat("ab", 32))
	msg := challengeMessage("http://127.0.0.1:8787", defaultWorkCredit, defaultChainID, addr, task)
	sig, err := signPersonal(key, msg)
	if err != nil {
		t.Fatal(err)
	}
	got, err := recoverPersonalSign(msg, sig)
	if err != nil {
		t.Fatal(err)
	}
	if got != addr {
		t.Fatalf("got %s want %s", got.Hex(), addr.Hex())
	}
}

func TestChallengeAndCompletions(t *testing.T) {
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	addr := crypto.PubkeyToAddress(key.PublicKey)
	task := common.HexToHash("0x" + strings.Repeat("cd", 32))
	estimate := big.NewInt(5)

	rpc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req rpcRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		call, _ := req.Params[0].(map[string]any)
		data, _ := call["data"].(string)
		sel := strings.ToLower(strings.TrimPrefix(data, "0x"))
		openSel := common.Bytes2Hex(selector("openTask(address)"))
		taskSel := common.Bytes2Hex(selector("tasks(bytes32)"))
		var result string
		switch {
		case strings.HasPrefix(sel, openSel):
			result = task.Hex()
		case strings.HasPrefix(sel, taskSel):
			result = "0x" + encodeWordAddr(addr) + encodeWordBig(estimate) + encodeWordBig(big.NewInt(taskLocked))
		default:
			t.Fatalf("unexpected call %s", data)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": 1, "result": result})
	}))
	defer rpc.Close()

	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer sk-test" {
			t.Fatal("upstream key")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"ok"}}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}`))
	}))
	defer up.Close()

	cfg := Config{
		PublicURL:   "http://127.0.0.1:8787",
		UpstreamKey: "sk-test",
		UpstreamURL: up.URL,
		Model:       "deepseek-chat",
		RPC:         rpc.URL,
		WorkCredit:  defaultWorkCredit,
		ChainID:     defaultChainID,
		TicketTTL:   60,
	}
	srv := newServer(cfg, newChain(rpc.URL, cfg.WorkCredit), newUpstream(up.URL, cfg.UpstreamKey, cfg.Model), newStore(time.Minute))
	h := srv.handler()

	msg := challengeMessage(cfg.PublicURL, cfg.WorkCredit, cfg.ChainID, addr, task)
	sig, err := signPersonal(key, msg)
	if err != nil {
		t.Fatal(err)
	}

	ticketBody := fmt.Sprintf(`{"address":%q,"taskId":%q,"signature":%q}`, addr.Hex(), task.Hex(), sig)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/ticket", strings.NewReader(ticketBody))
	h.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("ticket %d %s", rec.Code, rec.Body.String())
	}
	var issued struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &issued); err != nil || issued.Token == "" {
		t.Fatal(rec.Body.String())
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"messages":[{"role":"user","content":"hi"}]}`))
	req.Header.Set("Authorization", "Bearer "+issued.Token)
	h.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("completions %d %s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/usage", nil)
	req.Header.Set("Authorization", "Bearer "+issued.Token)
	h.ServeHTTP(rec, req)
	body, _ := io.ReadAll(rec.Body)
	if !strings.Contains(string(body), `"total_tokens":15`) {
		t.Fatal(string(body))
	}
}

func TestRefuseWithoutLock(t *testing.T) {
	rpc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"jsonrpc": "2.0",
			"id":      1,
			"result":  common.Hash{}.Hex(),
		})
	}))
	defer rpc.Close()
	key, _ := crypto.GenerateKey()
	addr := crypto.PubkeyToAddress(key.PublicKey)
	task := common.HexToHash("0x" + strings.Repeat("11", 32))
	cfg := Config{PublicURL: "http://127.0.0.1:8787", WorkCredit: defaultWorkCredit, ChainID: defaultChainID, TicketTTL: 60, UpstreamKey: "x"}
	srv := newServer(cfg, newChain(rpc.URL, cfg.WorkCredit), newUpstream("http://127.0.0.1", "x", "m"), newStore(time.Minute))
	msg := challengeMessage(cfg.PublicURL, cfg.WorkCredit, cfg.ChainID, addr, task)
	sig, _ := signPersonal(key, msg)
	rec := httptest.NewRecorder()
	body := fmt.Sprintf(`{"address":%q,"taskId":%q,"signature":%q}`, addr.Hex(), task.Hex(), sig)
	req := httptest.NewRequest(http.MethodPost, "/v1/ticket", strings.NewReader(body))
	srv.handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestCompletionsWithoutTicket(t *testing.T) {
	cfg := Config{PublicURL: "http://127.0.0.1:8787", WorkCredit: defaultWorkCredit, ChainID: defaultChainID, TicketTTL: 60, UpstreamKey: "x"}
	srv := newServer(cfg, newChain("http://127.0.0.1", cfg.WorkCredit), newUpstream("http://127.0.0.1", "x", "m"), newStore(time.Minute))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"messages":[]}`))
	req.Header.Set("Authorization", "Bearer not-a-ticket")
	srv.handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func signPersonal(key *ecdsa.PrivateKey, message string) (string, error) {
	hash := crypto.Keccak256Hash([]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)))
	sig, err := crypto.Sign(hash.Bytes(), key)
	if err != nil {
		return "", err
	}
	sig[64] += 27
	return "0x" + common.Bytes2Hex(sig), nil
}

func encodeWordAddr(a common.Address) string {
	return common.Bytes2Hex(common.LeftPadBytes(a.Bytes(), 32))
}

func encodeWordBig(n *big.Int) string {
	return common.Bytes2Hex(common.LeftPadBytes(n.Bytes(), 32))
}
