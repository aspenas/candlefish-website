package main

import (
	"fmt"
	"os"

	"github.com/candlefish-ai/clos/internal/logger"
	"github.com/candlefish-ai/clos/pkg/config"
	"github.com/spf13/cobra"
)

var (
	cfgFile    string
	verbose    bool
	configPath string
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "clos",
	Short: "Candlefish Localhost Orchestration System",
	Long: `CLOS (Candlefish Localhost Orchestration System) is a comprehensive 
orchestrator for managing local development services across multiple projects.

It provides intelligent port management, service discovery, conflict resolution,
and a unified dashboard for monitoring all your local development environments.`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// Initialize logger
		if err := logger.Initialize(verbose); err != nil {
			fmt.Printf("Failed to initialize logger: %v\n", err)
			os.Exit(1)
		}
	},
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.clos/config.yaml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")

	// Add subcommands
	rootCmd.AddCommand(statusCmd)
	rootCmd.AddCommand(startCmd)
	rootCmd.AddCommand(stopCmd)
	rootCmd.AddCommand(checkCmd)
	rootCmd.AddCommand(resolveCmd)
	rootCmd.AddCommand(dashboardCmd)
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(configCmd)
	rootCmd.AddCommand(logsCmd)
}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	cfg, err := config.LoadConfig(cfgFile)
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		os.Exit(1)
	}

	// Store config globally for use by commands
	globalConfig = cfg
}

// Global config instance
var globalConfig *config.Config

func main() {
	Execute()
}