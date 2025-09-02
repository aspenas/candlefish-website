package middleware

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/microcosm-cc/bluemonday"
)

var (
	validate      = validator.New()
	sanitizer     = bluemonday.UGCPolicy()
	sqlInjectionRegex = regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval|onload|onerror|onclick)`)
	pathTraversalRegex = regexp.MustCompile(`\.\.\/|\.\.\\`)
)

// Request validation structures
type CreateItemRequest struct {
	Name          string  `json:"name" validate:"required,min=1,max=255,no_sql_injection"`
	Category      string  `json:"category" validate:"required,oneof=Furniture 'Art / Decor' Electronics Lighting 'Rug / Carpet' 'Plant (Indoor)' 'Planter (Indoor)' 'Outdoor Planter/Plant' 'Planter Accessory' Other"`
	RoomID        string  `json:"room_id" validate:"required,uuid"`
	Description   string  `json:"description" validate:"max=1000,no_sql_injection"`
	PurchasePrice float64 `json:"purchase_price" validate:"min=0,max=10000000"`
	AskingPrice   float64 `json:"asking_price" validate:"min=0,max=10000000"`
	Quantity      int     `json:"quantity" validate:"min=1,max=1000"`
	IsFixture     bool    `json:"is_fixture"`
	Source        string  `json:"source" validate:"max=100,no_sql_injection"`
	Condition     string  `json:"condition" validate:"max=50,no_sql_injection"`
}

type UpdateItemRequest struct {
	Name          string  `json:"name" validate:"omitempty,min=1,max=255,no_sql_injection"`
	Category      string  `json:"category" validate:"omitempty,oneof=Furniture 'Art / Decor' Electronics Lighting 'Rug / Carpet' 'Plant (Indoor)' 'Planter (Indoor)' 'Outdoor Planter/Plant' 'Planter Accessory' Other"`
	RoomID        string  `json:"room_id" validate:"omitempty,uuid"`
	Description   string  `json:"description" validate:"omitempty,max=1000,no_sql_injection"`
	PurchasePrice float64 `json:"purchase_price" validate:"omitempty,min=0,max=10000000"`
	AskingPrice   float64 `json:"asking_price" validate:"omitempty,min=0,max=10000000"`
	Decision      string  `json:"decision" validate:"omitempty,oneof=Keep Sell Unsure Sold Donated"`
}

type QueryParams struct {
	Page     int    `query:"page" validate:"min=1,max=1000"`
	Limit    int    `query:"limit" validate:"min=1,max=100"`
	Sort     string `query:"sort" validate:"omitempty,oneof=name category price created_at updated_at"`
	Order    string `query:"order" validate:"omitempty,oneof=asc desc"`
	Search   string `query:"search" validate:"omitempty,max=100,no_sql_injection"`
	Category string `query:"category" validate:"omitempty,no_sql_injection"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=8,max=128"`
}

type RegisterRequest struct {
	Email           string `json:"email" validate:"required,email,max=255"`
	Password        string `json:"password" validate:"required,min=8,max=128,strong_password"`
	ConfirmPassword string `json:"confirm_password" validate:"required,eqfield=Password"`
	Name            string `json:"name" validate:"required,min=2,max=100,no_sql_injection"`
}

func init() {
	// Register custom validators
	validate.RegisterValidation("no_sql_injection", validateNoSQLInjection)
	validate.RegisterValidation("strong_password", validateStrongPassword)
	validate.RegisterValidation("safe_filename", validateSafeFilename)
	validate.RegisterValidation("no_path_traversal", validateNoPathTraversal)
}

// ValidateBody validates request body against a struct
func ValidateBody(requestType interface{}) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Parse body into the provided struct
		if err := c.BodyParser(requestType); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
				"code":  "INVALID_BODY",
			})
		}

		// Validate struct
		if err := validate.Struct(requestType); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "Validation failed",
				"code":    "VALIDATION_ERROR",
				"details": formatValidationErrors(err),
			})
		}

		// Store validated data in context
		c.Locals("validated_body", requestType)
		
		return c.Next()
	}
}

// ValidateQuery validates query parameters
func ValidateQuery() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var params QueryParams
		
		// Parse query parameters
		if err := c.QueryParser(&params); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid query parameters",
				"code":  "INVALID_QUERY",
			})
		}

		// Set defaults
		if params.Page == 0 {
			params.Page = 1
		}
		if params.Limit == 0 {
			params.Limit = 20
		}
		if params.Order == "" {
			params.Order = "asc"
		}

		// Validate
		if err := validate.Struct(params); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "Invalid query parameters",
				"code":    "QUERY_VALIDATION_ERROR",
				"details": formatValidationErrors(err),
			})
		}

		// Sanitize search parameter
		if params.Search != "" {
			params.Search = sanitizeSearchInput(params.Search)
		}

		// Store in context
		c.Locals("query_params", params)
		
		return c.Next()
	}
}

