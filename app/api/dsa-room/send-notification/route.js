import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin
let db = null;

function getDb() {
  if (db) return db;
  
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || '{}');
  
  if (!serviceAccount.project_id) {
    throw new Error('FIREBASE_ADMIN_KEY environment variable is not properly configured');
  }
  
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore(app);
  
  return db;
}

// Email configuration - Update these with your email service details
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const { type, requesterName, requesterEmail, roomOwnerName, roomOwnerEmail, roomCode, action } = await request.json();

    if (!roomOwnerEmail) {
      return NextResponse.json({ error: 'Missing room owner email' }, { status: 400 });
    }

    let emailSubject = '';
    let emailBody = '';

    if (type === 'join_request') {
      emailSubject = `🔔 ${requesterName} wants to join your DSA Room (${roomCode})`;
      emailBody = `
        <h2>Join Request Received</h2>
        <p><strong>${requesterName}</strong> (${requesterEmail}) has requested to join your DSA Room.</p>
        <p><strong>Room Code:</strong> ${roomCode}</p>
        <p>Please log in to your PrepWise account to approve or reject this request.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dsa-room" style="padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
          Review Request
        </a>
      `;
    } else if (type === 'join_approved') {
      emailSubject = `✓ Your join request was approved for DSA Room (${roomCode})`;
      emailBody = `
        <h2>Request Approved!</h2>
        <p>Great news! <strong>${roomOwnerName}</strong> has approved your request to join the DSA Room.</p>
        <p><strong>Room Code:</strong> ${roomCode}</p>
        <p>You can now enter the room and start competing!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dsa-room" style="padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
          Enter Room
        </a>
      `;
    } else if (type === 'join_rejected') {
      emailSubject = `✕ Your join request was rejected for DSA Room (${roomCode})`;
      emailBody = `
        <h2>Request Rejected</h2>
        <p><strong>${roomOwnerName}</strong> has rejected your request to join the DSA Room.</p>
        <p><strong>Room Code:</strong> ${roomCode}</p>
        <p>You can try joining another room or create your own.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dsa-room" style="padding: 10px 20px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
          Explore Rooms
        </a>
      `;
    }

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: type === 'join_request' ? roomOwnerEmail : requesterEmail,
      subject: emailSubject,
      html: emailBody,
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${mailOptions.to}`);
    } else {
      console.log('Email service not configured, skipping email');
    }

    return NextResponse.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
