package database

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBUsername string
	DBPassword string
	DBHost     string
	DBPort     string
	DBName     string
	ServerPort string
	JWTSecret  string
}

func Load() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using default values")
	}

	config := &Config{
		DBUsername: getEnv("DB_USERNAME", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBName:     getEnv("DB_NAME", "Online_catalog"),
		ServerPort: getEnv("SERVER_PORT", "8080"),
		JWTSecret:  getEnv("JWT_SECRET", ""),
	}

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
