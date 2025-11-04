package database

import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql"
)

func ConnectDb(config Config) (*sql.DB, error) {
	dsn := config.DBUsername + ":" + config.DBPassword +
		"@tcp(" + config.DBHost + ":" + config.DBPort + ")/" + config.DBName
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	if err = db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}
