package runtime

import (
	"context"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	goruntime "runtime"
	"strings"
	"time"
)

// DefaultTools: read, write, edit, bash, plus search_web and fetch_page.
func DefaultTools() []Tool {
	return []Tool{readTool(), writeTool(), editTool(), bashTool(), searchWebTool(), fetchPageTool()}
}

func strSchema(desc string) map[string]any {
	return map[string]any{"type": "string", "description": desc}
}

func objSchema(props map[string]any, required ...string) map[string]any {
	return map[string]any{"type": "object", "properties": props, "required": required}
}

func argString(args map[string]any, key string) string {
	s, _ := args[key].(string)
	return strings.TrimSpace(s)
}

func searchWebTool() Tool {
	return Tool{
		Name:        "search_web",
		Description: "Search the web. Returns titles, URLs, and snippets.",
		Parameters:  objSchema(map[string]any{"query": strSchema("search query")}, "query"),
		Execute: func(tc ToolContext, args map[string]any) (string, error) {
			q := argString(args, "query")
			if q == "" {
				return "", fmt.Errorf("query is required")
			}
			return searchWeb(tc.Ctx, q)
		},
	}
}

func fetchPageTool() Tool {
	return Tool{
		Name:        "fetch_page",
		Description: "Fetch a URL and return readable text.",
		Parameters:  objSchema(map[string]any{"url": strSchema("http(s) URL")}, "url"),
		Execute: func(tc ToolContext, args map[string]any) (string, error) {
			raw := argString(args, "url")
			if raw == "" {
				return "", fmt.Errorf("url is required")
			}
			return fetchPage(tc.Ctx, raw)
		},
	}
}

func readTool() Tool {
	return Tool{
		Name:        "read",
		Description: "Read a text file. Relative paths are under the workspace.",
		Parameters:  objSchema(map[string]any{"path": strSchema("file path")}, "path"),
		Execute: func(tc ToolContext, args map[string]any) (string, error) {
			path := argString(args, "path")
			if path == "" {
				return "", fmt.Errorf("path is required")
			}
			return readFile(tc.Workspace, path)
		},
	}
}

func writeTool() Tool {
	return Tool{
		Name:        "write",
		Description: "Write a text file. Relative paths are under the workspace.",
		Parameters: objSchema(map[string]any{
			"path":    strSchema("file path"),
			"content": strSchema("file contents"),
		}, "path", "content"),
		Execute: func(tc ToolContext, args map[string]any) (string, error) {
			path := argString(args, "path")
			content, _ := args["content"].(string)
			if path == "" {
				return "", fmt.Errorf("path is required")
			}
			return writeFile(tc.Workspace, path, content)
		},
	}
}

func editTool() Tool {
	return Tool{
		Name:        "edit",
		Description: "Replace one exact occurrence of old_string with new_string in a file.",
		Parameters: objSchema(map[string]any{
			"path":       strSchema("file path"),
			"old_string": strSchema("exact text to replace"),
			"new_string": strSchema("replacement text"),
		}, "path", "old_string", "new_string"),
		Execute: func(tc ToolContext, args map[string]any) (string, error) {
			path := argString(args, "path")
			old, _ := args["old_string"].(string)
			neu, _ := args["new_string"].(string)
			if path == "" || old == "" {
				return "", fmt.Errorf("path and old_string are required")
			}
			return editFile(tc.Workspace, path, old, neu)
		},
	}
}

func bashTool() Tool {
	return Tool{
		Name:        "bash",
		Description: "Run a shell command in the workspace. On Windows this uses PowerShell.",
		Parameters:  objSchema(map[string]any{"command": strSchema("shell command")}, "command"),
		Execute: func(tc ToolContext, args map[string]any) (string, error) {
			command := argString(args, "command")
			if command == "" {
				return "", fmt.Errorf("command is required")
			}
			return runBash(tc.Ctx, tc.Workspace, command)
		},
	}
}

