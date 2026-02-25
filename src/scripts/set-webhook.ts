import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const setWebhook = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = process.env.NEXT_PUBLIC_SITE_URL;

  if (!token || !url) {
    console.error('Missing TELEGRAM_BOT_TOKEN or NEXT_PUBLIC_SITE_URL in .env');
    return;
  }

  const webhookUrl = `${url}/api/webhook`;

  try {
    const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: webhookUrl,
    });
    console.log('Webhook set successfully:', response.data);
  } catch (error: any) {
    console.error('Error setting webhook:', error.response?.data || error.message);
  }
};

setWebhook();
