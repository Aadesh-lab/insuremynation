package apperror

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Send(c *gin.Context, err error) {
	var ae *AppError
	if errors.As(err, &ae) {
		c.JSON(ae.Code, ae)
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
