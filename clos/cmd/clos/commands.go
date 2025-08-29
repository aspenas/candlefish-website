package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"strconv"
	"text/tabwriter"
	"time"

	"github.com/candlefish-ai/clos/internal/docker"
	"github.com/candlefish-ai/clos/internal/registry"
	"github.com/candlefish-ai/clos/internal/resolver"
	"github.com/spf13/cobra"
)

// statusCmd represents the status command
var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show all running services",
	Long:  `Display a comprehensive overview of all services managed by CLOS, including their status, ports, and health information.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		reg, err := registry.New(globalConfig.Database.Path)
		if err != nil {
			return fmt.Errorf("failed to initialize registry: %w", err)
		}
		defer reg.Close()

		services, err := reg.ListServices()
		if err != nil {
			return fmt.Errorf("failed to list services: %w", err)
		}

		if len(services) == 0 {
			fmt.Println("No services registered")
			return nil
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "NAME\tGROUP\tPORT\tSTATUS\tSTARTED\tHEALTH")

		for _, service := range services {
			startedTime := "-"
			if service.StartedAt != nil {
				startedTime = service.StartedAt.Format("15:04:05")
			}

			health := "Unknown"
			if service.HealthURL != "" {
				if isPortOpen(service.Port) {
					health = "Healthy"
				} else {
					health = "Unhealthy"
				}
			}

			fmt.Fprintf(w, "%s\t%s\t%d\t%s\t%s\t%s\n",
				service.Name, service.Group, service.Port, service.Status, startedTime, health)
		}

		return w.Flush()
	},
}

// startCmd represents the start command
var startCmd = &cobra.Command{
	Use:   "start <group>",
	Short: "Start service group",
	Long:  `Start all services in the specified group, handling dependencies and port conflicts automatically.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		groupName := args[0]

		reg, err := registry.New(globalConfig.Database.Path)
		if err != nil {
			return fmt.Errorf("failed to initialize registry: %w", err)
		}
		defer reg.Close()

		dockerMgr := docker.New(globalConfig.Docker)

		fmt.Printf("Starting service group: %s\n", groupName)

		// Check for conflicts first
		conflicts, err := resolver.DetectConflicts(reg, groupName)
		if err != nil {
			return fmt.Errorf("failed to detect conflicts: %w", err)
		}

		if len(conflicts) > 0 {
			fmt.Printf("Detected %d port conflicts. Run 'clos resolve' to fix them.\n", len(conflicts))
			return nil
		}

		if err := dockerMgr.StartGroup(groupName); err != nil {
			return fmt.Errorf("failed to start group: %w", err)
		}

		fmt.Printf("Service group '%s' started successfully\n", groupName)
		return nil
	},
}

// stopCmd represents the stop command
var stopCmd = &cobra.Command{
	Use:   "stop <group>",
	Short: "Stop service group",
	Long:  `Stop all services in the specified group gracefully.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		groupName := args[0]

		dockerMgr := docker.New(globalConfig.Docker)

		fmt.Printf("Stopping service group: %s\n", groupName)

		if err := dockerMgr.StopGroup(groupName); err != nil {
			return fmt.Errorf("failed to stop group: %w", err)
		}

		fmt.Printf("Service group '%s' stopped successfully\n", groupName)
		return nil
	},
}

// checkCmd represents the check command
var checkCmd = &cobra.Command{
	Use:   "check <port>",
	Short: "Check port usage",
	Long:  `Check if a specific port is in use and show which process is using it.`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		portStr := args[0]
		port, err := strconv.Atoi(portStr)
		if err != nil {
			return fmt.Errorf("invalid port number: %s", portStr)
		}

		if isPortOpen(port) {
			fmt.Printf("Port %d is OPEN\n", port)

			// Try to find the process using the port
			if pid, processName := getProcessUsingPort(port); pid != 0 {
				fmt.Printf("Process: %s (PID: %d)\n", processName, pid)
			}
		} else {
			fmt.Printf("Port %d is CLOSED or not in use\n", port)
		}

		// Check if it's registered in CLOS
		reg, err := registry.New(globalConfig.Database.Path)
		if err != nil {
			return fmt.Errorf("failed to initialize registry: %w", err)
		}
		defer reg.Close()

		service, err := reg.GetServiceByPort(port)
		if err == nil && service != nil {
			fmt.Printf("CLOS Service: %s (Group: %s, Status: %s)\n", 
				service.Name, service.Group, service.Status)
		}

		return nil
	},
}

// resolveCmd represents the resolve command
var resolveCmd = &cobra.Command{
	Use:   "resolve",
	Short: "Interactive conflict resolver",
	Long:  `Detect and resolve port conflicts interactively, providing suggestions and automated resolution options.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		reg, err := registry.New(globalConfig.Database.Path)
		if err != nil {
			return fmt.Errorf("failed to initialize registry: %w", err)
		}
		defer reg.Close()

		conflicts, err := resolver.DetectAllConflicts(reg)
		if err != nil {
			return fmt.Errorf("failed to detect conflicts: %w", err)
		}

		if len(conflicts) == 0 {
			fmt.Println("No conflicts detected")
			return nil
		}

		fmt.Printf("Detected %d conflicts:\n\n", len(conflicts))

		resolverInstance := resolver.New(reg, globalConfig)
		return resolverInstance.ResolveInteractive(conflicts)
	},
}

