package server

import (
	"github.com/gin-gonic/gin"

	"imagine_backend/internal/handler"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	api.GET("/health", handler.Health)
	v1 := r.Group("/v1")
	{
		v1.GET("/kb", handler.ListKB)
		v1.GET("/sessions", handler.ListSessions)
		v1.POST("/sessions", handler.CreateSession)
		v1.GET("/sessions/:sessionID", handler.GetSession)
		v1.POST("/query", handler.Query)
	}
}
