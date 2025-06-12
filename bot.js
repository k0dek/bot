require('dotenv').config();
const { MongoClient } = require('mongodb');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const express = require('express');

const uri = process.env.MONGODB_URI;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize bot with webhook mode for Vercel
let bot;
if (process.env.NODE_ENV === 'production') {
  // Webhook mode for production (Vercel)
  const webhookUrl = process.env.VERCEL_URL || process.env.WEBHOOK_URL;
  bot = new TelegramBot(botToken, {
    webHook: {
      port: PORT
    }
  });
  // Set webhook path
  bot.setWebHook(`${webhookUrl}/bot${botToken}`);
} else {
  // Polling mode for development
  bot = new TelegramBot(botToken, { polling: true });
}

async function getDateRangeForYesterday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(today);
  yesterdayStart.setDate(today.getDate() - 1);

  const yesterdayEnd = new Date(today);
  yesterdayEnd.setMilliseconds(-1);

  return { yesterdayStart, yesterdayEnd };
}

async function getStats() {
  let client;
  try {
    client = new MongoClient(uri);
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('Successfully connected to MongoDB at:', uri);
    
    const db = client.db('toolbar');
    const { yesterdayStart, yesterdayEnd } = await getDateRangeForYesterday();

    const totalUsers = await db.collection('users').countDocuments();
    
    // Users created yesterday - support both createdAt and created_at field names
    const usersYesterday = await db.collection('users').countDocuments({
      $or: [
        { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } },
        { created_at: { $gte: yesterdayStart, $lte: yesterdayEnd } }
      ]
    });

    // Online users (active in last 5 minutes) - support both field names
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await db.collection('users').countDocuments({
      $or: [
        { lastActive: { $gte: fiveMinutesAgo } },
        { last_active: { $gte: fiveMinutesAgo } }
      ]
    });

    // Trial users and verification stats - support both plan and planType
    const trialUsers = await db.collection('users').countDocuments({
      $or: [
        { plan: 'trial' },
        { planType: 'trial' }
      ],
      $and: [
        {
          $or: [
            { deletedAt: null },
            { deleted_at: null },
            { deletedAt: { $exists: false } },
            { deleted_at: { $exists: false } }
          ]
        }
      ]
    });
    
    const verifiedUsers = await db.collection('users').countDocuments({
      $or: [
        { emailVerified: true },
        { email_verified: true }
      ],
      $and: [
        {
          $or: [
            { deletedAt: null },
            { deleted_at: null },
            { deletedAt: { $exists: false } },
            { deleted_at: { $exists: false } }
          ]
        }
      ]
    });
    
    const unverifiedUsers = await db.collection('users').countDocuments({
      $or: [
        { emailVerified: false },
        { email_verified: false }
      ],
      $and: [
        {
          $or: [
            { deletedAt: null },
            { deleted_at: null },
            { deletedAt: { $exists: false } },
            { deleted_at: { $exists: false } }
          ]
        }
      ]
    });

    const totalWebsites = await db.collection('websites').countDocuments();
    const totalComments = await db.collection('comments').countDocuments();
    const totalGuests = await db.collection('guests').countDocuments();
    const totalPendingSignups = await db.collection('pendingsignups').countDocuments();

    // Calculate churn rate - support both field names
    const usersBeforeYesterday = await db.collection('users').countDocuments({
      $or: [
        { createdAt: { $lt: yesterdayStart } },
        { created_at: { $lt: yesterdayStart } }
      ]
    });
    
    const usersLostYesterday = await db.collection('users').countDocuments({
      $or: [
        { deletedAt: { $gte: yesterdayStart, $lte: yesterdayEnd } },
        { deleted_at: { $gte: yesterdayStart, $lte: yesterdayEnd } }
      ]
    });
    
    // Calculate today's date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(startOfToday.getDate() + 1);

    // TODAY'S ACTIVITY METRICS
    // New users registered today
    const newUsersToday = await db.collection('users').countDocuments({
      $or: [
        { createdAt: { $gte: startOfToday, $lt: endOfToday } },
        { created_at: { $gte: startOfToday, $lt: endOfToday } }
      ],
      $and: [
        {
          $or: [
            { deletedAt: null },
            { deleted_at: null },
            { deletedAt: { $exists: false } },
            { deleted_at: { $exists: false } }
          ]
        }
      ]
    });

    // New websites created today
    const newWebsitesToday = await db.collection('websites').countDocuments({
      $or: [
        { createdAt: { $gte: startOfToday, $lt: endOfToday } },
        { created_at: { $gte: startOfToday, $lt: endOfToday } }
      ]
    });

    // New comments added today
    const newCommentsToday = await db.collection('comments').countDocuments({
      $or: [
        { createdAt: { $gte: startOfToday, $lt: endOfToday } },
        { created_at: { $gte: startOfToday, $lt: endOfToday } }
      ]
    });

    // New trial users today
    const newTrialUsersToday = await db.collection('users').countDocuments({
      $or: [
        { plan: 'trial' },
        { planType: 'trial' }
      ],
      $and: [
        {
          $or: [
            { createdAt: { $gte: startOfToday, $lt: endOfToday } },
            { created_at: { $gte: startOfToday, $lt: endOfToday } }
          ]
        },
        {
          $or: [
            { deletedAt: null },
            { deleted_at: null },
            { deletedAt: { $exists: false } },
            { deleted_at: { $exists: false } }
          ]
        }
      ]
    });

    // New verified users today
    const newVerifiedUsersToday = await db.collection('users').countDocuments({
      $or: [
        { emailVerified: true },
        { email_verified: true }
      ],
      $and: [
        {
          $or: [
            { createdAt: { $gte: startOfToday, $lt: endOfToday } },
            { created_at: { $gte: startOfToday, $lt: endOfToday } }
          ]
        },
        {
          $or: [
            { deletedAt: null },
            { deleted_at: null },
            { deletedAt: { $exists: false } },
            { deleted_at: { $exists: false } }
          ]
        }
      ]
    });

    // New unverified users today
    const newUnverifiedUsersToday = await db.collection('users').countDocuments({
      $or: [
        { emailVerified: false },
        { email_verified: false }
      ],
      $and: [
        {
          $or: [
            { createdAt: { $gte: startOfToday, $lt: endOfToday } },
            { created_at: { $gte: startOfToday, $lt: endOfToday } }
          ]
        },
        {
          $or: [
            { deletedAt: null },
            { deleted_at: null },
            { deletedAt: { $exists: false } },
            { deleted_at: { $exists: false } }
          ]
        }
      ]
    });

    // New guests today
    const newGuestsToday = await db.collection('guests').countDocuments({
      $or: [
        { createdAt: { $gte: startOfToday, $lt: endOfToday } },
        { created_at: { $gte: startOfToday, $lt: endOfToday } }
      ]
    });

    // New pending signups today
    const newPendingSignupsToday = await db.collection('pendingsignups').countDocuments({
      $or: [
        { createdAt: { $gte: startOfToday, $lt: endOfToday } },
        { created_at: { $gte: startOfToday, $lt: endOfToday } }
      ]
    });

    const churnRate = usersBeforeYesterday > 0 
      ? ((usersLostYesterday / usersBeforeYesterday) * 100).toFixed(2)
      : 0;

    // Calculate growth rates
    const userGrowthRate = totalUsers > 0 ? ((newUsersToday / totalUsers) * 100).toFixed(2) : 0;
    const websiteGrowthRate = totalWebsites > 0 ? ((newWebsitesToday / totalWebsites) * 100).toFixed(2) : 0;
    const commentGrowthRate = totalComments > 0 ? ((newCommentsToday / totalComments) * 100).toFixed(2) : 0;

    const message = `📊 Daily SaaS Statistics Report\n\n` +
      `🚀 TODAY'S ACTIVITY (${startOfToday.toLocaleDateString()})\n` +
      `• New Users: ${newUsersToday} (+${userGrowthRate}% growth)\n` +
      `• New Websites: ${newWebsitesToday} (+${websiteGrowthRate}% growth)\n` +
      `• New Comments: ${newCommentsToday} (+${commentGrowthRate}% growth)\n` +
      `• New Trial Users: ${newTrialUsersToday}\n` +
      `• New Verified Users: ${newVerifiedUsersToday}\n` +
      `• New Unverified Users: ${newUnverifiedUsersToday}\n` +
      `• New Guests: ${newGuestsToday}\n` +
      `• New Pending Signups: ${newPendingSignupsToday}\n\n` +
      `👥 TOTAL USER METRICS\n` +
      `• Total Users: ${totalUsers} (+${usersYesterday} yesterday)\n` +
      `• Currently Online: ${onlineUsers}\n` +
      `• Trial Users: ${trialUsers}\n` +
      `• Verified Users: ${verifiedUsers}\n` +
      `• Unverified Users: ${unverifiedUsers}\n` +
      `• Total Guests: ${totalGuests}\n` +
      `• Pending Signups: ${totalPendingSignups}\n\n` +
      `🌐 PLATFORM OVERVIEW\n` +
      `• Total Websites: ${totalWebsites}\n` +
      `• Total Comments: ${totalComments}\n` +
      `• Daily Churn Rate: ${churnRate}%\n\n` +
      `📈 KEY INSIGHTS\n` +
      `• User Conversion: ${newVerifiedUsersToday}/${newUsersToday} verified today\n` +
      `• Trial Adoption: ${newTrialUsersToday}/${newUsersToday} started trials\n` +
      `• Engagement: ${newCommentsToday} comments from ${newUsersToday} new users\n\n` +
      `Generated at: ${new Date().toLocaleString()}`;

    return message;
  } catch (error) {
    console.error('MongoDB Error Details:');
    console.error('- Error Name:', error.name);
    console.error('- Error Message:', error.message);
    console.error('- Error Code:', error.code);
    console.error('- Full Error:', error);
    return 'Failed to fetch statistics. Please check the logs for more information.';
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function debugUserData() {
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('toolbar');
    
    // Get a few sample users to understand the data structure
    const sampleUsers = await db.collection('users')
      .find({})
      .limit(5)
      .toArray();
    
    console.log('\n=== DEBUG: Sample user data ===');
    sampleUsers.forEach((user, index) => {
      const debugInfo = {
        email: user.email,
        username: user.username
      };
      
      // Only add createdAt if it exists
      if (user.createdAt !== undefined) {
        debugInfo.createdAt = user.createdAt;
      }
      
      // Only add created_at if it exists
      if (user.created_at !== undefined) {
        debugInfo.created_at = user.created_at;
      }
      
      // Only add name if it exists
      if (user.name !== undefined) {
        debugInfo.name = user.name;
      }
      
      console.log(`User ${index + 1}:`, debugInfo);
    });
    console.log('=== END DEBUG ===\n');
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function getTodayNewUsers() {
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('toolbar');
    
    // First, let's debug the data structure
    await debugUserData();
    
    // Calculate today's start and end timestamps
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);
    
    const startOfDayISO = startOfDay.toISOString();
    const endOfDayISO = endOfDay.toISOString();
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    console.log('Debug - Search ranges:', {
      date: { start: startOfDay, end: endOfDay },
      iso: { start: startOfDayISO, end: endOfDayISO },
      timestamp: { start: startTimestamp, end: endTimestamp }
    });
    
    // Try a broader search first - get all users from the last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await db.collection('users')
      .find({
        $or: [
          { createdAt: { $gte: sevenDaysAgo } },
          { createdAt: { $gte: sevenDaysAgo.toISOString() } },
          { createdAt: { $gte: sevenDaysAgo.getTime() } },
          // Also try created_at in case both field names exist
          { created_at: { $gte: sevenDaysAgo } },
          { created_at: { $gte: sevenDaysAgo.toISOString() } },
          { created_at: { $gte: sevenDaysAgo.getTime() } }
        ],
        $and: [
          {
            $or: [
              { deletedAt: null },
              { deleted_at: null },
              { deletedAt: { $exists: false } },
              { deleted_at: { $exists: false } }
            ]
          }
        ]
      })
      .sort({ createdAt: -1, created_at: -1 })
      .limit(10)
      .toArray();
    
    console.log('\n=== Recent users (last 7 days) ===');
    recentUsers.forEach((user, index) => {
      console.log(`Recent User ${index + 1}:`, {
        email: user.email,
        createdAt: user.createdAt,
        createdAt_type: typeof user.createdAt,
        created_at: user.created_at,
        created_at_type: typeof user.created_at,
        parsed_date_createdAt: user.createdAt ? new Date(user.createdAt) : null,
        parsed_date_created_at: user.created_at ? new Date(user.created_at) : null
      });
    });
    
    // Now try today's users with the correct field name (createdAt)
    const users = await db.collection('users')
      .find({
        $or: [
          // Match Date objects for createdAt
          {
            $and: [
              { 'createdAt': { $type: 9 } }, // type 9 is date
              { 'createdAt': { $gte: startOfDay, $lt: endOfDay } }
            ]
          },
          // Match ISO strings for createdAt
          {
            $and: [
              { 'createdAt': { $type: 2 } }, // type 2 is string
              { 'createdAt': { $gte: startOfDayISO, $lt: endOfDayISO } }
            ]
          },
          // Match timestamps (numbers) for createdAt
          {
            $and: [
              { 'createdAt': { $type: 16 } }, // type 16 is int/long
              { 'createdAt': { $gte: startTimestamp, $lt: endTimestamp } }
            ]
          },
          // Match double (numbers) for createdAt
          {
            $and: [
              { 'createdAt': { $type: 1 } }, // type 1 is double
              { 'createdAt': { $gte: startTimestamp, $lt: endTimestamp } }
            ]
          },
          // Also try created_at field name variations
          {
            $and: [
              { 'created_at': { $type: 9 } },
              { 'created_at': { $gte: startOfDay, $lt: endOfDay } }
            ]
          },
          {
            $and: [
              { 'created_at': { $type: 2 } },
              { 'created_at': { $gte: startOfDayISO, $lt: endOfDayISO } }
            ]
          },
          {
            $and: [
              { 'created_at': { $type: 16 } },
              { 'created_at': { $gte: startTimestamp, $lt: endTimestamp } }
            ]
          },
          {
            $and: [
              { 'created_at': { $type: 1 } },
              { 'created_at': { $gte: startTimestamp, $lt: endTimestamp } }
            ]
          }
        ],
        $and: [
          {
            $or: [
              { deletedAt: null },
              { deleted_at: null },
              { deletedAt: { $exists: false } },
              { deleted_at: { $exists: false } }
            ]
          }
        ]
      })
      .project({
        email: 1,
        name: 1,
        username: 1,
        createdAt: 1,
        created_at: 1,
        plan: 1,
        planType: 1,
        emailVerified: 1,
        email_verified: 1,
        lastActive: 1,
        last_active: 1,
        websites_count: 1
      })
      .sort({ createdAt: -1, created_at: -1 })
      .toArray();

    console.log('Debug - Found users for today:', users.length);
    if (users.length > 0) {
      users.forEach((user, index) => {
        const debugInfo = {
          email: user.email,
          username: user.username
        };
        
        // Only add createdAt if it exists
        if (user.createdAt !== undefined) {
          debugInfo.createdAt = user.createdAt;
        }
        
        // Only add created_at if it exists
        if (user.created_at !== undefined) {
          debugInfo.created_at = user.created_at;
        }
        
        // Only add name if it exists
        if (user.name !== undefined) {
          debugInfo.name = user.name;
        }
        
        console.log(`Debug - User ${index + 1}:`, debugInfo);
      });
    }

    if (users.length === 0) {
      return 'No new users registered today.';
    }

    const message = `📊 Today's New Users Report (${users.length} total)\n\n` +
      users.map((user, index) => {
        const verificationStatus = (user.emailVerified || user.email_verified) ? '✅ Verified' : '❌ Unverified';
        const planInfo = (user.plan || user.planType) ? `\n   Plan: ${user.plan || user.planType}` : '';
        
        // Check if user is on trial
        const isTrialUser = (user.plan === 'trial' || user.planType === 'trial');
        const trialStatus = isTrialUser ? '🔄 Trial User' : '💎 Regular User';
        
        const websitesInfo = `\n   Websites: ${user.websites_count || 0}`;
        const lastActiveInfo = (user.lastActive || user.last_active) ? 
          `\n   Last Active: ${new Date(user.lastActive || user.last_active).toLocaleString()}` : 
          '\n   Not active yet';

        // Use createdAt or created_at, whichever exists
        const createdDate = new Date(user.createdAt || user.created_at);
        const displayName = user.name || user.username || 'No name';
        
        return `${index + 1}. ${displayName} (${user.email})\n` +
               `   Registered: ${createdDate.toLocaleString()}` +
               `\n   Status: ${verificationStatus}` +
               `\n   Type: ${trialStatus}` +
               planInfo +
               websitesInfo +
               lastActiveInfo;
      }).join('\n\n');

    return message;
  } catch (error) {
    console.error('Error fetching today\'s users:', error);
    return 'Failed to fetch today\'s new users. Please check the logs.';
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function sendDailyStats(targetChatId = chatId) {
  try {
    const statsMessage = await getStats();
    await bot.sendMessage(targetChatId, statsMessage);
    console.log('Daily stats sent successfully');
  } catch (error) {
    console.error('Error sending daily stats:', error);
  }
}

async function testConnection() {
  let client;
  try {
    client = new MongoClient(uri);
    console.log('Testing MongoDB connection...');
    await client.connect();
    console.log('Successfully connected to MongoDB');
    const db = client.db('toolbar');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
  } catch (error) {
    console.error('MongoDB Connection Error:');
    console.error('- Error Name:', error.name);
    console.error('- Error Message:', error.message);
    console.error('- Error Code:', error.code);
    console.error('- Full Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Schedule daily stats at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('Initiating daily stats...');
  sendDailyStats();
});

// Handle all commands
bot.onText(/\/(stats|start|getchatid|newusers)/, async (msg) => {
  const receivedChatId = msg.chat.id;
  console.log(`Command received from chat ID: ${receivedChatId}`);
  
  if (msg.text === '/getchatid') {
    bot.sendMessage(receivedChatId, `Your chat ID is: ${receivedChatId}\nMessage thread ID: ${msg.message_thread_id || 'None'}`);
  } else if (msg.text === '/newusers') {
    const newUsersMessage = await getTodayNewUsers();
    bot.sendMessage(receivedChatId, newUsersMessage);
  } else {
    sendDailyStats(receivedChatId);
  }
});

// Express routes for webhook
app.post(`/bot${botToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Bot is running!');
});

// Endpoint to manually trigger stats
app.get('/api/stats', async (req, res) => {
  try {
    const statsMessage = await getStats();
    res.status(200).json({ success: true, stats: statsMessage });
  } catch (error) {
    console.error('Error generating stats:', error);
    res.status(500).json({ success: false, error: 'Failed to generate stats' });
  }
});

// Start Express server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    testConnection();
  });
} else {
  // In production, we don't need to start the server as Vercel handles that
  console.log('Bot is running in production mode');
}

// Export the Express app for Vercel
module.exports = app;