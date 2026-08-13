package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	"imagine_backend/internal/dto"
	"imagine_backend/internal/logger"
)

const sessionNameLen = 80
const sessionTTL = 24 * time.Hour
const maxSessionOwners = 50_000

type sessionOwner struct {
	owner   string
	expires time.Time
}

var (
	sessMu        sync.Mutex
	sessOwners    = map[string]sessionOwner{}
	sessLastSweep time.Time
)
func rememberSession(client, sessionID string, now time.Time) {
	if sessionID == "" {
		return
	}
	sessMu.Lock()
	defer sessMu.Unlock()
	sweepSessionsLocked(now)
	if len(sessOwners) >= maxSessionOwners {
		logger.Log.Printf("WARN: session ownership map reached %d entries, dropping the oldest half", len(sessOwners))
		evictOldestSessionsLocked(len(sessOwners) / 2)
	}

	sessOwners[sessionID] = sessionOwner{owner: client, expires: now.Add(sessionTTL)}
}

func evictOldestSessionsLocked(n int) {
	if n <= 0 {
		return
	}
	type aged struct {
		id      string
		expires time.Time
	}
	all := make([]aged, 0, len(sessOwners))
	for id, rec := range sessOwners {
		all = append(all, aged{id: id, expires: rec.expires})
	}
	slices.SortFunc(all, func(a, b aged) int { return a.expires.Compare(b.expires) })
	for i := 0; i < n && i < len(all); i++ {
		delete(sessOwners, all[i].id)
	}
}

func ownsSession(client, sessionID string) bool {
	now := time.Now()
	sessMu.Lock()
	defer sessMu.Unlock()
	sweepSessionsLocked(now)
	rec, ok := sessOwners[sessionID]
	return ok && rec.owner == client && now.Before(rec.expires)
}

func ownedSessions(client string) map[string]struct{} {
	now := time.Now()
	sessMu.Lock()
	defer sessMu.Unlock()
	sweepSessionsLocked(now)
	out := map[string]struct{}{}
	for id, rec := range sessOwners {
		if rec.owner == client && now.Before(rec.expires) {
			out[id] = struct{}{}
		}
	}
	return out
}

func sweepSessionsLocked(now time.Time) {
	if now.Sub(sessLastSweep) < time.Hour {
		return
	}
	for id, rec := range sessOwners {
		if now.After(rec.expires) {
			delete(sessOwners, id)
		}
	}
	sessLastSweep = now
}
func ListKB(ctx context.Context, _ string) ([]json.RawMessage, error) {
	cfg, err := loadRAGConfig()
	if err != nil {
		return nil, err
	}

	resp, _, err := callUpstream(ctx, ragClient, cfg, http.MethodGet, "/v1/kb", nil, nil, "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var all []json.RawMessage
	if err := decodePayload(resp.Body, &all); err != nil {
		logger.Log.Printf("ERROR: RAG kb list decode failed: %v", err)
		return nil, errUpstreamFailed
	}

	for _, raw := range all {
		var kb struct {
			KBID string `json:"kb_id"`
		}
		if err := json.Unmarshal(raw, &kb); err != nil {
			continue
		}
		if kb.KBID == cfg.kbID {
			return []json.RawMessage{raw}, nil
		}
	}
	logger.Log.Printf("ERROR: RAG kb not found — RAG_KB_ID is not among the knowledge bases this key can reach")
	return nil, errUnavailable
}

func CreateSession(ctx context.Context, client, name string) (json.RawMessage, error) {
	if !allowSession(client, time.Now()) {
		return nil, errTooManyMessages
	}

	cfg, err := loadRAGConfig()
	if err != nil {
		return nil, err
	}

	name = strings.TrimSpace(name)
	if name == "" {
		name = "Chat"
	}
	name = truncateRunes(name, sessionNameLen)

	body := map[string]string{"name": name}
	resp, _, err := callUpstream(ctx, ragClient, cfg, http.MethodPost, "/v1/sessions", nil, body, "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw json.RawMessage
	if err := decodePayload(resp.Body, &raw); err != nil {
		logger.Log.Printf("ERROR: RAG session create decode failed: %v", err)
		return nil, errUpstreamFailed
	}

	var sess struct {
		SessionID string `json:"session_id"`
	}
	if err := json.Unmarshal(raw, &sess); err != nil || sess.SessionID == "" {
		logger.Log.Printf("ERROR: RAG session create returned no session_id")
		return nil, errUpstreamFailed
	}
	rememberSession(client, sess.SessionID, time.Now())

	return raw, nil
}
func ListSessions(ctx context.Context, client string, kbID string) ([]json.RawMessage, error) {
	cfg, err := loadRAGConfig()
	if err != nil {
		return nil, err
	}

	owned := ownedSessions(client)
	if len(owned) == 0 {
		return []json.RawMessage{}, nil
	}
	query := url.Values{}
	if kbID != "" {
		query.Set("kb_id", kbID)
	}

	resp, _, err := callUpstream(ctx, ragClient, cfg, http.MethodGet, "/v1/sessions", query, nil, "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var all []json.RawMessage
	if err := decodePayload(resp.Body, &all); err != nil {
		logger.Log.Printf("ERROR: RAG session list decode failed: %v", err)
		return nil, errUpstreamFailed
	}

	out := make([]json.RawMessage, 0, len(owned))
	for _, raw := range all {
		var sess struct {
			SessionID string `json:"session_id"`
		}
		if err := json.Unmarshal(raw, &sess); err != nil {
			continue
		}
		if _, ok := owned[sess.SessionID]; ok {
			out = append(out, raw)
		}
	}
	return out, nil
}
func GetSession(ctx context.Context, client, sessionID string) (*dto.SessionHistory, error) {
	if sessionID == "" || !ownsSession(client, sessionID) {
		return nil, errNotFound
	}

	cfg, err := loadRAGConfig()
	if err != nil {
		return nil, err
	}

	path := "/v1/sessions/" + url.PathEscape(sessionID) + "/history"
	resp, _, err := callUpstream(ctx, ragClient, cfg, http.MethodGet, path, nil, nil, "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var msgs []dto.ChatMessage
	if err := decodePayload(resp.Body, &msgs); err != nil {
		logger.Log.Printf("ERROR: RAG session history decode failed: %v", err)
		return nil, errUpstreamFailed
	}
	if msgs == nil {
		msgs = []dto.ChatMessage{}
	}
	return &dto.SessionHistory{Messages: msgs}, nil
}
