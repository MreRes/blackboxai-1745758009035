# WhatsApp Financial Bot API

A RESTful API service for managing personal finances through WhatsApp integration. This service provides endpoints for transaction management, budget tracking, and financial reporting, with a WhatsApp bot interface for easy interaction.

## Features

- 🔐 JWT-based authentication
- 💬 WhatsApp bot integration
- 💰 Transaction management
- 📊 Budget tracking
- 📈 Financial reporting
- 🔄 Automated backups
- 📱 Multi-device support
- 🌐 REST API
- 📚 Swagger documentation

## Tech Stack

- Node.js & Express
- PostgreSQL with Prisma ORM
- Redis for caching
- WhatsApp Web.js for bot integration
- Jest for testing
- Docker for containerization

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6
- Docker & Docker Compose (optional)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd apps/api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
npm run db:init
```

5. Start the development server:
```bash
npm run dev
```

## Docker Setup

1. Build and start containers:
```bash
docker-compose up -d
```

2. Initialize the database:
```bash
docker-compose exec api npm run db:init
```

## Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:coverage    # Coverage report
```

## API Documentation

Access the Swagger documentation at:
- Development: http://localhost:3001/api-docs
- Production: https://your-api-domain/api-docs

## Project Structure

```
apps/api/
├── src/
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── utils/         # Utility functions
│   ├── app.js         # Express app setup
│   └── index.js       # Entry point
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── seed.js        # Database seeder
├── tests/
│   ├── integration/   # Integration tests
│   ├── unit/         # Unit tests
│   └── setup.js      # Test configuration
└── docker/           # Docker configuration
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run db:init` - Initialize database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run backup:create` - Create database backup
- `npm run backup:restore` - Restore database from backup

## WhatsApp Bot Commands

- `catat pengeluaran <amount> untuk <category>` - Record expense
- `catat pemasukan <amount> dari <category>` - Record income
- `laporan keuangan` - View financial summary
- `lihat budget` - View budget status
- `ringkasan transaksi` - View recent transactions

## Contributing

1. Create a feature branch
2. Commit changes
3. Push your branch
4. Create a pull request

Follow the [conventional commits](https://www.conventionalcommits.org/) specification for commit messages.

## Code Quality

- ESLint for linting
- Prettier for code formatting
- Husky for pre-commit hooks
- Jest for testing
- EditorConfig for consistent coding style

## Security

- JWT authentication
- Rate limiting
- Helmet security headers
- Input validation
- Password hashing
- CORS protection

## Deployment

1. Build the Docker image:
```bash
docker build -t whatsapp-financial-bot .
```

2. Push to registry:
```bash
docker push your-registry/whatsapp-financial-bot
```

3. Deploy using Docker Compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

- Health check endpoint: `/health`
- System status: `/api/v1/system/status`
- Logging with Winston
- Error tracking
- Performance monitoring

## Backup & Recovery

- Automated daily backups
- Manual backup creation
- Point-in-time recovery
- Backup verification
- Backup rotation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
