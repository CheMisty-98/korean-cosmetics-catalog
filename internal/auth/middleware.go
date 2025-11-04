package auth

import (
	"Online_shop/internal/database"
	"Online_shop/internal/utils"
	"context"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"log"
	"net/http"
	"time"
)

var config *database.Config

func init() {
	config = database.Load()
	if config.JWTSecret == "" {
		log.Fatal("JWT_SECRET is not set in .env file or environment variables")
	}
}

type JWTClaims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := r.Header.Get("Authorization")
		if tokenString == "" {
			utils.WriteError401(w, "Authorization token required")
			return
		}

		if len(tokenString) < 7 || tokenString[:7] != "Bearer " {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		claims, err := ValidateJWT(tokenString)
		if err != nil {
			utils.WriteError401(w, "Invalid token")
			return
		}

		ctx := context.WithValue(r.Context(), "userClaims", claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value("userClaims").(*JWTClaims)
		if !ok || claims.Role != "admin" {
			utils.WriteError403(w, "Admin access required")
			return
		}
		next.ServeHTTP(w, r.WithContext(r.Context()))
	})
}

func GenerateJWT(userID int, username, role string) (string, error) {
	claims := JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "online-catalog",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.JWTSecret))
}

func ValidateJWT(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(config.JWTSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
