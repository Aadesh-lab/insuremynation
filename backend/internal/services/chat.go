package services

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"imagine_backend/internal/apperror"
	"imagine_backend/internal/dto"
	"imagine_backend/internal/logger"
)
const (
	maxMessageLen = 2000
	maxHistory    = 10

	roleUser      = "user"
	roleAssistant = "assistant"

	defaultBaseURL  = "https://app.imagine.bo"
	upstreamTimeout = 60 * time.Second
	maxUpstreamBody = 1 << 20 // 1 MiB — far more than an answer plus citations

	topK        = 5
	temperature = 0.2
	systemPrompt = "You are the InsureMyNation Assistant, the chat assistant on the InsureMyNation website. " +
		"InsureNation is a boutique, IRDAI-registered insurance advisory firm in Connaught Place, New Delhi, " +
		"which advises on health, life, car, bike, travel and marine cover and runs a claims and mis-selling support desk. " +
		"Answer questions about the firm, its team, its cover, its careers and how to get in touch using only the provided context. " +
		"You may always explain what you are and what you can help with, even when the context does not cover it. " +
		"If the context does not answer something else, say so plainly — never guess and never fall back on general knowledge. " +
		"Whenever you hand a visitor over to a person, whether they asked for one or you cannot answer, write out the actual " +
		"phone number and email address from the context in your reply. Saying that a phone number exists without giving it " +
		"leaves them with nothing to act on. " +
		"Never invent policy details, prices, or coverage terms: a premium, an eligibility decision, or the wording of a " +
		"specific policy always needs a human adviser, so offer to have one call them back instead. " +
		"Keep answers short and plain — a few sentences, no marketing language."
)

var (
	errMessageRequired = apperror.New(http.StatusBadRequest, "message is required")
	errMessageTooLong  = apperror.New(http.StatusBadRequest, "message too long")
	errTooManyMessages = apperror.New(http.StatusTooManyRequests, "Too many messages. Please try again in a few minutes.")
	errBusy            = apperror.New(http.StatusTooManyRequests, "The assistant is busy right now. Please try again later.")
	errNotConfigured   = apperror.New(http.StatusServiceUnavailable, "chatbot not configured")
	errUnavailable     = apperror.New(http.StatusServiceUnavailable, "chatbot unavailable")
	errUpstreamFailed  = apperror.New(http.StatusBadGateway, "chatbot unavailable")
	errNotFound        = apperror.New(http.StatusNotFound, "not found")
)
const (
	msgBurstQuota  = 30
	msgBurstWindow = 10 * time.Minute

	msgDailyQuota  = 150
	msgDailyWindow = 24 * time.Hour
	ipWindow = 10 * time.Minute
	sessionQuota = 20
	maxIPBuckets = 100_000
)

type ipBucket struct {
	count int
	reset time.Time
}

var (
	ipMu        sync.Mutex
	ipBuckets   = map[string]*ipBucket{}
	ipLastSweep time.Time
)
func allowIP(ip string, now time.Time) bool {
	return allowN("burst:"+ip, msgBurstQuota, msgBurstWindow, now) &&
		allowN("day:"+ip, msgDailyQuota, msgDailyWindow, now)
}

func allowSession(ip string, now time.Time) bool {
	return allowN("sess:"+ip, sessionQuota, ipWindow, now)
}
func allowN(key string, quota int, window time.Duration, now time.Time) bool {
	ipMu.Lock()
	defer ipMu.Unlock()
	if now.Sub(ipLastSweep) >= ipWindow {
		for k, b := range ipBuckets {
			if now.After(b.reset) {
				delete(ipBuckets, k)
			}
		}
		ipLastSweep = now
	}
	if len(ipBuckets) >= maxIPBuckets {
		logger.Log.Printf("WARN: per-IP cap map reached %d entries, clearing it", len(ipBuckets))
		ipBuckets = map[string]*ipBucket{}
	}

	b, ok := ipBuckets[key]
	if !ok || now.After(b.reset) {
		b = &ipBucket{reset: now.Add(window)}
		ipBuckets[key] = b
	}
	if b.count >= quota {
		return false
	}
	b.count++
	return true
}

type ragConfig struct {
	apiKey  string
	kbID    string
	baseURL string
}

var notConfiguredOnce sync.Once
func loadRAGConfig() (ragConfig, error) {
	cfg := ragConfig{
		apiKey:  os.Getenv("RAG_API_KEY"),
		kbID:    os.Getenv("RAG_KB_ID"),
		baseURL: strings.TrimRight(os.Getenv("RAG_BASE_URL"), "/"),
	}
	if cfg.baseURL == "" {
		cfg.baseURL = defaultBaseURL
	}
	if cfg.apiKey == "" || cfg.kbID == "" {
		notConfiguredOnce.Do(func() {
			logger.Log.Printf("ERROR: chatbot not configured — RAG_API_KEY and RAG_KB_ID must both be set")
		})
		return cfg, errNotConfigured
	}
	return cfg, nil
}

