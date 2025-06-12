# SaaS Statistics Bot

A comprehensive Telegram bot for monitoring and reporting SaaS platform statistics with real-time insights and daily activity tracking. Optimized for deployment on Vercel.

## Features

### 📊 Daily Statistics Report (`/stats`)
- **Today's Activity**: Real-time metrics for new users, websites, comments, trials, and signups
- **Growth Rates**: Percentage growth calculations for key metrics
- **User Metrics**: Total users, online status, verification status, and trial information
- **Platform Overview**: Website and comment statistics with churn rate analysis
- **Key Insights**: Actionable conversion rates and engagement metrics

### 👥 New Users Report (`/newusers`)
- **Daily User Registration**: Detailed list of users who registered today
- **User Information**: Name, email, registration time, verification status
- **Trial Status**: Clear indication of trial vs regular users
- **Activity Data**: Website count and last active information
- **Smart Field Support**: Works with both camelCase and snake_case database fields

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Telegram Bot Token

### Local Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file based on the `.env.example` template:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your actual values.

4. **Run the bot locally**
   ```bash
   npm run dev
   ```

## Deployment to Vercel

### Setup

1. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```
   Or connect your GitHub repository to Vercel for automatic deployments.

3. **Set Environment Variables**
   In the Vercel dashboard, add the following environment variables:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
   - `MONGODB_URI`: Your MongoDB connection string
   - `CHAT_ID`: Your Telegram chat ID
   - `NODE_ENV`: Set to `production`
   - `WEBHOOK_URL`: Your Vercel deployment URL (if not using `VERCEL_URL`)

4. **Set up Telegram Webhook**
   After deployment, your bot will automatically set up the webhook using the Vercel deployment URL.

### API Endpoints

- **`/`**: Health check endpoint
- **`/api/stats`**: Manually trigger and view statistics
- **`/bot<token>`**: Webhook endpoint for Telegram (automatically configured)

## Database Schema Support

The bot supports flexible database schemas with both camelCase and snake_case field names:

### Users Collection
- `createdAt` / `created_at` - User registration date
- `lastActive` / `last_active` - Last activity timestamp
- `emailVerified` / `email_verified` - Email verification status
- `deletedAt` / `deleted_at` - Account deletion timestamp
- `plan` / `planType` - User subscription plan

### Other Collections
- `websites` - Website creation data
- `comments` - User comments and engagement
- `guests` - Guest user tracking
- `pendingsignups` - Incomplete registrations

## Commands

### `/stats`
Generates a comprehensive daily SaaS statistics report including:
- Today's new registrations and activity
- Growth percentages and trends
- User conversion and engagement metrics
- Platform health indicators

### `/newusers`
Provides detailed information about users who registered today:
- User identification and contact information
- Registration timestamps
- Verification and trial status
- Activity and engagement data

## Scheduled Reports

The bot automatically sends daily statistics reports at 9:00 AM using cron scheduling.

## Error Handling

- Comprehensive MongoDB connection error handling
- Graceful fallbacks for missing database fields
- Detailed logging for debugging and monitoring
- Clean error messages for end users

## Project Structure

- `bot.js`: Main application file with bot logic and Express server
- `vercel.json`: Vercel deployment configuration
- `.env.example`: Template for environment variables
- `package.json`: Project dependencies and scripts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the GitHub repository.