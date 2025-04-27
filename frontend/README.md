# WhatsApp Financial Bot Frontend

This is the dedicated frontend project for the WhatsApp Financial Management Bot system.

## Overview

- Separate repository from backend API
- Built with React and Tailwind CSS
- Includes User Portal and Admin Portal
- Responsive, accessible, and modern UI
- Integrates with backend RESTful API and chatbot services
- Implements security best practices including HTTPS, 2FA, RBAC, and input validation
- Features dark mode, charts, search/filter, and onboarding

## Project Structure

```
frontend/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (User and Admin)
│   ├── services/       # API service clients
│   ├── hooks/          # Custom React hooks
│   ├── context/        # React context providers
│   ├── styles/         # Tailwind CSS and global styles
│   ├── utils/          # Utility functions
│   ├── App.js          # Main app component
│   └── index.js        # Entry point
├── tests/              # Frontend tests
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── package.json        # Project dependencies and scripts
└── README.md           # This file
```

## Getting Started

1. Clone the repository:
```bash
git clone <frontend-repo-url>
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with API base URL and other settings
```

4. Run the development server:
```bash
npm start
```

5. Build for production:
```bash
npm run build
```

## Features

- User authentication with username and activation code
- Admin authentication with username and password
- User dashboard with financial summary and key metrics
- Transaction management with add, edit, delete, and filters
- Budget management with analytics and alerts
- Financial reports with charts and export options
- Chatbot interface for natural interaction
- Admin user management and system settings
- WhatsApp session management with QR code login
- Role-based access control and audit logs
- Dark mode and responsive design

## Security

- HTTPS enforced
- Two-factor authentication (2FA)
- Strong password policies
- Input validation and sanitization
- Content Security Policy (CSP)
- Encryption of sensitive data
- Session timeout and automatic logout
- Audit logging and monitoring

## Technologies

- React
- Tailwind CSS
- React Router
- Axios
- Chart.js or Recharts
- React Hook Form
- React Query or SWR
- JWT Authentication
- ESLint and Prettier
- Jest and React Testing Library

## Contributing

Please follow the contribution guidelines in the repository.

## License

MIT License
