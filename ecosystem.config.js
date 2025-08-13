module.exports = {
  apps: [
    {
      name: "roblox-npc-api",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Configurações de restart
      watch: false,
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,

      // Logs
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Monitoramento
      merge_logs: true,
      time: true,
    },
  ],
};