// SanitizeInput sanitizes HTML content to prevent XSS
func SanitizeInput() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get body as map
		var body map[string]interface{}
		if err := c.BodyParser(&body); err == nil {
			// Sanitize string fields
			for key, value := range body {
				if str, ok := value.(string); ok {
					body[key] = sanitizer.Sanitize(str)
				}
			}
			c.Locals("sanitized_body", body)
		}
		
		return c.Next()
	}
}

// ValidateUUID ensures parameter is a valid UUID
func ValidateUUID(paramName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		uuid := c.Params(paramName)
		if uuid == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Missing %s parameter", paramName),
				"code":  "MISSING_PARAMETER",
			})
		}

		// Validate UUID format
		uuidRegex := regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)
		if !uuidRegex.MatchString(uuid) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Invalid %s format", paramName),
				"code":  "INVALID_UUID",
			})
		}

		return c.Next()
	}
}

// Custom validators

func validateNoSQLInjection(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	// Check for common SQL injection patterns
	if sqlInjectionRegex.MatchString(value) {
		return false
	}
	// Check for suspicious characters
	suspiciousChars := []string{"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_", "0x"}
	valueLower := strings.ToLower(value)
	for _, char := range suspiciousChars {
		if strings.Contains(valueLower, char) {
			return false
		}
	}
	return true
}

func validateStrongPassword(fl validator.FieldLevel) bool {
	password := fl.Field().String()
	
	// Check minimum length
	if len(password) < 8 {
		return false
	}
	
	// Check for at least one uppercase letter
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	
	// Check for at least one lowercase letter
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	
	// Check for at least one digit
	hasDigit := regexp.MustCompile(`\d`).MatchString(password)
	
	// Check for at least one special character
	hasSpecial := regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`).MatchString(password)
	
	return hasUpper && hasLower && hasDigit && hasSpecial
}

func validateSafeFilename(fl validator.FieldLevel) bool {
	filename := fl.Field().String()
	
	// Check for path traversal attempts
	if pathTraversalRegex.MatchString(filename) {
		return false
	}
	
	// Check for dangerous extensions
	dangerousExtensions := []string{
		".exe", ".bat", ".cmd", ".com", ".pif", ".scr", ".vbs", ".js",
		".jar", ".msi", ".app", ".deb", ".rpm",
	}
	
	filenameLower := strings.ToLower(filename)
	for _, ext := range dangerousExtensions {
		if strings.HasSuffix(filenameLower, ext) {
			return false
		}
	}
	
	// Check for null bytes
	if strings.Contains(filename, "\x00") {
		return false
	}
	
	return true
}

func validateNoPathTraversal(fl validator.FieldLevel) bool {
	path := fl.Field().String()
	return !pathTraversalRegex.MatchString(path) && !strings.Contains(path, "\x00")
}

// Helper functions

func formatValidationErrors(err error) []map[string]string {
	var errors []map[string]string
	
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrors {
			error := map[string]string{
				"field":   e.Field(),
				"tag":     e.Tag(),
				"message": getErrorMessage(e),
			}
			errors = append(errors, error)
		}
	}
	
	return errors
}

func getErrorMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", e.Field())
	case "min":
		return fmt.Sprintf("%s must be at least %s", e.Field(), e.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s", e.Field(), e.Param())
	case "email":
		return fmt.Sprintf("%s must be a valid email address", e.Field())
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", e.Field())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", e.Field(), e.Param())
	case "no_sql_injection":
		return fmt.Sprintf("%s contains invalid characters", e.Field())
	case "strong_password":
		return "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character"
	case "safe_filename":
		return "Filename contains invalid or dangerous characters"
	case "no_path_traversal":
		return "Path contains invalid traversal patterns"
	case "eqfield":
		return fmt.Sprintf("%s must match %s", e.Field(), e.Param())
	default:
		return fmt.Sprintf("%s failed validation", e.Field())
	}
}

func sanitizeSearchInput(input string) string {
	// Remove potentially dangerous characters for search
	// Keep alphanumeric, spaces, and basic punctuation
	safe := regexp.MustCompile(`[^a-zA-Z0-9\s\-_.,!?]`)
	sanitized := safe.ReplaceAllString(input, "")
	
	// Trim and limit length
	sanitized = strings.TrimSpace(sanitized)
	if len(sanitized) > 100 {
		sanitized = sanitized[:100]
	}
	
	return sanitized
}

// ValidateJSON ensures the request body is valid JSON
func ValidateJSON() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Get("Content-Type") != "application/json" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Content-Type must be application/json",
				"code":  "INVALID_CONTENT_TYPE",
			})
		}
		
		// Check if body is valid JSON
		var test interface{}
		if err := c.BodyParser(&test); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid JSON in request body",
				"code":  "INVALID_JSON",
			})
		}
		
		return c.Next()
	}
}