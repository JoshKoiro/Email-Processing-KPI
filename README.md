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
- Microsoft Graph API access token with Mail.Read permissions

## Setup Instructions

### 1. Clone this repository

```bash
git clone https://github.com/your-username/email-tracker.git
cd email-tracker
```

### 2. Get a Microsoft Graph API Access Token

You'll need an access token with Mail.Read permissions for your Microsoft account. There are several ways to obtain this:

1. Use the [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Use the Microsoft Authentication Library (MSAL) in a separate application
3. Use the [Microsoft OAuth Authorization flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

For production use, you should implement a proper OAuth flow with refresh tokens.

### 3. Configure environment variables

Copy the example environment file and update it with your Microsoft Graph API credentials:

```bash
cp .env.example .env
```

Edit the `.env` file with your access token:

```
ACCESS_TOKEN=your-access-token-here
REFRESH_TOKEN=your-refresh-token-here-if-available
TOKEN_EXPIRY=2025-02-28T12:00:00.000Z
PORT=3000
```

Alternatively, you can leave the `.env` file empty and use the web interface to enter your access token after starting the application.

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

### Token Management

The web interface includes a token management section where you can:

1. Enter a new access token
2. Provide a refresh token (if available)
3. Set token expiration time
4. View token status and expiration

Tokens can be updated through this interface without needing to modify the `.env` file directly.

## How It Works

- Hourly job: Counts emails received today and updates the stats
- Midnight job: Records the current inbox count for the day
- Web interface: Displays charts and calculates efficiency metrics

## Customization

You can modify the scheduled job timing by editing the cron expressions in `src/services/scheduler.js`.

## Troubleshooting

- Check the container logs: `docker-compose logs`
- Verify your Microsoft Graph API access token is valid and not expired
- Check the token status in the web interface
- Ensure the access token has Mail.Read permissions
- If using refresh tokens, ensure the token endpoint is configured correctly in the graph.js service file

## License

MIT

## Initial Prompt
(using Claude 3.7)
*I would like you to help me create a program that can take my emails via the Microsoft graph api and look at how many I've received over the course of a day and track it over time. Additionally, I would like the application to also track how many emails are in my inbox at the end of the day (Midnight). I would like this information to be stored as a JSON file that is continuously appended to.*

*Build this application as a node js express server that runs inside a docker container. There should be a web interface that allows the user to view the statistics as a graph (showing how many emails are received over the course of each day, along with another graph that shows how many are left in the inbox at the end of a day.*

*Also make it so that the .env file that contains the graph API key can be dynamically updated without having to restart the docker container.*

*The point of this application is for me to measure the efficiency of processing emails based on changes to how I'm utilizing email management tools. This application is designed to be able to measure the performance of those tools.*

*Please ask any questions if anything in these instructions are ambiguous or doesn't make sense. Think this through step by step and give me high quality code that is readable and understandable.*