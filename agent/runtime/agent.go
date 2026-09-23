package runtime

import (
	"context"
	"fmt"
	"strings"
	"uuid"

	json "encoding/json/v2"
)

const DefaultSystemPrompt = `You are Sealoo, a friendly seal-themed desktop AI pet companion for Avalanche.
Be concise, warm, and helpful. Prefer tools when you need fresh web facts or must write a file.
	When researching, use search_web then fetch_page, then summarize in the final reply. Use read, write, edit, and bash for local files and commands.
Personality: simple, lighthearted. Finish with a short confirmation when a task is done.`

const DefaultMaxTurns = 100

// Agent is a PI-style stateful agent: messages + tools + loop.
type Agent struct {
	Completer Completer
	Tools     []Tool
	Messages  []Message
	Workspace string
	MaxTurns  int
	// MaxCredit caps tool use by CreditFromTokens(usage); 0 = unlimited.
	MaxCredit int
	OnEvent   func(Event)
}

// Prompt runs one user turn through the tool loop (PI agentLoop).
func (a *Agent) Prompt(ctx context.Context, userText string) (string, Usage, error) {
	if a.Completer == nil {
		return "", Usage{}, fmt.Errorf("agent: nil Completer")
	}
	maxTurns := a.MaxTurns
	if maxTurns <= 0 {
		maxTurns = DefaultMaxTurns
	}

	if len(a.Messages) == 0 {
		a.Messages = []Message{{Role: "system", Content: DefaultSystemPrompt}}
	}

	user := Message{Role: "user", Content: userText}
	a.Messages = append(a.Messages, user)
	a.emit(Event{Type: "agent_start"})
	a.emit(Event{Type: "message_end", Message: &user})

	var usage Usage
	toolCtx := ToolContext{Ctx: ctx, Workspace: a.Workspace}
	toolsByName := make(map[string]Tool, len(a.Tools))
	for _, t := range a.Tools {
		toolsByName[t.Name] = t
	}

	for turn := range maxTurns {
		_ = turn
		a.emit(Event{Type: "turn_start"})

		assistant, turnUsage, err := a.Completer.Complete(ctx, a.Messages, a.Tools)
		if err != nil {
			a.emit(Event{Type: "agent_end", Error: err.Error(), Usage: &usage})
			return "", usage, err
		}
		usage.Add(turnUsage)
		if assistant.Role == "" {
			assistant.Role = "assistant"
		}
		a.Messages = append(a.Messages, assistant)
		a.emit(Event{Type: "message_end", Message: &assistant, Usage: &turnUsage})

		atCap := a.MaxCredit > 0 && CreditFromTokens(usage.TotalTokens) >= a.MaxCredit
		if len(assistant.ToolCalls) == 0 || atCap {
			a.emit(Event{Type: "turn_end"})
			a.emit(Event{Type: "agent_end", Usage: &usage})
			return assistant.Content, usage, nil
		}

		for _, tc := range assistant.ToolCalls {
			name := tc.Function.Name
			a.emit(Event{
				Type:       "tool_execution_start",
				ToolCallID: tc.ID,
				ToolName:   name,
				Args:       tc.Function.Arguments,
			})

			result, execErr := a.execTool(toolCtx, toolsByName, tc)
			ev := Event{
				Type:       "tool_execution_end",
				ToolCallID: tc.ID,
				ToolName:   name,
				Result:     result,
			}
			if execErr != nil {
				ev.Error = execErr.Error()
				result = "error: " + execErr.Error()
			}
			a.emit(ev)

			id := tc.ID
			if id == "" {
				id = uuid.New().String()
			}
			a.Messages = append(a.Messages, Message{
				Role:       "tool",
				ToolCallID: id,
				Name:       name,
				Content:    result,
			})
		}
		a.emit(Event{Type: "turn_end"})
	}

	err := fmt.Errorf("agent: max turns (%d) exceeded", maxTurns)
	a.emit(Event{Type: "agent_end", Error: err.Error(), Usage: &usage})
	return "", usage, err
}

func (a *Agent) execTool(tc ToolContext, byName map[string]Tool, call ToolCall) (string, error) {
	t, ok := byName[call.Function.Name]
	if !ok {
		return "", fmt.Errorf("unknown tool %q", call.Function.Name)
	}
	args := map[string]any{}
	raw := strings.TrimSpace(call.Function.Arguments)
	if raw != "" && raw != "{}" {
		if err := json.Unmarshal([]byte(raw), &args); err != nil {
			return "", fmt.Errorf("bad tool args: %w", err)
		}
	}
	return t.Execute(tc, args)
}

func (a *Agent) emit(ev Event) {
	if a.OnEvent != nil {
		a.OnEvent(ev)
	}
}

// Reset clears conversation history (keeps tools / completer).
func (a *Agent) Reset() {
	a.Messages = nil
}
