package runtime

import "context"

// Message is an OpenAI-compatible chat message.
type Message struct {
	Role       string     `json:"role"`
	Content    string     `json:"content,omitempty"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
	Name       string     `json:"name,omitempty"`
}

type ToolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"` // "function"
	Function FunctionCall `json:"function"`
}

type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"` // JSON object string
}

// Tool is a callable function exposed to the model (PI AgentTool, simplified).
type Tool struct {
	Name        string
	Description string
	Parameters  map[string]any // JSON Schema object
	Execute     func(ctx ToolContext, args map[string]any) (string, error)
}

// ToolContext is the per-run workspace for tools.
type ToolContext struct {
	Ctx       context.Context
	Workspace string
}

// Event mirrors PI's agent events (subset).
type Event struct {
	Type       string   `json:"type"`
	Message    *Message `json:"message,omitempty"`
	ToolCallID string   `json:"tool_call_id,omitempty"`
	ToolName   string   `json:"tool_name,omitempty"`
	Args       string   `json:"args,omitempty"`
	Result     string   `json:"result,omitempty"`
	Error      string   `json:"error,omitempty"`
	Usage      *Usage   `json:"usage,omitempty"`
}

// Usage tracks client-side Token metering (docs: prepaid Credit).
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

func (u *Usage) Add(other Usage) {
	u.PromptTokens += other.PromptTokens
	u.CompletionTokens += other.CompletionTokens
	u.TotalTokens += other.TotalTokens
}

// TokensPerCredit is the prepaid rate from docs/prepaid-credit.
const TokensPerCredit = 1000

func CreditFromTokens(tokens int) int {
	if tokens <= 0 {
		return 0
	}
	return (tokens + TokensPerCredit - 1) / TokensPerCredit
}

// EstimateTokens is a crude client estimate (chars/4). Good enough for pre-check demos.
func EstimateTokens(s string) int {
	n := (len(s) + 3) / 4
	if n < 1 && s != "" {
		return 1
	}
	return n
}
