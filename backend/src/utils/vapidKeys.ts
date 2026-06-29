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
      publicKey: 'BAX-0HcUSHb0c-0XVQEppIiQKDpX8zC2JL2xIs6yV0vv85jmSPMqcnJmobSzF9wSIrWjOYPYaKKv1ToL6SvtZzI',
      privateKey: 'jp-I_Ao_OoMmAJS5Al6ABYZUzsQoL9vCe9m6jVzbry4',
      subject,
    };
  }

  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey(): string {
  return getVapidKeys().publicKey;
}
