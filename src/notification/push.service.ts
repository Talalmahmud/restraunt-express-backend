import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { BadRequestError } from '../common/errors/http-errors';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_BATCH = 100;
const TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;

export interface PushPayload {
  title: string;
  body: string;
  /** Delivered to the app so a tap can open the right screen. */
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

export async function registerPushToken(employeeId: string, token: string, platform: string) {
  if (!TOKEN_PATTERN.test(token)) throw new BadRequestError('Not a valid Expo push token');
  // A device that signs in as someone else takes the token over.
  await prisma.pushToken.upsert({
    where: { token },
    update: { employeeId, platform },
    create: { token, platform, employeeId },
  });
  return { message: 'Push token registered' };
}

export async function removePushToken(employeeId: string, token: string) {
  await prisma.pushToken.deleteMany({ where: { token, employeeId } });
  return { message: 'Push token removed' };
}

async function tokensFor(employeeIds: string[]): Promise<string[]> {
  if (employeeIds.length === 0) return [];
  const rows = await prisma.pushToken.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { token: true },
  });
  return rows.map((r) => r.token);
}

/**
 * Sends a push to every device of the given employees. Never throws: a failed
 * notification must not fail the order that triggered it.
 */
export async function sendPush(employeeIds: string[], payload: PushPayload): Promise<number> {
  try {
    const tokens = [...new Set(await tokensFor(employeeIds))];
    let sent = 0;
    for (let i = 0; i < tokens.length; i += MAX_BATCH) {
      const batch = tokens.slice(i, i + MAX_BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(env.expoAccessToken ? { Authorization: `Bearer ${env.expoAccessToken}` } : {}),
        },
        body: JSON.stringify(
          batch.map((to) => ({
            to,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            sound: 'default',
            priority: 'high',
            channelId: 'orders',
          })),
        ),
      });
      if (!res.ok) {
        console.warn(`Expo push request failed with status ${res.status}`);
        continue;
      }
      const { data: tickets } = (await res.json()) as { data?: ExpoTicket[] };
      const dead: string[] = [];
      tickets?.forEach((ticket, index) => {
        if (ticket.status === 'ok') sent += 1;
        else if (ticket.details?.error === 'DeviceNotRegistered') dead.push(batch[index]);
        else console.warn(`Push not delivered: ${ticket.message ?? ticket.details?.error}`);
      });
      // The app was uninstalled or its token expired: stop sending to it.
      if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    }
    return sent;
  } catch (error) {
    console.warn('Push notification failed:', error instanceof Error ? error.message : error);
    return 0;
  }
}
