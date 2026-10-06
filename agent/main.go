package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	json "encoding/json/v2"

	"sealoo/agent/runtime"
)

func main() {
	prompt := flag.String("prompt", "", "user message; reads stdin when empty")
	workspace := flag.String("workspace", ".", "directory for read, write, and edit")
	events := flag.Bool("events", false, "write one JSON event per line on stdout")
	maxCredit := flag.Int("max-credit", 0, "stop tools when CreditFromTokens(usage) reaches this; 0=unlimited")
	flag.Parse()

	text := strings.TrimSpace(*prompt)
	if text == "" {
		b, err := io.ReadAll(os.Stdin)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		text = strings.TrimSpace(string(b))
	}
	if text == "" {
		fmt.Fprintln(os.Stderr, "usage: sealoo-agent -prompt \"...\"")
		os.Exit(2)
	}
	if os.Getenv("OPENAI_API_KEY") == "" {
		fmt.Fprintln(os.Stderr, "set OPENAI_API_KEY to the Sealoo gateway ticket (not a model vendor key). optional: OPENAI_BASE_URL, OPENAI_MODEL")
		os.Exit(1)
	}

	ag := &runtime.Agent{
		Completer: &runtime.OpenAIClient{
			BaseURL: os.Getenv("OPENAI_BASE_URL"),
			APIKey:  os.Getenv("OPENAI_API_KEY"),
			Model:   os.Getenv("OPENAI_MODEL"),
		},
		Tools:     runtime.DefaultTools(),
		Workspace: *workspace,
		MaxCredit: *maxCredit,
		OnEvent: func(ev runtime.Event) {
			if *events {
				writeEvent(ev)
				return
			}
			switch ev.Type {
			case "tool_execution_start":
				fmt.Fprintf(os.Stderr, "%s %s\n", ev.ToolName, ev.Args)
			case "agent_end":
				if ev.Error != "" {
					fmt.Fprintln(os.Stderr, ev.Error)
				}
				if ev.Usage != nil {
					fmt.Fprintf(os.Stderr, "tokens=%d credit=%d\n", ev.Usage.TotalTokens, runtime.CreditFromTokens(ev.Usage.TotalTokens))
				}
			}
		},
	}

	answer, _, err := ag.Prompt(context.Background(), text)
	if *events {
		if err != nil {
			os.Exit(1)
		}
		return
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(answer)
}

func writeEvent(ev runtime.Event) {
	b, err := json.Marshal(ev)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	_, _ = os.Stdout.Write(append(b, '\n'))
	_ = os.Stdout.Sync()
}
