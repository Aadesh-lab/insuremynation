package middleware

import (
	"github.com/gin-gonic/gin"

	"imagine_backend/internal/logger"
)

func IPLogging() gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Log.Printf("%s %s %s", c.ClientIP(), c.Request.Method, c.Request.URL.Path)
		c.Next()
	}
}
