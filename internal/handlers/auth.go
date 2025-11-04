package handlers

import (
	"Online_shop/internal/auth"
	"Online_shop/internal/utils"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Nickname string `json:"nickname"`
	Password string `json:"password"`
}

type UserInfo struct {
	ID       int    `json:"id"`
	Nickname string `json:"nickname"`
	Role     string `json:"role"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {

	if r.Method != "POST" {
		utils.WriteError405(w, "Method not allowed")
		return
	}

	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.WriteInvalidJSON(w)
		return
	}

	fmt.Printf("Logging in user: %s\n", req.Nickname)

	var userID int
	var dbPasswordHash, role string
	err = h.DB.QueryRow(
		"SELECT id, password_hash, role FROM users WHERE nickname = ?",
		req.Nickname,
	).Scan(&userID, &dbPasswordHash, &role)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteUserNotFound(w)
		} else {
			utils.WriteDBError(w)
		}
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(dbPasswordHash), []byte(req.Password))
	if err != nil {
		utils.WriteInvalidPassword(w)
		return
	}

	token, err := auth.GenerateJWT(userID, req.Nickname, role)
	if err != nil {
		utils.WriteError500(w, "Error generating token")
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Login successful",
		"token":   token,
		"user": UserInfo{
			ID:       userID,
			Nickname: req.Nickname,
			Role:     role,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) VerifyToken(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("userClaims").(*auth.JWTClaims)
	if !ok {
		utils.WriteError401(w, "Invalid token claims")
		return
	}

	response := map[string]interface{}{
		"success": true,
		"user": UserInfo{
			ID:       claims.UserID,
			Nickname: claims.Username,
			Role:     claims.Role,
		},
		"message": "Token is valid",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"success": true,
		"message": "Logout successful",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
