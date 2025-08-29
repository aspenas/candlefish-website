package resolver

import (
	"fmt"
	"net"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/AlecAivazis/survey/v2"
	"github.com/candlefish-ai/clos/internal/registry"
	"github.com/candlefish-ai/clos/pkg/config"
	"github.com/candlefish-ai/clos/pkg/types"
	"github.com/sirupsen/logrus"
)

// Resolver handles port conflict detection and resolution
type Resolver struct {
	registry *registry.Registry
	config   *config.Config
	logger   *logrus.Logger
}

// New creates a new conflict resolver
func New(reg *registry.Registry, cfg *config.Config) *Resolver {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	
	return &Resolver{
		registry: reg,
		config:   cfg,
		logger:   logger,
	}
}

// DetectConflicts detects port conflicts for a specific service group
func DetectConflicts(reg *registry.Registry, groupName string) ([]*types.PortConflict, error) {
	services, err := reg.ListServicesByGroup(groupName)
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	var conflicts []*types.PortConflict
	for _, service := range services {
		if conflict := checkPortConflict(service.Port, service.Name); conflict != nil {
			conflicts = append(conflicts, conflict)
		}
	}

	return conflicts, nil
}

// DetectAllConflicts detects all port conflicts across all services
func DetectAllConflicts(reg *registry.Registry) ([]*types.PortConflict, error) {
	services, err := reg.ListServices()
	if err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	var conflicts []*types.PortConflict
	portUsage := make(map[int][]string)

	// Group services by port to detect duplicates
	for _, service := range services {
		portUsage[service.Port] = append(portUsage[service.Port], service.Name)
	}

	// Check for port conflicts
	for port, serviceNames := range portUsage {
		if len(serviceNames) > 1 {
			// Multiple services using same port
			conflict := &types.PortConflict{
				Port:     port,
				Services: serviceNames,
			}
			conflicts = append(conflicts, conflict)
		} else if len(serviceNames) == 1 {
			// Check if port is in use by external process
			if conflict := checkPortConflict(port, serviceNames[0]); conflict != nil {
				conflicts = append(conflicts, conflict)
			}
		}
	}

	// Check system ports that might conflict with future allocations
	systemConflicts := checkSystemPortConflicts(reg)
	conflicts = append(conflicts, systemConflicts...)

	return conflicts, nil
}

// ResolveInteractive resolves conflicts interactively with user input
func (r *Resolver) ResolveInteractive(conflicts []*types.PortConflict) error {
	for i, conflict := range conflicts {
		r.logger.Infof("Conflict %d/%d: Port %d", i+1, len(conflicts), conflict.Port)
		
		if len(conflict.Services) > 1 {
			fmt.Printf("Multiple CLOS services using port %d: %s\n", 
				conflict.Port, strings.Join(conflict.Services, ", "))
		}
		
		if conflict.ProcessName != "" {
			fmt.Printf("External process using port %d: %s (PID: %d)\n", 
				conflict.Port, conflict.ProcessName, conflict.PID)
		}

		options := r.getResolutionOptions(conflict)
		
		var choice string
		prompt := &survey.Select{
			Message: "How would you like to resolve this conflict?",
			Options: options,
		}
		
		if err := survey.AskOne(prompt, &choice); err != nil {
			return fmt.Errorf("failed to get user input: %w", err)
		}

		if err := r.executeResolution(conflict, choice); err != nil {
			r.logger.Errorf("Failed to resolve conflict: %v", err)
			continue
		}

		r.logger.Infof("Conflict resolved: %s", choice)
	}

	return nil
}

