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
	// Contact details are stated here, not left to retrieval, for the same reason
	// identity is. A question like "how do I make a claim?" retrieves the claims
	// section but not the adviser section, so an instruction to quote the number
	// "from the context" had no number to quote — and the model filled the hole with
	// "[Insert Phone Number]", which shipped to visitors as an apparent request for
	// *their* details. A handful of fixed facts the assistant must never get wrong
	// belong in the prompt, where they are present on every call.
	//
	// These mirror PHONE and EMAIL in frontend/src/data/site.js, which is the source
	// of truth for the site. If you change them there, change them here too.
	contactPhone = "+91 99101 69789"
	contactEmail = "nehal@insuremynation.com"

	systemPrompt = "You are the InsureMyNation Assistant, the chat assistant on the InsureMyNation website. " +
		"InsureNation is a boutique, IRDAI-registered insurance advisory firm in Connaught Place, New Delhi, " +
		"which advises on health, life, car, bike, travel and marine cover and runs a claims and mis-selling support desk. " +
		"Answer questions about the firm, its team, its cover, its careers and how to get in touch using only the provided context. " +
		"You may always explain what you are and what you can help with, even when the context does not cover it. " +
		"If the context does not answer something else, say so plainly — never guess and never fall back on general knowledge. " +
		"The firm's contact details are exactly these, and you always know them regardless of the context: " +
		"phone " + contactPhone + ", email " + contactEmail + ". " +
		"Whenever you hand a visitor over to a person, whether they asked for one or you cannot answer, write those out in full. " +
		"Never write a placeholder such as [Insert Phone Number] or [Insert Email Address], and never ask the visitor to " +
		"supply the firm's own contact details — use the values above. " +
		"Never invent policy details, prices, or coverage terms: a premium, an eligibility decision, or the wording of a " +
		"specific policy always needs a human adviser, so offer to have one call them back instead. " +
		"Keep answers short and plain — a few sentences, no marketing language."

	// funnelRules is the part of every product funnel that does not vary.
	//
	// The two prohibitions in the middle are not stylistic. A premium or an eligibility
	// decision is not in the knowledge base and cannot be derived from it, so any figure
	// the model produced would be invented and quotable back at the firm. And nothing in
	// this repo captures a lead: a phone number typed into the chat is written to the
	// upstream's transcript and read by nobody, so asking for one promises a call back
	// that will not happen. Both change the day POST /v1/lead exists — see
	// user_flow_insurance.md.
	funnelRules = "The visitor is on one of our product pages, so they have already said which cover they want — " +
		"never ask them to choose a product again. Work through the questions below in that order, " +
		"one question per reply, acknowledging what they just told you in a sentence before asking the next one. " +
		"Keep each reply to two or three sentences. " +
		"Vary how you acknowledge them and never open two replies in a row with \"Thank you\". " +
		// Without the second half of this, the model read the formatting example as a
		// menu and asked a marine shipper whether their cargo was worth "Rs 10 lakh or
		// Rs 2 crore".
		"Money is Indian: write amounts in lakh and crore, as in Rs 10 lakh, never in dollars and never in millions. " +
		"That is a rule about how you write a figure, not a list of options to offer them. " +
		"If they ask you something instead of answering, answer it from the context and then put your question again. " +
		// A visitor who picked "Another RTO" got asked which one, which put the funnel a
		// question out of step for the rest of the conversation: they then answered a
		// question the assistant had not asked. An adviser can pin any of this down on
		// the call; the funnel cannot afford the extra turn.
		"Accept a vague answer — another city, not sure, do not know — as the answer and move to the next question. " +
		"Never ask them to narrow one down, and never ask a question that is not on the list below. " +
		"If they say they would rather just talk to someone, stop asking and hand them over immediately. " +
		"Never state a premium, a rate, a waiting period or an eligibility decision — those are not in the context " +
		"and an adviser has to work them out. " +
		"Never ask for their name, phone number or email, and never ask for a PAN, Aadhaar or policy number. " +
		// Left as "when you have the answers", the model treated the last question as
		// just another turn and asked a sixth of its own invention — so the visitor
		// never got the summary or the hand-over, which is the only point of the funnel.
		"There are five questions and no more. The moment the fifth is answered, stop asking — and " +
		"\"I am not sure\" counts as answered, so do not offer to help them decide instead: " +
		"summarise every answer they gave back to them in one short paragraph, and tell them to fill in the quote " +
		"form on this page to get a call back, or to call " + contactPhone + " to speak to an adviser now. " +
		// It kept ending on "would you like to speak to an adviser?" — a question, so no
		// summary, and a hand-over the visitor has to accept before they get one.
		"That reply must contain the summary and must not contain a question of any kind."

	healthFunnel = "The visitor is on the health insurance page. Ask, in this order: " +
		"1) who is being covered — just themselves, themselves and their spouse, a family floater with children, " +
		"or senior-citizen parents; 2) the age band of the eldest person to be covered; " +
		"3) which city they are in, since hospital networks and pricing vary by city; " +
		"4) the sum insured they have in mind, in lakh or crore; " +
		// One question, four options, mirroring the chips the panel offers. Asked as two
		// ("do you have cover, and does anyone have a condition?") a visitor answers one
		// half and the assistant spends a sixth turn on the other.
		"5) where they stand today — cover through an employer, their own policy, nothing yet, or a medical " +
		"condition that needs declaring. " +
		"If they declare a condition, say plainly that it is exactly the case an adviser needs to place and that it " +
		"affects what a policy will cover — but never say what the waiting period or the loading would be. " +
		"You may mention that health premiums qualify for a deduction under Section 80D, without quoting any limit."

	lifeFunnel = "The visitor is on the life insurance page. Ask, in this order: " +
		"1) what kind of plan they want — pure term cover, term with savings, a unit-linked plan, or they are unsure; " +
		"2) their age band; 3) the sum assured they have in mind, in lakh or crore; " +
		"4) what loans or liabilities they would want cleared — home loan, personal or car loan, business liabilities, " +
		"or none; 5) who depends on their income. " +
		"Size the conversation around liabilities and dependents rather than a slab. " +
		"You may mention Section 80C and that the payout is tax-free in the family's hands, both of which are in the " +
		"context, but never quote a limit, a rate of return or a premium."

	carFunnel = "The visitor is on the car insurance page. Ask, in this order: " +
		"1) whether they are renewing, insuring a car they have just bought, holding a policy that has already " +
		"expired, or moving up from third-party-only cover; 2) what the car is — hatchback or sedan, SUV, " +
		"luxury, or exotic; 3) the city the car is registered in, the RTO; " +
		"4) whether they claimed last year, which decides their no-claim bonus; " +
		"5) which add-ons matter to them — zero depreciation, engine protection, return to invoice. " +
		"If the policy has already lapsed, say it needs sorting quickly and that an adviser will handle it, without " +
		"promising how or when. You may say third-party cover is legally required in India. " +
		"IDV is the insured value of the car — you may explain the term, but never calculate one."

	bikeFunnel = "The visitor is on the two-wheeler insurance page, where our copy is about superbikes. " +
		"Ask, in this order: 1) what the bike is — a superbike above 500cc, something between 150cc and 500cc, " +
		"a commuter under 150cc, or an electric scooter; 2) whether they are renewing, have just bought it, have " +
		"let the policy expire, or hold third-party cover only; 3) the RTO city it is registered in; " +
		"4) whether they claimed last year, for the no-claim bonus; " +
		"5) which add-ons matter — zero depreciation, accessories cover, pillion cover, engine protection. " +
		"For anything above 500cc, say why a standard two-wheeler policy usually is not enough. " +
		"You may say third-party cover is legally required in India."

	travelFunnel = "The visitor is on the travel insurance page. Ask, in this order: " +
		"1) where they are going — Schengen Europe, USA or Canada, the UK, or Dubai and South East Asia; " +
		"2) what kind of trip it is — single trip, an annual multi-trip policy, a student going abroad, or a family " +
		"holiday; 3) how long they will be away; 4) who is travelling, and whether anyone is over 60; " +
		"5) whether they need the policy as proof of insurance for a visa. " +
		"If it is for a visa, say the certificate has to name the right cover and dates, and that an adviser will " +
		"make sure it does. Never state a required sum insured for any country or embassy — that is not in the context."

	marineFunnel = "The visitor is on the marine insurance page and is almost certainly a business, not a household. " +
		"Ask, in this order: 1) whether they are insuring imports, exports, domestic transit, or ship both ways " +
		"regularly; 2) the mode — sea, air, road or rail, or multi-modal warehouse to warehouse; " +
		"3) what commodity moves; 4) whether they need cover for a single shipment or an annual open cover with " +
		"declarations; 5) the value per shipment, in lakh or crore, or whether they would rather rate it on annual " +
		"turnover. Use the trade vocabulary properly: Institute Cargo Clauses A, B and C, Incoterms, and a letter of " +
		"credit that requires cover in the seller's or the buyer's name. Never say which clause they need or price a " +
		"rate — that is the adviser's call, and we appoint the surveyor when there is a claim."
)

// productPrompts is an allowlist, and that is the whole point of it.
//
// The browser sends a product *id*; this map turns it into an instruction. Nothing the
// browser sends is ever concatenated into system_prompt, so an unrecognised or hostile
// value gets the base prompt rather than a rewritten assistant. Keys match the ids in
// frontend/src/data/products.js.
var productPrompts = map[string]string{
	"health": healthFunnel + " " + funnelRules,
	"life":   lifeFunnel + " " + funnelRules,
	"car":    carFunnel + " " + funnelRules,
	"bike":   bikeFunnel + " " + funnelRules,
	"travel": travelFunnel + " " + funnelRules,
	"marine": marineFunnel + " " + funnelRules,
}

// buildSystemPrompt returns the base prompt, plus the funnel for a known product.
func buildSystemPrompt(product string) string {
	if funnel, ok := productPrompts[product]; ok {
		return systemPrompt + " " + funnel
	}
	return systemPrompt
}

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
	ipWindow       = 10 * time.Minute
	sessionQuota   = 20
	maxIPBuckets   = 100_000
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
		SystemPrompt: buildSystemPrompt(req.Product),
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
