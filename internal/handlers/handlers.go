package handlers

import (
	"Online_shop/internal/utils"
	"database/sql"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
)

type Handler struct {
	DB *sql.DB
}

func (h *Handler) HomePage(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		log.Println(err)
		utils.WriteError500(w, err.Error())
		return
	}
	err = tmpl.Execute(w, nil)
}

func (h *Handler) GetAllProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query("SELECT id, name, alt_name, description, brand, image_url, category, in_stock, COALESCE(tags, '[]') as tags FROM products")
	if err != nil {
		utils.WriteDBError(w)
		return
	}

	defer rows.Close()

	var productsList []ProductDB
	for rows.Next() {
		var product ProductDB
		var tagsJSON string
		err = rows.Scan(&product.ID, &product.Name, &product.AltName, &product.Description, &product.Brand, &product.ImageURL, &product.Category, &product.InStock, &tagsJSON)
		if err != nil {
			utils.WriteDBError(w)
			return
		}
		json.Unmarshal([]byte(tagsJSON), &product.Tags)
		productsList = append(productsList, product)
	}
	if err = rows.Err(); err != nil {
		utils.WriteError500(w, "Error processing data")
		_ = fmt.Errorf("error processing data: %w", err)
		return
	}

	response := map[string]interface{}{
		"productList": productsList,
		"message":     "All products got successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetProductData(w http.ResponseWriter, r *http.Request) {
	product_id, err := strconv.Atoi(r.PathValue("id"))
	fmt.Printf("Getting product with ID: %d\n", product_id)

	if err != nil {
		utils.WriteError400(w, "Invalid product ID")
		return
	}

	var product ProductDB
	var tagsJSON string
	err = h.DB.QueryRow("SELECT id, name, alt_name, description, brand, image_url, category, in_stock, COALESCE(tags, '[]') as tags FROM products WHERE id = ?", product_id).Scan(&product.Name, &product.AltName, &product.Description, &product.Brand, &product.ImageURL, &product.Category, &product.InStock, &tagsJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.WriteNotFound(w, "Product")
		} else {
			utils.WriteDBError(w)
		}
		return
	}
	json.Unmarshal([]byte(tagsJSON), &product.Tags)

	response := map[string]interface{}{
		"productList": product,
		"message":     fmt.Sprintf("%d product got successfully", product_id),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

var brandList = []string{
	"ABIB",
	"ANUA",
	"AXIS-Y",
	"Beauty of Joseon",
	"BY WISHTREND",
	"Celimax",
	"C-K-D",
	"COSRX",
	"Dr. Althea",
	"Dr. Ceuracle",
	"I'm from",
	"Innisfree",
	"IsNtree",
	"JMsolution",
	"Lagom",
	"Ma:nyo",
	"Mary&May",
	"Medicube",
	"MEDIPEEL",
	"numbuzin",
	"Round lab",
	"SKIN1004",
	"SKIN&LAB",
	"SOME BY MI",
	"TOCOBO",
	"VT Cosmetics",
}

func (h *Handler) ShowBrandList(w http.ResponseWriter, r *http.Request) {

	response := map[string]interface{}{
		"brandList": brandList,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

var categoryList = []string{
	"Гидрофильные масла",
	"Гидрофильные щербеты",
	"Пенка для умывания",
	"Маска",
	"СПФ",
	"Набор",
	"Патчи",
	"Пэды",
	"Тоник",
	"Тонер",
	"Эмульсии",
	"Крем для лица",
	"Крем для шеи",
	"Крем для век",
	"Крем для глаз",
	"Сыворотки и ампулы",
	"Эссенции",
}

func (h *Handler) ShowCategoryList(w http.ResponseWriter, r *http.Request) {

	response := map[string]interface{}{
		"categoryList": categoryList,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) FindProduct(w http.ResponseWriter, r *http.Request) {
	inputRequest := r.URL.Query().Get("q")

	rows, err := h.DB.Query("SELECT id, name, alt_name, description, brand, image_url, category, in_stock, tags FROM products")
	if err != nil {
		utils.WriteDBError(w)
		return
	}
	defer rows.Close()

	var searchProductList []ProductDB
	for rows.Next() {
		var product ProductDB
		var tagsJSON string
		err = rows.Scan(&product.ID, &product.Name, &product.AltName, &product.Description, &product.Brand, &product.ImageURL, &product.Category, &product.InStock, &tagsJSON)
		if err != nil {
			utils.WriteDBError(w)
			return
		}
		err = json.Unmarshal([]byte(tagsJSON), &product.Tags)
		if err != nil {
			utils.WriteInvalidJSON(w)
			return
		}

		searchTerm := strings.ToLower(inputRequest)
		name := strings.ToLower(product.Name)
		altName := strings.ToLower(product.AltName)
		brand := strings.ToLower(product.Brand)
		category := strings.ToLower(product.Category)

		tags := strings.ToLower(strings.Join(product.Tags, ","))

		if strings.Contains(name, searchTerm) ||
			strings.Contains(altName, searchTerm) ||
			strings.Contains(brand, searchTerm) ||
			strings.Contains(category, searchTerm) ||
			strings.Contains(tags, searchTerm) {
			searchProductList = append(searchProductList, product)
		}
	}

	if err = rows.Err(); err != nil {
		utils.WriteDBError(w)
		return
	}

	response := map[string]interface{}{
		"productList": searchProductList,
		"message":     "All products found successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