// getResolutionOptions returns available resolution options for a conflict
func (r *Resolver) getResolutionOptions(conflict *types.PortConflict) []string {
	var options []string

	// Always offer to skip
	options = append(options, "Skip this conflict")

	if len(conflict.Services) > 1 {
		// Multiple CLOS services conflict
		options = append(options, "Reassign ports automatically")
		options = append(options, "Choose which service to reassign")
		options = append(options, "Stop conflicting services")
	}

	if conflict.ProcessName != "" && conflict.PID != 0 {
		// External process conflict
		options = append(options, "Kill the conflicting process")
		options = append(options, "Reassign CLOS service to different port")
	}

	// Always offer manual resolution
	options = append(options, "Manually specify new port")
	options = append(options, "View port usage analysis")

	return options
}

// executeResolution executes the chosen resolution strategy
func (r *Resolver) executeResolution(conflict *types.PortConflict, choice string) error {
	switch choice {
	case "Skip this conflict":
		return nil

	case "Reassign ports automatically":
		return r.reassignPortsAutomatically(conflict)

	case "Choose which service to reassign":
		return r.chooseServiceToReassign(conflict)

	case "Stop conflicting services":
		return r.stopConflictingServices(conflict)

	case "Kill the conflicting process":
		return r.killConflictingProcess(conflict)

	case "Reassign CLOS service to different port":
		return r.reassignServicePort(conflict)

	case "Manually specify new port":
		return r.manuallySpecifyPort(conflict)

	case "View port usage analysis":
		return r.viewPortUsageAnalysis(conflict)

	default:
		return fmt.Errorf("unknown resolution choice: %s", choice)
	}
}

// reassignPortsAutomatically reassigns ports for conflicting services automatically
func (r *Resolver) reassignPortsAutomatically(conflict *types.PortConflict) error {
	for i, serviceName := range conflict.Services {
		if i == 0 {
			// Keep the first service on the original port
			continue
		}

		// Find a new port for this service
		service, err := r.registry.GetService(serviceName)
		if err != nil {
			return fmt.Errorf("failed to get service %s: %w", serviceName, err)
		}

		newPort, err := r.findAlternativePort(service)
		if err != nil {
			return fmt.Errorf("failed to find alternative port for %s: %w", serviceName, err)
		}

		// Update the service with new port
		service.Port = newPort
		if err := r.updateServicePort(service); err != nil {
			return fmt.Errorf("failed to update service port: %w", err)
		}

		r.logger.Infof("Reassigned service %s from port %d to port %d", 
			serviceName, conflict.Port, newPort)
	}

	return nil
}

// chooseServiceToReassign lets user choose which service to reassign
func (r *Resolver) chooseServiceToReassign(conflict *types.PortConflict) error {
	var choice string
	prompt := &survey.Select{
		Message: "Which service should be reassigned to a different port?",
		Options: conflict.Services,
	}
	
	if err := survey.AskOne(prompt, &choice); err != nil {
		return fmt.Errorf("failed to get user choice: %w", err)
	}

	service, err := r.registry.GetService(choice)
	if err != nil {
		return fmt.Errorf("failed to get service %s: %w", choice, err)
	}

	newPort, err := r.findAlternativePort(service)
	if err != nil {
		return fmt.Errorf("failed to find alternative port: %w", err)
	}

	service.Port = newPort
	if err := r.updateServicePort(service); err != nil {
		return fmt.Errorf("failed to update service port: %w", err)
	}

	r.logger.Infof("Reassigned service %s to port %d", choice, newPort)
	return nil
}

// stopConflictingServices stops all conflicting services
func (r *Resolver) stopConflictingServices(conflict *types.PortConflict) error {
	for _, serviceName := range conflict.Services {
		if err := r.registry.UpdateServiceStatus(serviceName, types.StatusStopped); err != nil {
			r.logger.Errorf("Failed to update status for service %s: %v", serviceName, err)
		}
		r.logger.Infof("Stopped service %s", serviceName)
	}
	return nil
}

