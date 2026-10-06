package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

type Session struct {
	Address          common.Address
	TaskID           common.Hash
	EstimateCredit   int
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	Expiry           time.Time
}

func (s *Session) actualCredit() int {
	n := creditFromTokens(s.TotalTokens)
	if n > s.EstimateCredit {
		return s.EstimateCredit
	}
	return n
}

type Store struct {
	mu  sync.Mutex
	ttl time.Duration
	m   map[string]*Session
}

func newStore(ttl time.Duration) *Store {
	return &Store{ttl: ttl, m: make(map[string]*Session)}
}

func (s *Store) issue(sess Session) (string, error) {
	var b [24]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b[:])
	sess.Expiry = time.Now().Add(s.ttl)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[token] = &sess
	return token, nil
}

func (s *Store) get(token string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.m[token]
	if !ok {
		return nil, fmt.Errorf("unknown ticket")
	}
	if time.Now().After(sess.Expiry) {
		delete(s.m, token)
		return nil, fmt.Errorf("ticket expired")
	}
	return sess, nil
}

func (s *Store) addUsage(token string, prompt, completion, total int) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.m[token]
	if !ok {
		return nil, fmt.Errorf("unknown ticket")
	}
	sess.PromptTokens += prompt
	sess.CompletionTokens += completion
	if total > 0 {
		sess.TotalTokens += total
	} else {
		sess.TotalTokens += prompt + completion
	}
	cp := *sess
	return &cp, nil
}
