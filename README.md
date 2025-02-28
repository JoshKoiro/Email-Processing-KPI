# Email-Processing-KPI
A Node.js application that tracks email metrics using the Microsoft Graph API to help measure email management efficiency.

## Features

- **Email Tracking**: Records daily received email count
- **Inbox Monitoring**: Tracks inbox count at midnight
- **Visualization**: Interactive web dashboard with charts
- **Persistence**: Stores data in a JSON file
- **Containerization**: Runs in a Docker container
- **Hot Configuration**: Supports dynamic updating of API credentials

## Prerequisites

- Docker and Docker Compose
- Microsoft Graph API credentials:
  - Tenant ID
  - Client ID
  - Client Secret

## Setup Instructions

### 1. Clone this repository

```bash
git clone https://github.com/your-username/email-tracker.git
cd email-tracker
```

### 2. Register an application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations
3. Create a new registration
4. Grant permissions to Microsoft Graph API (Mail.Read)
5. Create a client secret

### 3. Configure environment variables

Copy the example environment file and update it with your Microsoft Graph API credentials:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual credentials:

```
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
PORT=3000
```

### 4. Build and start the Docker container

```bash
docker-compose up -d
```

### 5. Access the dashboard

Open your browser and visit:

```
http://localhost:3000
```

## Data Storage

Email metrics are stored in a JSON file at `./data/email-stats.json`. This file is persisted using a Docker volume, so data will be preserved even if the container is restarted.

## Dynamic Configuration

You can update the `.env` file at any time without restarting the container. The application will automatically detect changes and reload the configuration.

## How It Works

- Hourly job: Counts emails received today and updates the stats
- Midnight job: Records the current inbox count for the day
- Web interface: Displays charts and calculates efficiency metrics

## Customization

You can modify the scheduled job timing by editing the cron expressions in `src/services/scheduler.js`.

## Troubleshooting

- Check the container logs: `docker-compose logs`
- Verify your Microsoft Graph API credentials
- Ensure the application has proper permissions to access the mailbox

## License

MIT