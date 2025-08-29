package securitydashboard

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

type ListOptions struct {
	Page       int
	PageSize   int
	Severity   []string
	FilterJSON string
}

func NewClient(apiKey string) *Client {
	baseURL := os.Getenv("SECURITY_DASHBOARD_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.security-dashboard.io/v1"
	}

	return &Client{
		BaseURL: baseURL,
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) makeRequest(method, path string, body interface{}) (*http.Response, error) {
	fullURL := fmt.Sprintf("%s%s", c.BaseURL, path)
	var reqBody io.Reader

	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %v", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, fullURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))
	req.Header.Set("Content-Type", "application/json")

	return c.HTTPClient.Do(req)
}

func (c *Client) Login(email, password string) (map[string]interface{}, error) {
	body := map[string]string{
		"email":    email,
		"password": password,
	}

	resp, err := c.makeRequest("POST", "/auth/login", body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return result, nil
}

func (c *Client) ListAssets(opts ListOptions) (map[string]interface{}, error) {
	params := url.Values{}
	params.Add("page", fmt.Sprintf("%d", opts.Page))
	params.Add("pageSize", fmt.Sprintf("%d", opts.PageSize))
	
	if opts.FilterJSON != "" {
		params.Add("filter", opts.FilterJSON)
	}

	resp, err := c.makeRequest("GET", fmt.Sprintf("/assets?%s", params.Encode()), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return result, nil
}

func (c *Client) ListAlerts(opts ListOptions) (map[string]interface{}, error) {
	params := url.Values{}
	params.Add("page", fmt.Sprintf("%d", opts.Page))
	params.Add("pageSize", fmt.Sprintf("%d", opts.PageSize))
	
	for _, severity := range opts.Severity {
		params.Add("severity", severity)
	}

	resp, err := c.makeRequest("GET", fmt.Sprintf("/alerts?%s", params.Encode()), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return result, nil
}

func (c *Client) ListVulnerabilities(opts ListOptions) (map[string]interface{}, error) {
	params := url.Values{}
	params.Add("page", fmt.Sprintf("%d", opts.Page))
	params.Add("pageSize", fmt.Sprintf("%d", opts.PageSize))
	
	for _, severity := range opts.Severity {
		params.Add("severity", severity)
	}

	resp, err := c.makeRequest("GET", fmt.Sprintf("/vulnerabilities?%s", params.Encode()), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return result, nil
}

func (c *Client) AcknowledgeAlert(alertID, comment string) (map[string]interface{}, error) {
	body := map[string]string{
		"alertId":  alertID,
		"comment": comment,
	}

	resp, err := c.makeRequest("POST", "/alerts/acknowledge", body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return result, nil
}