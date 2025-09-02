package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	AccessTokenDuration  = 15 * time.Minute
	RefreshTokenDuration = 7 * 24 * time.Hour
	TokenIssuer          = "highline-inventory"
)

// Claims represents the JWT claims structure
type Claims struct {
	UserID   string   `json:"user_id"`
	Email    string   `json:"email"`
	Username string   `json:"username"`
	Roles    []string `json:"roles"`
	Type     string   `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// RefreshTokenData stores refresh token information
type RefreshTokenData struct {
	Token     string    `json:"token"`
	UserID    string    `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	Revoked   bool      `json:"revoked"`
}

// JWTManager handles JWT operations
type JWTManager struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	issuer     string
}

// NewJWTManager creates a new JWT manager with RSA keys
func NewJWTManager() (*JWTManager, error) {
	// Try to load keys from environment first
	privateKeyStr := os.Getenv("JWT_PRIVATE_KEY")
	publicKeyStr := os.Getenv("JWT_PUBLIC_KEY")

	// If not in environment, try to load from AWS Secrets Manager
	if privateKeyStr == "" || publicKeyStr == "" {
		if os.Getenv("AWS_REGION") != "" || os.Getenv("ENV") == "production" {
			var err error
			privateKeyStr, publicKeyStr, err = loadKeysFromAWS()
			if err != nil {
				fmt.Printf("Failed to load keys from AWS: %v\n", err)
				// Fall back to generation for development
				if os.Getenv("ENV") != "production" {
					privateKeyStr = ""
					publicKeyStr = ""
				} else {
					return nil, fmt.Errorf("failed to load production keys: %v", err)
				}
			}
		}
	}

	var privateKey *rsa.PrivateKey
	var publicKey *rsa.PublicKey

	if privateKeyStr != "" && publicKeyStr != "" {
		// Parse keys from environment or AWS
		privBlock, _ := pem.Decode([]byte(privateKeyStr))
		if privBlock == nil {
			return nil, errors.New("failed to parse private key PEM block")
		}

		var err error
		privateKey, err = x509.ParsePKCS1PrivateKey(privBlock.Bytes)
		if err != nil {
			// Try PKCS8 format
			privInterface, err := x509.ParsePKCS8PrivateKey(privBlock.Bytes)
			if err != nil {
				return nil, fmt.Errorf("failed to parse private key: %v", err)
			}
			var ok bool
			privateKey, ok = privInterface.(*rsa.PrivateKey)
			if !ok {
				return nil, errors.New("private key is not RSA")
			}
		}

		pubBlock, _ := pem.Decode([]byte(publicKeyStr))
		if pubBlock == nil {
			return nil, errors.New("failed to parse public key PEM block")
		}

		pubInterface, err := x509.ParsePKIXPublicKey(pubBlock.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse public key: %v", err)
		}

		var ok bool
		publicKey, ok = pubInterface.(*rsa.PublicKey)
		if !ok {
			return nil, errors.New("public key is not RSA")
		}
	} else {
		// Generate new keys if not provided (development only)
		if os.Getenv("ENV") == "production" {
			return nil, errors.New("production environment requires JWT keys from AWS Secrets Manager")
		}
		
		var err error
		privateKey, publicKey, err = generateRSAKeyPair()
		if err != nil {
			return nil, fmt.Errorf("failed to generate RSA key pair: %v", err)
		}
		
		fmt.Println("WARNING: Using generated RSA keys. Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY for production.")
	}

	return &JWTManager{
		privateKey: privateKey,
		publicKey:  publicKey,
		issuer:     TokenIssuer,
	}, nil
}

// loadKeysFromAWS loads JWT keys from AWS Secrets Manager
func loadKeysFromAWS() (string, string, error) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String("us-east-1"), // Default to us-east-1
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to create AWS session: %v", err)
	}

	svc := secretsmanager.New(sess)

	// Load private key
	privateKeyResult, err := svc.GetSecretValue(&secretsmanager.GetSecretValueInput{
		SecretId: aws.String("highline-inventory/jwt-private-key"),
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to get private key from AWS: %v", err)
	}

	// Load public key
	publicKeyResult, err := svc.GetSecretValue(&secretsmanager.GetSecretValueInput{
		SecretId: aws.String("highline-inventory/jwt-public-key"),
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to get public key from AWS: %v", err)
	}

	privateKeyStr := *privateKeyResult.SecretString
	publicKeyStr := *publicKeyResult.SecretString

	return privateKeyStr, publicKeyStr, nil
}

// generateRSAKeyPair generates a new RSA key pair
func generateRSAKeyPair() (*rsa.PrivateKey, *rsa.PublicKey, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}
	return privateKey, &privateKey.PublicKey, nil
}

// GenerateAccessToken creates a new access token
func (m *JWTManager) GenerateAccessToken(userID, email, username string, roles []string) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID:   userID,
		Email:    email,
		Username: username,
		Roles:    roles,
		Type:     "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        generateTokenID(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(m.privateKey)
}

// GenerateRefreshToken creates a new refresh token
func (m *JWTManager) GenerateRefreshToken(userID string) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID: userID,
		Type:   "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(RefreshTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        generateTokenID(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(m.privateKey)
}

// ValidateToken validates and parses a JWT token
func (m *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	// Additional validation
	if claims.Issuer != m.issuer {
		return nil, errors.New("invalid issuer")
	}

	return claims, nil
}

// GetPublicKeyPEM returns the public key in PEM format for JWKS
func (m *JWTManager) GetPublicKeyPEM() (string, error) {
	pubKeyBytes, err := x509.MarshalPKIXPublicKey(m.publicKey)
	if err != nil {
		return "", err
	}

	pemBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	}

	return string(pem.EncodeToMemory(pemBlock)), nil
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares a password with its hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// generateTokenID generates a unique token ID
func generateTokenID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// ExtractTokenFromBearer extracts token from "Bearer <token>" format
func ExtractTokenFromBearer(authHeader string) (string, error) {
	if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
		return "", errors.New("invalid authorization header format")
	}
	return authHeader[7:], nil
}