// dashboardCmd represents the dashboard command
var dashboardCmd = &cobra.Command{
	Use:   "dashboard",
	Short: "Start web dashboard",
	Long:  `Start the CLOS web dashboard for visual management of services and real-time monitoring.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Printf("Starting CLOS dashboard on %s:%d\n", 
			globalConfig.Dashboard.Host, globalConfig.Dashboard.Port)

		// This would start a web server - for now just a placeholder
		fmt.Println("Dashboard server would start here...")
		fmt.Printf("Visit http://%s:%d to access the dashboard\n",
			globalConfig.Dashboard.Host, globalConfig.Dashboard.Port)

		// Keep the command running
		select {}
	},
}

// initCmd represents the init command
var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize CLOS system",
	Long:  `Initialize the CLOS system by creating necessary directories, database, and default configuration.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("Initializing CLOS system...")

		// Initialize database
		reg, err := registry.New(globalConfig.Database.Path)
		if err != nil {
			return fmt.Errorf("failed to initialize registry: %w", err)
		}
		defer reg.Close()

		fmt.Printf("✓ Database initialized at: %s\n", globalConfig.Database.Path)

		// Create necessary directories
		dirs := []string{
			globalConfig.Docker.TemplatesDir,
			globalConfig.Docker.ComposeFilesDir,
		}

		for _, dir := range dirs {
			if err := os.MkdirAll(dir, 0755); err != nil {
				return fmt.Errorf("failed to create directory %s: %w", dir, err)
			}
			fmt.Printf("✓ Directory created: %s\n", dir)
		}

		fmt.Println("CLOS system initialized successfully!")
		return nil
	},
}

// configCmd represents the config command
var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Show current configuration",
	Long:  `Display the current CLOS configuration including port ranges, service groups, and system settings.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Printf("Configuration file: %s\n\n", cfgFile)

		fmt.Println("Port Ranges:")
		for _, pr := range globalConfig.PortRanges {
			fmt.Printf("  %s: %d-%d\n", pr.Project, pr.StartPort, pr.EndPort)
		}

		fmt.Printf("\nDatabase: %s\n", globalConfig.Database.Path)
		fmt.Printf("Docker Host: %s\n", globalConfig.Docker.Host)
		fmt.Printf("Dashboard: %s:%d\n", globalConfig.Dashboard.Host, globalConfig.Dashboard.Port)

		return nil
	},
}

// logsCmd represents the logs command
var logsCmd = &cobra.Command{
	Use:   "logs [service]",
	Short: "Show service logs",
	Long:  `Show logs for a specific service or all services if no service is specified.`,
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		serviceName := ""
		if len(args) > 0 {
			serviceName = args[0]
		}

		dockerMgr := docker.New(globalConfig.Docker)
		return dockerMgr.ShowLogs(serviceName)
	},
}

// Helper functions

func isPortOpen(port int) bool {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf(":%d", port), time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func getProcessUsingPort(port int) (int, string) {
	// Try lsof first (macOS/Linux)
	cmd := exec.Command("lsof", "-i", fmt.Sprintf(":%d", port), "-t")
	output, err := cmd.Output()
	if err == nil && len(output) > 0 {
		pidStr := string(output[:len(output)-1]) // Remove trailing newline
		if pid, err := strconv.Atoi(pidStr); err == nil {
			// Get process name
			cmd = exec.Command("ps", "-p", pidStr, "-o", "comm=")
			if nameOutput, err := cmd.Output(); err == nil {
				processName := string(nameOutput[:len(nameOutput)-1])
				return pid, processName
			}
			return pid, "unknown"
		}
	}

	return 0, ""
}