func searchWeb(ctx context.Context, query string) (string, error) {
	u := "https://html.duckduckgo.com/html/?q=" + url.QueryEscape(query)
	body, err := httpGet(ctx, u)
	if err != nil {
		return "", err
	}
	text := html.UnescapeString(string(body))
	matches := reDDG.FindAllStringSubmatch(text, 5)
	if len(matches) == 0 {
		return "no results", nil
	}
	var b strings.Builder
	for i, m := range matches {
		title := stripTags(m[2])
		link := unwrapDDG(html.UnescapeString(m[1]))
		fmt.Fprintf(&b, "%d. %s\n%s\n", i+1, title, link)
	}
	return strings.TrimSpace(b.String()), nil
}

var reDDG = regexp.MustCompile(`(?s)<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>`)

func unwrapDDG(href string) string {
	u, err := url.Parse(href)
	if err != nil {
		return href
	}
	if q := u.Query().Get("uddg"); q != "" {
		return q
	}
	if strings.HasPrefix(href, "//") {
		return "https:" + href
	}
	return href
}

func fetchPage(ctx context.Context, rawURL string) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("url must be http(s)")
	}
	body, err := httpGet(ctx, rawURL)
	if err != nil {
		return "", err
	}
	text := stripTags(string(body))
	const max = 8000
	if len(text) > max {
		text = text[:max] + "…"
	}
	if text == "" {
		return "(empty page)", nil
	}
	return text, nil
}

func httpGet(ctx context.Context, rawURL string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "SealooAgent/0.1")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 200_000))
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("http %s", res.Status)
	}
	return body, nil
}

var (
	reScript = regexp.MustCompile(`(?is)<script[\s\S]*?</script>`)
	reStyle  = regexp.MustCompile(`(?is)<style[\s\S]*?</style>`)
	reTag    = regexp.MustCompile(`<[^>]+>`)
	reSpace  = regexp.MustCompile(`[ \t]*\n[ \t]*`)
)

func stripTags(s string) string {
	s = reScript.ReplaceAllString(s, " ")
	s = reStyle.ReplaceAllString(s, " ")
	s = reTag.ReplaceAllString(s, " ")
	s = html.UnescapeString(s)
	s = reSpace.ReplaceAllString(s, "\n")
	return strings.TrimSpace(s)
}

func resolvePath(workspace, path string) string {
	if !filepath.IsAbs(path) && workspace != "" {
		return filepath.Join(workspace, path)
	}
	return path
}

func readFile(workspace, path string) (string, error) {
	b, err := os.ReadFile(resolvePath(workspace, path))
	if err != nil {
		return "", err
	}
	text := string(b)
	const max = 32000
	if len(text) > max {
		text = text[:max] + "…"
	}
	return text, nil
}

func writeFile(workspace, path, content string) (string, error) {
	path = resolvePath(workspace, path)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", err
	}
	return "wrote " + path, nil
}

func editFile(workspace, path, old, neu string) (string, error) {
	path = resolvePath(workspace, path)
	b, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	s := string(b)
	n := strings.Count(s, old)
	if n == 0 {
		return "", fmt.Errorf("old_string not found")
	}
	if n > 1 {
		return "", fmt.Errorf("old_string matched %d times", n)
	}
	if err := os.WriteFile(path, []byte(strings.Replace(s, old, neu, 1)), 0o644); err != nil {
		return "", err
	}
	return "edited " + path, nil
}

func runBash(ctx context.Context, workspace, command string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	var c *exec.Cmd
	if goruntime.GOOS == "windows" {
		c = exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-Command", command)
	} else {
		c = exec.CommandContext(ctx, "bash", "-lc", command)
	}
	if workspace != "" {
		c.Dir = workspace
	}
	out, err := c.CombinedOutput()
	text := strings.TrimSpace(string(out))
	const max = 8000
	if len(text) > max {
		text = text[:max] + "…"
	}
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, text)
	}
	if text == "" {
		return "(no output)", nil
	}
	return text, nil
}
