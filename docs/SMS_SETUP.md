# SMS/OTP Setup Guide

## Overview

This application supports sending OTP codes via both email and SMS. Currently, email is fully configured, but SMS requires Twilio setup.

## Current Status

- ✅ **Email OTP**: Fully configured and working
- ❌ **SMS OTP**: Not configured (requires Twilio account)

## SMS Setup (Optional)

### 1. Create Twilio Account

1. Visit [Twilio.com](https://www.twilio.com)
2. Sign up for a free trial account
3. Verify your email and phone number

### 2. Get Twilio Credentials

After account setup, you'll need:

- **Account SID**: Found in your Twilio Console dashboard
- **Auth Token**: Found in your Twilio Console dashboard
- **Phone Number**: Purchase a Twilio phone number for sending SMS

### 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
```

### 4. Test SMS Functionality

1. Restart your development server
2. Try logging in with a phone number
3. Check the console for SMS delivery confirmation

## SMS Limitations

- **Free Trial**: Twilio free trial has limitations on SMS
- **Phone Verification**: Recipient phone numbers may need verification in Twilio
- **Costs**: SMS costs apply after free trial (typically $0.0075 per message)

## Fallback Behavior

- If SMS fails, the system will show a clear error message
- Users are guided to use email instead
- No partial failures or confusing error states

## Troubleshooting

### Common Issues

1. **"Twilio not configured"**: Check your environment variables
2. **"Phone number not verified"**: Verify the recipient number in Twilio
3. **"Insufficient funds"**: Add credit to your Twilio account

### Debug Steps

1. Check server console for detailed SMS error logs
2. Verify Twilio credentials in `.env.local`
3. Test Twilio connection using their online tools
4. Check Twilio Console for message delivery status

## Alternative Solutions

If you don't want to use Twilio:

1. **Email Only**: Remove phone input field from login form
2. **Other SMS Providers**: Integrate with services like AWS SNS, MessageBird, or Vonage
3. **WhatsApp Business API**: For business applications

## Security Notes

- Never commit Twilio credentials to version control
- Use environment variables for all sensitive data
- Regularly rotate your Twilio auth token
- Monitor your Twilio usage and costs
