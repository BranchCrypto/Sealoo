package runtime

import (
	"bytes"
	"cmp"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	json "encoding/json/v2"
)

// Completer produces the next assistant message (PI streamFn, non-streaming).
type Completer interface {
	Complete(ctx context.Context, messages []Message, tools []Tool) (Message, Usage, error)
}

// OpenAIClient talks to an OpenAI-compatible Chat Completions API.
type OpenAIClient struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

func (c *OpenAIClient) Complete(ctx context.Context, messages []Message, tools []Tool) (Message, Usage, error) {
	base := strings.TrimRight(cmp.Or(c.BaseURL, "https://api.openai.com/v1"), "/")
	reqBody := chatRequest{
		Model:    cmp.Or(c.Model, "gpt-4o-mini"),
		Messages: messages,
	}
	if len(tools) > 0 {
		reqBody.Tools = make([]apiTool, len(tools))
		for i, t := range tools {
			params := t.Parameters
			if params == nil {
				params = map[string]any{"type": "object", "properties": map[string]any{}}
			}
			reqBody.Tools[i] = apiTool{
				Type: "function",
				Function: apiFunction{
					Name:        t.Name,
					Description: t.Description,
					Parameters:  params,
				},
			}
		}
	}

	raw, err := json.Marshal(reqBody)
	if err != nil {
		return Message{}, Usage{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return Message{}, Usage{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	client := cmp.Or(c.HTTPClient, http.DefaultClient)
	res, err := client.Do(req)
	if err != nil {
		return Message{}, Usage{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return Message{}, Usage{}, err
	}
	if res.StatusCode >= 300 {
		return Message{}, Usage{}, fmt.Errorf("llm %s: %s", res.Status, truncate(string(body), 400))
	}

	var out chatResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return Message{}, Usage{}, err
	}
	if len(out.Choices) == 0 {
		return Message{}, Usage{}, fmt.Errorf("llm: empty choices")
	}
	msg := out.Choices[0].Message
	if msg.Role == "" {
		msg.Role = "assistant"
	}
	u := Usage{
		PromptTokens:     out.Usage.PromptTokens,
		CompletionTokens: out.Usage.CompletionTokens,
		TotalTokens:      out.Usage.TotalTokens,
	}
	if u.TotalTokens == 0 {
		u.TotalTokens = u.PromptTokens + u.CompletionTokens
	}
	return msg, u, nil
}

type chatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Tools    []apiTool `json:"tools,omitempty"`
}

type apiTool struct {
	Type     string      `json:"type"`
	Function apiFunction `json:"function"`
}

type apiFunction struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Parameters  map[string]any `json:"parameters"`
}

type chatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
