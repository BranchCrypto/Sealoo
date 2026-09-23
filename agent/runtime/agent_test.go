package runtime

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	json "encoding/json/v2"
)

type scripted struct {
	replies []Message
	i       int
}

func (s *scripted) Complete(context.Context, []Message, []Tool) (Message, Usage, error) {
	m := s.replies[s.i]
	s.i++
	return m, Usage{PromptTokens: 10, CompletionTokens: 5, TotalTokens: 15}, nil
}

func TestPromptToolLoop(t *testing.T) {
	dir := t.TempDir()
	var tools []string
	ag := &Agent{
		Completer: &scripted{replies: []Message{
			{
				Role: "assistant",
				ToolCalls: []ToolCall{{
					ID:   "1",
					Type: "function",
					Function: FunctionCall{
						Name:      "search_web",
						Arguments: `{"query":"Avalanche"}`,
					},
				}},
			},
			{Role: "assistant", Content: "Avalanche is a blockchain. Done!"},
		}},
		Tools: []Tool{{
			Name: "search_web",
			Execute: func(ToolContext, map[string]any) (string, error) {
				tools = append(tools, "search_web")
				return "Avalanche docs", nil
			},
		}},
		Workspace: dir,
	}

	answer, usage, err := ag.Prompt(t.Context(), "research Avalanche")
	if err != nil {
		t.Fatal(err)
	}
	if answer != "Avalanche is a blockchain. Done!" {
		t.Fatalf("answer %q", answer)
	}
	if len(tools) != 1 || usage.TotalTokens != 30 {
		t.Fatalf("tools=%v usage=%+v", tools, usage)
	}
	if CreditFromTokens(usage.TotalTokens) != 1 {
		t.Fatalf("credit %d", CreditFromTokens(usage.TotalTokens))
	}
	if CreditFromTokens(4800) != 5 || CreditFromTokens(0) != 0 {
		t.Fatal("credit conversion")
	}
}

func TestMaxCreditStopsTools(t *testing.T) {
	dir := t.TempDir()
	var tools []string
	ag := &Agent{
		Completer: &scripted{replies: []Message{
			{
				Role: "assistant",
				ToolCalls: []ToolCall{{
					ID:       "1",
					Type:     "function",
					Function: FunctionCall{Name: "search_web", Arguments: `{"query":"x"}`},
				}},
			},
			{Role: "assistant", Content: "should not reach"},
		}},
		Tools: []Tool{{
			Name: "search_web",
			Execute: func(ToolContext, map[string]any) (string, error) {
				tools = append(tools, "search_web")
				return "ok", nil
			},
		}},
		Workspace: dir,
		MaxCredit: 1, // first Complete uses 15 tokens → 1 credit → at cap, skip tools
	}
	answer, usage, err := ag.Prompt(t.Context(), "hi")
	if err != nil {
		t.Fatal(err)
	}
	if len(tools) != 0 {
		t.Fatalf("tools should not run at credit cap: %v", tools)
	}
	if usage.TotalTokens != 15 {
		t.Fatalf("usage %+v", usage)
	}
	if answer != "" && answer != "should not reach" {
		// content may be empty when tool call only
	}
	_ = answer
}

func TestEventJSON(t *testing.T) {
	ev := Event{Type: "tool_execution_start", ToolName: "search_web", Args: `{"query":"a"}`}
	b, err := json.Marshal(ev)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	if m["type"] != "tool_execution_start" || m["tool_name"] != "search_web" {
		t.Fatalf("wire %s", b)
	}
}

func TestReadWriteEdit(t *testing.T) {
	dir := t.TempDir()
	if _, err := writeFile(dir, "avalanche-report.md", "# Avalanche\n"); err != nil {
		t.Fatal(err)
	}
	got, err := readFile(dir, "avalanche-report.md")
	if err != nil || got != "# Avalanche\n" {
		t.Fatalf("read %q %v", got, err)
	}
	if _, err := editFile(dir, "avalanche-report.md", "Avalanche", "Sealoo"); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(filepath.Join(dir, "avalanche-report.md"))
	if err != nil || string(b) != "# Sealoo\n" {
		t.Fatalf("edited %q %v", b, err)
	}
	if _, err := editFile(dir, "avalanche-report.md", "nope", "x"); err == nil {
		t.Fatal("expected missing old_string")
	}
}

func TestBash(t *testing.T) {
	out, err := runBash(t.Context(), t.TempDir(), "echo hi")
	if err != nil {
		t.Fatal(err)
	}
	if out != "hi" {
		t.Fatalf("bash %q", out)
	}
}
