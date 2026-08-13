package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

func RateLimiter(limit int, window time.Duration) gin.HandlerFunc {
	type bucket struct {
		count int
		reset time.Time
	}
	var (
		mu      sync.Mutex
		buckets = map[string]*bucket{}
	)
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		mu.Lock()
		b, ok := buckets[ip]
		if !ok || now.After(b.reset) {
			b = &bucket{reset: now.Add(window)}
			buckets[ip] = b
		}
		b.count++
		over := b.count > limit
		mu.Unlock()

		if over {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}
