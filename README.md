
Built by https://www.blackbox.ai

---

```markdown
# Financial WhatsApp Bot

## Project Overview

The Financial WhatsApp Bot is a system designed to manage financial transactions and inquiries through WhatsApp. The bot interacts with users, provides financial advice, and manages data securely, making it an efficient tool for financial management in a conversational environment.

## Installation

To install the Financial WhatsApp Bot, you need to have [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd financial-whatsapp-bot
   ```

2. Build and start the services using Docker Compose:

   ```bash
   docker-compose up --build
   ```

   This command builds the application and starts the services defined in the `docker-compose.yml` file.

## Usage

Once all services are up and running, you can access them as follows:

- API: [http://localhost:3001](http://localhost:3001)
- Frontend: [http://localhost:3000](http://localhost:3000)
- Admin Interface: [http://localhost:3002](http://localhost:3002)

You can start interacting with the bot on WhatsApp once the API is set up and connected to your WhatsApp Business account.

## Features

- **Financial Management**: Manage transactions, budgets, and financial inquiries.
- **Interactive Bot**: Engage users through WhatsApp for a seamless experience.
- **Data Persistence**: Uses PostgreSQL for robust data storage and Redis for caching.
- **Multi-Application Structure**: Modular approach with separate applications for the frontend, API, admin, and bot.

## Dependencies

The project uses the following dependencies:

- **Turbo**: A build system that allows for running script commands across multiple workspaces efficiently.
  
  ```json
  "devDependencies": {
    "turbo": "^1.10.0"
  }
  ```

## Project Structure

The project has a modular structure organized into apps and packages:

```
financial-whatsapp-bot/
├── apps/
│   ├── api/          # The API server
│   ├── frontend/     # The frontend application
│   ├── admin/        # The admin panel
│   └── bot/          # The WhatsApp bot application
├── packages/         # Shared packages and libraries
├── docker-compose.yml # Docker Compose configuration
└── package.json      # Project metadata and scripts
```

Each application has its own Dockerfile for containerization and can be independently developed and deployed.

## License

This project is private and not open for public contributions.
```