// killConflictingProcess kills the external process using the port
func (r *Resolver) killConflictingProcess(conflict *types.PortConflict) error {
	if conflict.PID == 0 {
		return fmt.Errorf("no PID available for process")
	}

	// Confirm with user before killing
	var confirm bool
	prompt := &survey.Confirm{
		Message: fmt.Sprintf("Are you sure you want to kill process %s (PID: %d)?", 
			conflict.ProcessName, conflict.PID),
	}
	
	if err := survey.AskOne(prompt, &confirm); err != nil {
		return fmt.Errorf("failed to get confirmation: %w", err)
	}

	if !confirm {
		return nil
	}

	cmd := exec.Command("kill", "-TERM", strconv.Itoa(conflict.PID))
	if err := cmd.Run(); err != nil {
		// Try force kill if graceful kill fails
		cmd = exec.Command("kill", "-KILL", strconv.Itoa(conflict.PID))
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to kill process: %w", err)
		}
	}

	r.logger.Infof("Killed process %s (PID: %d)", conflict.ProcessName, conflict.PID)
	return nil
}

// reassignServicePort reassigns the CLOS service to a different port
func (r *Resolver) reassignServicePort(conflict *types.PortConflict) error {
	if len(conflict.Services) == 0 {
		return fmt.Errorf("no CLOS services in conflict")
	}

	serviceName := conflict.Services[0]
	service, err := r.registry.GetService(serviceName)
	if err != nil {
		return fmt.Errorf("failed to get service: %w", err)
	}

	newPort, err := r.findAlternativePort(service)
	if err != nil {
		return fmt.Errorf("failed to find alternative port: %w", err)
	}

	service.Port = newPort
	if err := r.updateServicePort(service); err != nil {
		return fmt.Errorf("failed to update service port: %w", err)
	}

	r.logger.Infof("Reassigned service %s to port %d", serviceName, newPort)
	return nil
}

// manuallySpecifyPort allows user to manually specify a new port
func (r *Resolver) manuallySpecifyPort(conflict *types.PortConflict) error {
	if len(conflict.Services) == 0 {
		return fmt.Errorf("no CLOS services in conflict")
	}

	serviceName := conflict.Services[0]
	service, err := r.registry.GetService(serviceName)
	if err != nil {
		return fmt.Errorf("failed to get service: %w", err)
	}

	var portStr string
	prompt := &survey.Input{
		Message: fmt.Sprintf("Enter new port for service %s:", serviceName),
		Default: strconv.Itoa(service.Port + 100),
	}
	
	if err := survey.AskOne(prompt, &portStr); err != nil {
		return fmt.Errorf("failed to get port input: %w", err)
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("invalid port number: %s", portStr)
	}

	if port < 1024 || port > 65535 {
		return fmt.Errorf("port must be between 1024 and 65535")
	}

	// Check if port is available
	if isPortInUse(port) {
		return fmt.Errorf("port %d is already in use", port)
	}

	service.Port = port
	if err := r.updateServicePort(service); err != nil {
		return fmt.Errorf("failed to update service port: %w", err)
	}

	r.logger.Infof("Updated service %s to port %d", serviceName, port)
	return nil
}

