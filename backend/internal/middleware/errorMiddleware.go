package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"imagine_backend/internal/apperror"
	"imagine_backend/internal/logger"
)

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				logger.Log.Printf("panic: %v", r)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			}
		}()
		c.Next()
		if len(c.Errors) > 0 {
			apperror.Send(c, c.Errors.Last().Err)
		}
	}
}