var ragClient = &http.Client{Timeout: upstreamTimeout}
var ragStreamClient = &http.Client{
	Transport: &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           (&net.Dialer{Timeout: 10 * time.Second}).DialContext,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: upstreamTimeout,
	},
}

type ragQueryRequest struct {
	Message      string            `json:"message"`
	KBID         string            `json:"kb_id"`
	History      []dto.ChatMessage `json:"history"`
	SessionID    string            `json:"session_id,omitempty"`
	TopK         int               `json:"top_k"`
	Temperature  float64           `json:"temperature"`
	SystemPrompt string            `json:"system_prompt"`
	Stream       bool              `json:"stream,omitempty"`
}
type ragSource struct {
	FileID    string  `json:"file_id"`
	FileName  string  `json:"file_name"`
	ChunkText string  `json:"chunk_text"`
	Score     float64 `json:"score"`
}

func validate(req dto.QueryRequest) (string, []dto.ChatMessage, error) {
	msg := strings.TrimSpace(req.Message)
	if msg == "" {
		return "", nil, errMessageRequired
	}
	if utf8.RuneCountInString(msg) > maxMessageLen {
		return "", nil, errMessageTooLong
	}
	return msg, sanitizeHistory(req.History), nil
}
func sanitizeHistory(in []dto.ChatMessage) []dto.ChatMessage {
	out := make([]dto.ChatMessage, 0, maxHistory)
	for _, m := range in {
		if m.Role != roleUser && m.Role != roleAssistant {
			continue
		}
		if strings.TrimSpace(m.Content) == "" {
			continue
		}
		out = append(out, dto.ChatMessage{
			Role:    m.Role,
			Content: truncateRunes(m.Content, maxMessageLen),
		})
	}
	if len(out) > maxHistory {
		out = out[len(out)-maxHistory:]
	}
	return out
}
func truncateRunes(s string, max int) string {
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	return string([]rune(s)[:max])
}
func prepareQuery(ip string, req dto.QueryRequest, stream bool) (ragConfig, ragQueryRequest, error) {
	msg, history, err := validate(req)
	if err != nil {
		return ragConfig{}, ragQueryRequest{}, err
	}
	if !allowIP(ip, time.Now()) {
		return ragConfig{}, ragQueryRequest{}, errTooManyMessages
	}
	cfg, err := loadRAGConfig()
	if err != nil {
		return ragConfig{}, ragQueryRequest{}, err
	}

	sessionID := req.SessionID
	if sessionID != "" && !ownsSession(ip, sessionID) {
		logger.Log.Printf("WARN: query referenced a session this client does not own, dropping session_id")
		sessionID = ""
	}

	return cfg, ragQueryRequest{
		Message:      msg,
		KBID:         cfg.kbID,
		History:      history,
		SessionID:    sessionID,
		TopK:         topK,
		Temperature:  temperature,
		SystemPrompt: systemPrompt,
		Stream:       stream,
	}, nil
}

func callUpstream(
	ctx context.Context,
	client *http.Client,
	cfg ragConfig,
	method, path string,
	query url.Values,
	body any,
	accept string,
) (*http.Response, time.Duration, error) {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			logger.Log.Printf("ERROR: RAG request encode failed: %v", err)
			return nil, 0, errUpstreamFailed
		}
		reader = bytes.NewReader(raw)
	}

	target := cfg.baseURL + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, target, reader)
	if err != nil {
		logger.Log.Printf("ERROR: RAG request build failed: %v", err)
		return nil, 0, errUpstreamFailed
	}
	httpReq.Header.Set("Authorization", "Bearer "+cfg.apiKey)
	if body != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}
	if accept != "" {
		httpReq.Header.Set("Accept", accept)
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	elapsed := time.Since(start)
	if err != nil {
		logger.Log.Printf("ERROR: RAG transport error on %s %s after %s: %v",
			method, path, elapsed.Round(time.Millisecond), err)
		return nil, elapsed, errUpstreamFailed
	}

	if resp.StatusCode/100 != 2 {
		defer resp.Body.Close()
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
		if trimmed := strings.TrimSpace(string(detail)); trimmed != "" {
			logger.Log.Printf("ERROR: RAG upstream said (%s %s, %d): %s", method, path, resp.StatusCode, trimmed)
		}
		return nil, elapsed, mapUpstreamStatus(method, path, resp.StatusCode, elapsed)
	}
	return resp, elapsed, nil
}

