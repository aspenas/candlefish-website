package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

type SecurityDashboardClient struct {
	BaseURL   string
	JWTToken  string
}

type DashboardOverview struct {
	TotalIncidents   int     `json:"totalIncidents"`
	ActiveAlerts     int     `json:"activeAlerts"`
	ComplianceScore float64 `json:"complianceScore"`
}

type Incident struct {
	Type      string `json:"type"`
	Severity  string `json:"severity"`
	Status    string `json:"status"`
}

func NewSecurityDashboardClient(baseURL, jwtToken string) *SecurityDashboardClient {
	return &SecurityDashboardClient{
		BaseURL:  baseURL,
		JWTToken: jwtToken,
	}
}

func (c *SecurityDashboardClient) GetDashboardOverview() (*DashboardOverview, error) {
	req, err := http.NewRequest("GET", c.BaseURL+"/api/dashboard/overview", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+c.JWTToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var overview DashboardOverview
	if err := json.NewDecoder(resp.Body).Decode(&overview); err != nil {
		return nil, err
	}

	return &overview, nil
}

func (c *SecurityDashboardClient) CreateIncident(incident *Incident) (*Incident, error) {
	payload, err := json.Marshal(incident)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", c.BaseURL+"/api/incidents", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+c.JWTToken)
	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var createdIncident Incident
	if err := json.NewDecoder(resp.Body).Decode(&createdIncident); err != nil {
		return nil, err
	}

	return &createdIncident, nil
}

func (c *SecurityDashboardClient) ConnectWebSocket() error {
	wsURL := "wss://" + c.BaseURL[8:] + "/ws"

	header := http.Header{}
	header.Add("Authorization", "Bearer "+c.JWTToken)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		return err
	}
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("WebSocket read error:", err)
			break
		}

		var event map[string]interface{}
		if err := json.Unmarshal(message, &event); err != nil {
			log.Println("Error parsing WebSocket message:", err)
			continue
		}

		c.processEvent(event)
	}

	return nil
}

func (c *SecurityDashboardClient) processEvent(event map[string]interface{}) {
	switch event["event"] {
	case "security.alert.new":
		fmt.Println("New Security Alert:", event["data"])
	case "security.incident.update":
		fmt.Println("Incident Update:", event["data"])
	case "security.threat.detected":
		fmt.Println("Threat Detected:", event["data"])
	}
}

func Login(baseURL, email, password string) (string, error) {
	loginPayload := map[string]string{
		"email":    email,
		"password": password,
	}
	payload, err := json.Marshal(loginPayload)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(baseURL+"/auth/login", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var loginResponse map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&loginResponse); err != nil {
		return "", err
	}

	return loginResponse["token"], nil
}

func main() {
	baseURL := "https://api.candlefish.ai/v1"

	jwtToken, err := Login(baseURL, "user@candlefish.ai", "password")
	if err != nil {
		log.Fatal("Login failed:", err)
	}

	client := NewSecurityDashboardClient(baseURL, jwtToken)

	// Get dashboard overview
	overview, err := client.GetDashboardOverview()
	if err != nil {
		log.Fatal("Failed to get dashboard overview:", err)
	}
	fmt.Printf("Dashboard Overview: %+v\n", overview)

	// Create an incident
	newIncident := &Incident{
		Type:      "network_intrusion",
		Severity:  "high",
		Status:    "open",
	}
	createdIncident, err := client.CreateIncident(newIncident)
	if err != nil {
		log.Fatal("Failed to create incident:", err)
	}
	fmt.Printf("Created Incident: %+v\n", createdIncident)

	// Connect to WebSocket (in a real scenario, you might want to do this in a goroutine)
	go func() {
		if err := client.ConnectWebSocket(); err != nil {
			log.Println("WebSocket connection error:", err)
		}
	}()

	// Keep the main goroutine running
	select {}
}