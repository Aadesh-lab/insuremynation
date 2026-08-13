package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"imagine_backend/internal/apperror"
	"imagine_backend/internal/dto"
	"imagine_backend/internal/services"
)
const maxRequestBody = 1 << 20.
func limitBody(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxRequestBody)
}

func ListKB(c *gin.Context) {
	kbs, err := services.ListKB(c.Request.Context(), c.ClientIP())
	if err != nil {
		apperror.Send(c, err)
		return
	}
	c.JSON(http.StatusOK, kbs)
}

func ListSessions(c *gin.Context) {
	sessions, err := services.ListSessions(c.Request.Context(), c.ClientIP(), c.Query("kb_id"))
	if err != nil {
		apperror.Send(c, err)
		return
	}
	c.JSON(http.StatusOK, sessions)
}

func CreateSession(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	_ = c.ShouldBindJSON(&req)

	sess, err := services.CreateSession(c.Request.Context(), c.ClientIP(), req.Name)
	if err != nil {
		apperror.Send(c, err)
		return
	}
	c.JSON(http.StatusOK, sess)
}

func GetSession(c *gin.Context) {
	sess, err := services.GetSession(c.Request.Context(), c.ClientIP(), c.Param("sessionID"))
	if err != nil {
		apperror.Send(c, err)
		return
	}
	c.JSON(http.StatusOK, sess)
}

func Query(c *gin.Context) {
	limitBody(c)
	var req dto.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required"})
		return
	}

	if req.Stream {
		queryStream(c, req)
		return
	}

	res, err := services.Query(c.Request.Context(), c.ClientIP(), req)
	if err != nil {
		apperror.Send(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func queryStream(c *gin.Context, req dto.QueryRequest) {
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		apperror.Send(c, apperror.New(http.StatusInternalServerError, "streaming unsupported"))
		return
	}

	body, err := services.QueryStream(c.Request.Context(), c.ClientIP(), req)
	if err != nil {
		apperror.Send(c, err)
		return
	}
	defer body.Close()

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)
	flusher.Flush()

	services.RelaySSE(c.Writer, flusher.Flush, body)
}
