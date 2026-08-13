package config

import "os"

type Config struct {
	Port string
	Env  string
}

var AppConfig Config

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func LoadConfig() {
	AppConfig = Config{
		Port: env("PORT", "8080"),
		Env:  env("ENV", "production"),
	}
}
