package handlers

import (
	"Online_shop/internal/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type ProductDB struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	AltName     string    `json:"alt_name"`
	Description string    `json:"description"`
	Brand       string    `json:"brand"`
	ImageURL    string    `json:"image_url"`
	Category    string    `json:"category"`
	InStock     bool      `json:"in_stock"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
}

func (h *Handler) AddProduct(w http.ResponseWriter, r *http.Request) {

	var req ProductDB
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.WriteInvalidJSON(w)
		return
	}

	baseName := normalizeProductName(req.Name)
	imageUrl := fmt.Sprintf("static/images/%s", baseName)

	tagsJSON, err := json.Marshal(req.Tags)
	if err != nil {
		utils.WriteError500(w, "Error processing tags")
		return
	}
	result, err := h.DB.Exec("INSERT INTO products (name, alt_name, description, brand, category, image_url, in_stock, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", req.Name, req.AltName, req.Description, req.Brand, req.Category, imageUrl, req.InStock, tagsJSON)
	if err != nil {
		utils.WriteDBError(w)
		return
	}

	product_id, err := result.LastInsertId()
	if err != nil {
		utils.WriteNotFound(w, "Product ID")
	}

	response := map[string]interface{}{
		"product_id": product_id,
		"message":    "New product added successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func normalizeProductName(name string) string {
	reg := regexp.MustCompile(`[^a-zа-яё0-9_-]`)
	result := strings.ToLower(name)
	result = strings.ReplaceAll(result, " ", "_")
	result = strings.ReplaceAll(result, "-", "_")
	result = reg.ReplaceAllString(result, "")

	multipleUnderscores := regexp.MustCompile(`_{2,}`)
	result = multipleUnderscores.ReplaceAllString(result, "_")

	return result
}

func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	product_id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		utils.WriteError400(w, "Invalid product ID")
		return
	}

	var exists bool
	err = h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE id = ?)", product_id).Scan(&exists)
	if err != nil || !exists {
		utils.WriteNotFound(w, "Product")
		return
	}

	_, err = h.DB.Exec("DELETE FROM products WHERE id=?", product_id)
	if err != nil {
		utils.WriteDBError(w)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Product deleted successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

type EditRequest struct {
	Name        string   `json:"name"`
	AltName     string   `json:"alt_name"`
	Description string   `json:"description"`
	Brand       string   `json:"brand"`
	Category    string   `json:"category"`
	InStock     bool     `json:"in_stock"`
	Tags        []string `json:"tags"`
}

func (h *Handler) EditProduct(w http.ResponseWriter, r *http.Request) {
	productID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || productID <= 0 {
		utils.WriteError400(w, "Invalid product ID")
		return
	}

	var req EditRequest
	if err = json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteInvalidJSON(w)
		return
	}

	trx, err := h.DB.Begin()
	if err != nil {
		utils.WriteError500(w, "Failed to start transaction")
		return
	}
	defer trx.Rollback()

	var update []string
	var args []interface{}

	if req.Name != "" {
		update = append(update, "name=?")
		args = append(args, req.Name)

		baseName := normalizeProductName(req.Name)
		imageUrl := fmt.Sprintf("static/images/%s", baseName)
		update = append(update, "image_url=?")
		args = append(args, imageUrl)
	}
	if req.AltName != "" {
		update = append(update, "alt_name=?")
		args = append(args, req.AltName)
	}
	if req.Brand != "" {
		update = append(update, "brand=?")
		args = append(args, req.Brand)
	}
	if req.Category != "" {
		update = append(update, "category=?")
		args = append(args, req.Category)
	}
	if req.Description != "" {
		update = append(update, "description=?")
		args = append(args, req.Description)
	}
	update = append(update, "in_stock=?")
	args = append(args, req.InStock)

	if req.Tags != nil {
		tagsJSON, err := json.Marshal(req.Tags)
		if err != nil {
			utils.WriteError400(w, "Invalid tags format")
			return
		}
		update = append(update, "tags=?")
		args = append(args, tagsJSON)
	}

	if len(update) == 0 {
		utils.WriteError400(w, "No fields to update")
		return
	}

	query := "UPDATE products SET " + strings.Join(update, ",") + " WHERE id = ?"
	args = append(args, productID)

	_, err = trx.Exec(query, args...)
	if err != nil {
		utils.WriteError500(w, "Error updating product")
		return
	}

	err = trx.Commit()
	if err != nil {
		utils.WriteError500(w, "Failed to commit transaction")
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Product data updated successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
