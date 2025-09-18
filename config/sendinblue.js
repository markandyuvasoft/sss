// config/sendinblue.js
import Sib from 'sib-api-v3-sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = Sib.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

export default client;
