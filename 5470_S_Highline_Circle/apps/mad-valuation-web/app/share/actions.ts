'use server';
import { cookies } from 'next/headers';

export async function authorize(pass: string) {
  const correct = (process.env.MAD_SHARE_PASSPHRASE || '').trim();
  if (pass && correct && pass === correct) {
    cookies().set('mad_share_ok', '1', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
    return { ok: true };
  }
  await new Promise(r => setTimeout(r, 300));
  return { ok: false };
}
