package middleware

import "github.com/gofiber/fiber/v2"

func VerifyNANDA(c *fiber.Ctx) error {
	// Placeholder for NANDA webhook verification
	return c.Next()
}

func VerifyN8N(c *fiber.Ctx) error {
	// Placeholder for n8n webhook verification
	return c.Next()
}