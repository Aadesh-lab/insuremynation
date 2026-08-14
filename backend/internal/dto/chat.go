package dto

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type QueryRequest struct {
	Message   string        `json:"message"`
	History   []ChatMessage `json:"history"`
	SessionID string        `json:"session_id"`
	Stream    bool          `json:"stream"`
	// Product is which insurance page the visitor is on: an id only, never prompt
	// text. It is used solely as a key into productPrompts, so an unrecognised value
	// is ignored rather than trusted. See services.buildSystemPrompt.
	Product string `json:"product"`
}

type Source struct {
	FileName string  `json:"file_name"`
	Score    float64 `json:"score"`
}

type QueryResponse struct {
	Answer  string   `json:"answer"`
	Sources []Source `json:"sources"`
}

type SessionHistory struct {
	Messages []ChatMessage `json:"messages"`
}
