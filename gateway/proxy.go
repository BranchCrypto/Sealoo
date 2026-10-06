package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Upstream struct {
	base   string
	key    string
	model  string
	client *http.Client
}

func newUpstream(base, key, model string) *Upstream {
	return &Upstream{
		base:   strings.TrimRight(base, "/"),
		key:    key,
		model:  model,
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

type usageBody struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

func (u *Upstream) chatCompletions(reqBody []byte) (status int, respBody []byte, usage usageBody, err error) {
	var probe struct {
		Stream *bool  `json:"stream"`
		Model  string `json:"model"`
	}
	if err := json.Unmarshal(reqBody, &probe); err != nil {
		return 0, nil, usageBody{}, fmt.Errorf("invalid json")
	}
	if probe.Stream != nil && *probe.Stream {
		return http.StatusBadRequest, nil, usageBody{}, fmt.Errorf("stream not supported")
	}

	var obj map[string]any
	if err := json.Unmarshal(reqBody, &obj); err != nil {
		return 0, nil, usageBody{}, fmt.Errorf("invalid json")
	}
	if u.model != "" {
		obj["model"] = u.model
	}
	delete(obj, "stream")
	forward, err := json.Marshal(obj)
	if err != nil {
		return 0, nil, usageBody{}, err
	}

	req, err := http.NewRequest(http.MethodPost, u.base+"/chat/completions", bytes.NewReader(forward))
	if err != nil {
		return 0, nil, usageBody{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+u.key)

	res, err := u.client.Do(req)
	if err != nil {
		return 0, nil, usageBody{}, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return 0, nil, usageBody{}, err
	}
	var parsed struct {
		Usage usageBody `json:"usage"`
	}
	_ = json.Unmarshal(raw, &parsed)
	if parsed.Usage.TotalTokens == 0 {
		parsed.Usage.TotalTokens = parsed.Usage.PromptTokens + parsed.Usage.CompletionTokens
	}
	return res.StatusCode, raw, parsed.Usage, nil
}
