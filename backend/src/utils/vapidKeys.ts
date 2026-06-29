import dotenv from 'dotenv';

dotenv.config();

export function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@fizapp.com';

  if (!publicKey || !privateKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são obrigatórios em produção');
    }
    return {
      publicKey: 'BKah9oWX0GtT4t0vE0k0vE0k0vE0k0vE0k0vE0k0vE',
      privateKey: 'dev-vapid-private-key',
      subject,
    };
  }

  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey(): string {
  return getVapidKeys().publicKey;
}
