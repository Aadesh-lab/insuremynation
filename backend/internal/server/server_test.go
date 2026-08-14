package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"imagine_backend/internal/logger"
)

// The redirect has one failure mode that matters more than the feature: catching
// /api/health would fail railway.toml's healthcheck and take the service down to fix a
// domain. The rest pins that a page request moves and an API request does not.
func TestCanonicalHost(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger.InitLogger()

	cases := []struct {
		name     string
		canon    string
		host     string
		target   string
		wantCode int
		wantLoc  string
	}{
		{
			name: "unset leaves everything alone",
			host: "insuremynation-production.up.railway.app", target: "/health-insurance",
			wantCode: http.StatusOK,
		},
		{
			name: "page on the wrong host is redirected",
			canon: "insuremynation.imaginebo.app",
			host:  "insuremynation-production.up.railway.app", target: "/health-insurance",
			wantCode: http.StatusFound,
			wantLoc:  "https://insuremynation.imaginebo.app/health-insurance",
		},
		{
			name: "the query string survives, because it carries the ad attribution",
			canon: "insuremynation.imaginebo.app",
			host:  "other.example", target: "/?product=life&utm_source=google",
			wantCode: http.StatusFound,
			wantLoc:  "https://insuremynation.imaginebo.app/?product=life&utm_source=google",
		},
		{
			name: "the canonical host itself is served",
			canon: "insuremynation.imaginebo.app",
			host:  "insuremynation.imaginebo.app", target: "/health-insurance",
			wantCode: http.StatusOK,
		},
		{
			name: "host matching ignores case",
			canon: "insuremynation.imaginebo.app",
			host:  "InsureMyNation.ImagineBo.app", target: "/",
			wantCode: http.StatusOK,
		},
		{
			// If this ever redirects, the deploy fails its healthcheck and rolls back.
			name: "the healthcheck is never redirected",
			canon: "insuremynation.imaginebo.app",
			host:  "insuremynation-production.up.railway.app", target: "/api/health",
			wantCode: http.StatusOK,
		},
		{
			name: "the chat API is never redirected",
			canon: "insuremynation.imaginebo.app",
			host:  "insuremynation-production.up.railway.app", target: "/v1/query",
			wantCode: http.StatusOK,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("CANONICAL_HOST", tc.canon)

			r := gin.New()
			r.Use(canonicalHost())
			r.NoRoute(func(c *gin.Context) { c.String(http.StatusOK, "served") })

			req := httptest.NewRequest(http.MethodGet, tc.target, nil)
			req.Host = tc.host
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tc.wantCode {
				t.Fatalf("status = %d, want %d", w.Code, tc.wantCode)
			}
			if got := w.Header().Get("Location"); got != tc.wantLoc {
				t.Errorf("Location = %q, want %q", got, tc.wantLoc)
			}
		})
	}
}