func mapUpstreamStatus(method, path string, status int, elapsed time.Duration) error {
	d := elapsed.Round(time.Millisecond)
	switch status {
	case http.StatusUnauthorized, http.StatusForbidden:
		logger.Log.Printf("ERROR: RAG auth rejected (%s %s, upstream %d, %s)", method, path, status, d)
		return errUnavailable
	case http.StatusPaymentRequired:
		logger.Log.Printf("ERROR: RAG quota exhausted (%s %s, upstream %d, %s)", method, path, status, d)
		return errBusy
	case http.StatusNotFound:
		logger.Log.Printf("ERROR: RAG kb not found (%s %s, upstream %d, %s)", method, path, status, d)
		return errUnavailable
	default:
		logger.Log.Printf("ERROR: RAG query failed (%s %s, upstream %d, %s)", method, path, status, d)
		return errUpstreamFailed
	}
}
func decodePayload(r io.Reader, v any) error {
	raw, err := io.ReadAll(io.LimitReader(r, maxUpstreamBody))
	if err != nil {
		return err
	}
	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(raw, &envelope); err == nil && len(envelope.Data) > 0 {
		if err := json.Unmarshal(envelope.Data, v); err == nil {
			return nil
		}
	}
	return json.Unmarshal(raw, v)
}
func Query(ctx context.Context, ip string, req dto.QueryRequest) (*dto.QueryResponse, error) {
	cfg, body, err := prepareQuery(ip, req, false)
	if err != nil {
		return nil, err
	}

	resp, elapsed, err := callUpstream(ctx, ragClient, cfg, http.MethodPost, "/v1/query", nil, body, "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var payload struct {
		Answer  string      `json:"answer"`
		Sources []ragSource `json:"sources"`
	}
	if err := decodePayload(resp.Body, &payload); err != nil {
		logger.Log.Printf("ERROR: RAG response decode failed (upstream %d, %s): %v",
			resp.StatusCode, elapsed.Round(time.Millisecond), err)
		return nil, errUpstreamFailed
	}
	if strings.TrimSpace(payload.Answer) == "" {
		logger.Log.Printf("ERROR: RAG returned an empty answer (upstream %d, %s)",
			resp.StatusCode, elapsed.Round(time.Millisecond))
		return nil, errUpstreamFailed
	}
	out := &dto.QueryResponse{
		Answer:  payload.Answer,
		Sources: make([]dto.Source, 0, len(payload.Sources)),
	}
	for _, s := range payload.Sources {
		out.Sources = append(out.Sources, dto.Source{FileName: s.FileName, Score: s.Score})
	}
	return out, nil
}
func QueryStream(ctx context.Context, ip string, req dto.QueryRequest) (io.ReadCloser, error) {
	cfg, body, err := prepareQuery(ip, req, true)
	if err != nil {
		return nil, err
	}
	resp, _, err := callUpstream(ctx, ragStreamClient, cfg, http.MethodPost, "/v1/query", nil, body, "text/event-stream")
	if err != nil {
		return nil, err
	}
	return resp.Body, nil
}
func RelaySSE(w io.Writer, flush func(), body io.Reader) {
	reader := bufio.NewReaderSize(body, 8<<10)
	for {
		line, err := reader.ReadBytes('\n')
		if len(line) > 0 {
			if _, werr := w.Write(sanitizeSSELine(line)); werr != nil {
				return
			}
			flush()
		}
		if err != nil {
			return
		}
	}
}
const ssePrefix = "data:"
const sseOut = "data: "
func sanitizeSSELine(line []byte) []byte {
	trimmed := bytes.TrimRight(line, "\r\n")
	if !bytes.HasPrefix(trimmed, []byte(ssePrefix)) {
		return line
	}
	payload := bytes.TrimSpace(trimmed[len(ssePrefix):])
	if len(payload) == 0 || payload[0] != '{' {
		return line
	}
	var frame map[string]any
	if err := json.Unmarshal(payload, &frame); err != nil {
		return nil
	}
	if _, present := frame["sources"]; !present {
		return line
	}
	clean := make([]any, 0)
	if raw, ok := frame["sources"].([]any); ok {
		for _, item := range raw {
			src, ok := item.(map[string]any)
			if !ok {
				continue
			}
			clean = append(clean, map[string]any{
				"file_name": src["file_name"],
				"score":     src["score"],
			})
		}
	}
	frame["sources"] = clean

	out, err := json.Marshal(frame)
	if err != nil {
		return nil
	}
	return append(append([]byte(sseOut), out...), '\n')
}
