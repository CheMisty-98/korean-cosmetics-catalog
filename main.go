package main

import (
	"Online_shop/internal/auth"
	"Online_shop/internal/database"
	"Online_shop/internal/handlers"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"log"
	"net/http"
)

func main() {

	cfg := database.Load()
	db, err := database.ConnectDb(*cfg)
	if err != nil {
		log.Fatal(err)
	} else {
		fmt.Println("DB connected successfully!")
	}

	handler := handlers.Handler{DB: db}

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	http.Handle("/", http.HandlerFunc(handler.HomePage))

	http.Handle("/api/login", http.HandlerFunc(handler.Login))
	http.Handle("/api/verify-token", auth.AuthMiddleware(http.HandlerFunc(handler.VerifyToken)))
	http.Handle("/api/logout", http.HandlerFunc(handler.Logout))

	http.Handle("/api/products", http.HandlerFunc(handler.GetAllProducts))
	http.Handle("/api/products/{id}", http.HandlerFunc(handler.GetProductData))
	http.Handle("/api/products/add", auth.AuthMiddleware(auth.AdminMiddleware(http.HandlerFunc(handler.AddProduct))))
	http.Handle("/api/products/{id}/delete", auth.AuthMiddleware(auth.AdminMiddleware(http.HandlerFunc(handler.DeleteProduct))))
	http.Handle("/api/products/{id}/edit", auth.AuthMiddleware(auth.AdminMiddleware(http.HandlerFunc(handler.EditProduct))))

	http.Handle("/api/brands", http.HandlerFunc(handler.ShowBrandList))
	http.Handle("/api/category", http.HandlerFunc(handler.ShowCategoryList))
	http.Handle("/api/search/", http.HandlerFunc(handler.FindProduct))

	log.Fatal(http.ListenAndServe(":8080", nil))
}
