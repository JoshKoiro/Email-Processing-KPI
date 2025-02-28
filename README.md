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

## Initial Prompt
(using Claude 3.7)
*I would like you to help me create a program that can take my emails via the Microsoft graph api and look at how many I've received over the course of a day and track it over time. Additionally, I would like the application to also track how many emails are in my inbox at the end of the day (Midnight). I would like this information to be stored as a JSON file that is continuously appended to.*

*Build this application as a node js express server that runs inside a docker container. There should be a web interface that allows the user to view the statistics as a graph (showing how many emails are received over the course of each day, along with another graph that shows how many are left in the inbox at the end of a day.*

*Also make it so that the .env file that contains the graph API key can be dynamically updated without having to restart the docker container.*

*The point of this application is for me to measure the efficiency of processing emails based on changes to how I'm utilizing email management tools. This application is designed to be able to measure the performance of those tools.*

*Please ask any questions if anything in these instructions are ambiguous or doesn't make sense. Think this through step by step and give me high quality code that is readable and understandable.*