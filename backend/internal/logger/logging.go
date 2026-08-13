package logger

import (
	"log"
	"os"
)

var Log = log.New(os.Stdout, "[imagine] ", log.LstdFlags)

func InitLogger() {
	Log = log.New(os.Stdout, "[imagine] ", log.LstdFlags)
}
