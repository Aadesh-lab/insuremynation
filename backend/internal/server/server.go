package server

import (
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"imagine_backend/config"
	"imagine_backend/internal"
	"imagine_backend/internal/logger"
	"imagine_backend/internal/middleware"
)

func StartServer() {
	config.LoadConfig()
	logger.InitLogger()

	if config.AppConfig.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	if err := r.SetTrustedProxies(nil); err != nil {
		logger.Log.Fatalf("failed to disable proxy trust: %v", err)
	}
	if h := os.Getenv("CLIENT_IP_HEADER"); h != "" {
		r.TrustedPlatform = h
		logger.Log.Printf("client IP taken from the %s header", h)
	} else {
		logger.Log.Printf(
			"WARN: CLIENT_IP_HEADER is unset — the per-visitor cap will key on the socket peer, " +
				"which behind a proxy is the proxy itself")
	}

	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.IPLogging())
	r.Use(middleware.RateLimiter(120, time.Minute))
	r.Use(middleware.ErrorHandler())

	RegisterRoutes(r)
	serveSPA(r)

	addr := ":" + config.AppConfig.Port
	logger.Log.Printf("listening on %s (env=%s)", addr, config.AppConfig.Env)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		logger.Log.Fatalf("server error: %v", err)
	}
}
func serveSPA(r *gin.Engine) {
	dist := internal.Dist()
	fileServer := http.FileServer(http.FS(dist))

	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api/") || strings.HasPrefix(p, "/v1/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		if rel := strings.TrimPrefix(p, "/"); rel != "" {
			if f, err := dist.Open(rel); err == nil {
				f.Close()
				if strings.HasPrefix(p, "/assets/") && hashedAsset(rel) {
					c.Header("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					c.Header("Cache-Control", "public, max-age=86400")
				}
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}
		c.Header("Cache-Control", "no-cache, must-revalidate")
		c.Request.URL.Path = "/"
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
}

var viteHash = regexp.MustCompile(`-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$`)

func hashedAsset(rel string) bool { return viteHash.MatchString(rel) }