// viewPortUsageAnalysis shows detailed port usage analysis
func (r *Resolver) viewPortUsageAnalysis(conflict *types.PortConflict) error {
	fmt.Printf("\n=== Port Usage Analysis for Port %d ===\n", conflict.Port)

	// Show CLOS services
	if len(conflict.Services) > 0 {
		fmt.Printf("CLOS Services using this port:\n")
		for _, serviceName := range conflict.Services {
			service, err := r.registry.GetService(serviceName)
			if err == nil {
				fmt.Printf("  - %s (Group: %s, Status: %s)\n", 
					service.Name, service.Group, service.Status)
			}
		}
		fmt.Println()
	}

	// Show external process
	if conflict.ProcessName != "" {
		fmt.Printf("External Process: %s (PID: %d)\n\n", conflict.ProcessName, conflict.PID)
	}

	// Show port range analysis
	for _, portRange := range r.config.PortRanges {
		if conflict.Port >= portRange.StartPort && conflict.Port <= portRange.EndPort {
			usage, _ := r.registry.GetPortUsage()
			for _, u := range usage {
				if u.Project == portRange.Project {
					total := portRange.EndPort - portRange.StartPort + 1
					percentage := float64(u.Usage) / float64(total) * 100
					fmt.Printf("Port Range: %s (%d-%d)\n", 
						portRange.Project, portRange.StartPort, portRange.EndPort)
					fmt.Printf("Usage: %d/%d ports (%.1f%%)\n", u.Usage, total, percentage)
					break
				}
			}
			break
		}
	}

	// Suggest alternative ports
	fmt.Printf("Suggested alternative ports:\n")
	for i := 1; i <= 5; i++ {
		altPort := conflict.Port + (i * 10)
		if !isPortInUse(altPort) {
			fmt.Printf("  - %d (available)\n", altPort)
		}
	}

	return nil
}

// findAlternativePort finds an available port for a service
func (r *Resolver) findAlternativePort(service *types.Service) (int, error) {
	// Find the appropriate port range for this service
	var portRange *config.PortRangeConfig
	for _, pr := range r.config.PortRanges {
		if strings.Contains(service.Group, pr.Project) {
			portRange = &pr
			break
		}
	}

	if portRange == nil {
		// Use default range
		portRange = &config.PortRangeConfig{
			Project:   "default",
			StartPort: 5000,
			EndPort:   5999,
		}
	}

	return r.registry.AllocatePort(portRange.Project, portRange.StartPort, portRange.EndPort)
}

// updateServicePort updates a service's port in the registry
func (r *Resolver) updateServicePort(service *types.Service) error {
	// For now, we'll assume the registry has an update method
	// In a real implementation, this would update the service record
	return fmt.Errorf("updateServicePort not implemented - would update service %s to port %d", 
		service.Name, service.Port)
}

// Helper functions

// checkPortConflict checks if a port has conflicts
func checkPortConflict(port int, serviceName string) *types.PortConflict {
	if !isPortInUse(port) {
		return nil
	}

	pid, processName := getProcessUsingPort(port)
	if pid == 0 {
		return nil
	}

	return &types.PortConflict{
		Port:        port,
		Services:    []string{serviceName},
		ProcessName: processName,
		PID:         pid,
	}
}

// checkSystemPortConflicts checks for system-level port conflicts
func checkSystemPortConflicts(reg *registry.Registry) []*types.PortConflict {
	var conflicts []*types.PortConflict
	
	// Check common system ports that might conflict
	systemPorts := []int{80, 443, 22, 25, 53, 110, 143, 993, 995}
	
	for _, port := range systemPorts {
		if isPortInUse(port) {
			pid, processName := getProcessUsingPort(port)
			if pid != 0 && processName != "" {
				conflicts = append(conflicts, &types.PortConflict{
					Port:        port,
					ProcessName: processName,
					PID:         pid,
					Services:    []string{},
				})
			}
		}
	}

	return conflicts
}

// isPortInUse checks if a port is currently in use
func isPortInUse(port int) bool {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf(":%d", port), time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// getProcessUsingPort returns the PID and process name using a port
func getProcessUsingPort(port int) (int, string) {
	// Try lsof first (macOS/Linux)
	cmd := exec.Command("lsof", "-i", fmt.Sprintf(":%d", port), "-t")
	output, err := cmd.Output()
	if err == nil && len(output) > 0 {
		pidStr := strings.TrimSpace(string(output))
		if pid, err := strconv.Atoi(pidStr); err == nil {
			// Get process name
			cmd = exec.Command("ps", "-p", pidStr, "-o", "comm=")
			if nameOutput, err := cmd.Output(); err == nil {
				processName := strings.TrimSpace(string(nameOutput))
				return pid, processName
			}
			return pid, "unknown"
		}
	}

	return 0, ""
}