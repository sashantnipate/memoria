import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";
import { createUser, deleteUser, updateUser } from '@/lib/actions/user.actions';

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add SIGNING_SECRET to .env');
  }

  const wh = new Webhook(SIGNING_SECRET);
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', { status: 400 });
  }

  // ✅ FIX: Read the body as raw text to preserve the exact signature payload
  const body = await req.text();

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ Webhook verification failed:', err);
    return new Response('Error: Verification error', { status: 400 });
  }

  // ==========================================
  // 1. CREATE USER
  // ==========================================
  if (evt.type === 'user.created') {
    const userInfo = evt.data;

    const user = {
      clerkId: userInfo.id,
      email: userInfo.email_addresses[0].email_address,
      username: userInfo.username || userInfo.email_addresses[0].email_address.split('@')[0], 
      firstName: userInfo.first_name || '',
      lastName: userInfo.last_name || '',
      photo: userInfo.image_url,
    };

    try {
      const newUser = await createUser(user);

      if (newUser) {
        const client = await clerkClient();
        await client.users.updateUserMetadata(userInfo.id, {
          publicMetadata: { userId: newUser._id },
        });
      }
      return NextResponse.json({ message: "OK", user: newUser });
    } catch (error) {
      console.error("❌ Webhook failed to save to Database:", error);
      return new Response('Error saving to database', { status: 500 });
    }
  }

  // ==========================================
  // 2. UPDATE USER
  // ==========================================
  if (evt.type === 'user.updated') {
    const userInfo = evt.data;

    const user = {
      firstName: userInfo.first_name || '',
      lastName: userInfo.last_name || '',
      username: userInfo.username || userInfo.email_addresses?.[0]?.email_address.split('@')[0],
      photo: userInfo.image_url,
    };

    try {
      const updatedUser = await updateUser(userInfo.id, user);
      return NextResponse.json({ message: "OK", user: updatedUser });
    } catch (error) {
      console.error("❌ Webhook failed to update User in Database:", error);
      return new Response('Error updating database', { status: 500 });
    }
  }

  // ==========================================
  // 3. DELETE USER
  // ==========================================
  if (evt.type === 'user.deleted') {
    const { id } = evt.data;

    try {
      const deletedUser = await deleteUser(id!);
      return NextResponse.json({ message: "OK", user: deletedUser });
    } catch (error) {
      console.error("❌ Webhook failed to delete User from Database:", error);
      return new Response('Error deleting from database', { status: 500 });
    }
  }

  return new Response("Webhook Received", { status: 200 });
}