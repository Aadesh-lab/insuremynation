package server

import (
	"github.com/gin-gonic/gin"

	"imagine_backend/internal/handler"
)

// RegisterRoutes mounts the only API this service has left.
//
// The /v1/* chat proxy is gone: the assistant now calls imagine.bo's orchestrator direct
// from the browser, and that integration carries no API key, so there is nothing for this
// service to hold on its behalf. What remains is the healthcheck railway.toml points at,
// plus the embedded site in serveSPA.
func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	api.GET("/health", handler.Health)
}
