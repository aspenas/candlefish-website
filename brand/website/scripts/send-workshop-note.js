#!/usr/bin/env node

/**
 * Manual script to send workshop note newsletter
 * Usage: node scripts/send-workshop-note.js [note-id]
 * 
 * Environment variables needed:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_AUDIENCE_ID: Your audience ID (optional)
 */

const { Resend } = require('resend');
const fs = require('fs').promises;
const path = require('path');

// Load workshop notes (hardcoded for now since this is a CommonJS script)
const workshopNotes = [
  {
    id: 'asymmetric-information-advantage',
    date: '2025.09.05',
    category: 'philosophical',
    title: 'The Asymmetric Information Advantage',
    excerpt: 'Our asymmetric information advantage doesn\'t come from secrecy. It comes from depth. From living through 62% OCR accuracy failures and discovering operational truths through experience.',
    readTime: '18 min read',
    tags: ['operational-philosophy', 'information-asymmetry', 'competitive-advantage', 'performance-art', 'craft-engineering'],
    content: `# The Asymmetric Information Advantage

Our asymmetric information advantage doesn't come from secrecy. It comes from depth...`
  }
];

async function prepareEmailContent(note) {
  // Read template
  const templatePath = path.join(__dirname, '../lib/email/templates/workshop-note.html');
  let template = await fs.readFile(templatePath, 'utf8');
  
  // Extract summary
  const summary = note.excerpt;
  
  // Convert content to HTML (simplified)
  let htmlContent = note.content
    .substring(0, 2000) // Limit for email
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  htmlContent = `<p>${htmlContent}</p><p><a href="https://candlefish.ai/workshop-notes?note=${note.id}">Read full note...</a></p>`;
  
  // Replace template variables
  template = template
    .replace(/{{title}}/g, note.title)
    .replace(/{{reading_time}}/g, note.readTime.replace(' min read', ''))
    .replace(/{{category}}/g, note.category)
    .replace(/{{summary}}/g, summary)
    .replace(/{{content}}/g, htmlContent)
    .replace(/{{unsubscribe_url}}/g, 'https://candlefish.ai/unsubscribe');
  
  // Handle tags
  const tagsHtml = note.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
  template = template.replace(/{{#each tags}}.*?{{\/each}}/s, tagsHtml);
  
  return template;
}

async function sendWorkshopNote(noteId) {
  // Find the note
  const note = noteId ? 
    workshopNotes.find(n => n.id === noteId) :
    workshopNotes[0]; // Default to latest
  
  if (!note) {
    console.error(`Note not found: ${noteId}`);
    console.log('Available notes:', workshopNotes.map(n => n.id).join(', '));
    process.exit(1);
  }
  
  console.log(`Preparing to send workshop note: ${note.title}`);
  
  // Check for API key
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Missing RESEND_API_KEY environment variable');
    console.log('Set it with: export RESEND_API_KEY=your_api_key');
    process.exit(1);
  }
  
  const resend = new Resend(apiKey);
  
  try {
    // Prepare email content
    const emailHtml = await prepareEmailContent(note);
    
    // Get recipient list
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    let recipients = ['workshop@candlefish.ai']; // Default recipient
    
    if (audienceId) {
      console.log('Fetching audience contacts...');
      const { data: contacts } = await resend.contacts.list({ audienceId });
      if (contacts && contacts.length > 0) {
        recipients = contacts
          .filter(c => c.subscribed)
          .map(c => c.email);
        console.log(`Found ${recipients.length} subscribers`);
      }
    } else {
      console.log('No RESEND_AUDIENCE_ID set, sending to default recipient');
    }
    
    // Send the email
    console.log('Sending email...');
    const { data, error } = await resend.emails.send({
      from: 'Candlefish Atelier <atelier@candlefish.ai>',
      to: recipients,
      reply_to: 'workshop@candlefish.ai',
      subject: `[Workshop Note] ${note.title}`,
      html: emailHtml,
      text: `${note.title}\n\n${note.excerpt}\n\nRead more: https://candlefish.ai/workshop-notes?note=${note.id}`,
      tags: [
        {
          name: 'category',
          value: 'workshop-note'
        },
        {
          name: 'note-id',
          value: note.id
        },
        {
          name: 'manual-send',
          value: 'true'
        }
      ]
    });
    
    if (error) {
      console.error('Failed to send email:', error);
      process.exit(1);
    }
    
    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data.id);
    console.log('Recipients:', recipients.length);
    console.log('Note:', note.title);
    
    // Log sent note to file
    const sentNotesFile = path.join(__dirname, '../.sent-workshop-notes.json');
    let sentNotes = {};
    try {
      const existing = await fs.readFile(sentNotesFile, 'utf8');
      sentNotes = JSON.parse(existing);
    } catch (e) {
      // File doesn't exist yet
    }
    
    sentNotes[note.id] = {
      sentAt: new Date().toISOString(),
      emailId: data.id,
      recipients: recipients.length,
      manual: true
    };
    
    await fs.writeFile(sentNotesFile, JSON.stringify(sentNotes, null, 2));
    console.log('Logged to .sent-workshop-notes.json');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Main execution
const noteId = process.argv[2];

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Workshop Note Newsletter Sender

Usage:
  node scripts/send-workshop-note.js [note-id]

Environment Variables:
  RESEND_API_KEY       - Required: Your Resend API key
  RESEND_AUDIENCE_ID   - Optional: Audience ID to send to (defaults to workshop@candlefish.ai)

Examples:
  # Send the latest note
  RESEND_API_KEY=re_xxx node scripts/send-workshop-note.js
  
  # Send a specific note
  RESEND_API_KEY=re_xxx node scripts/send-workshop-note.js asymmetric-information-advantage
  
  # Send to a specific audience
  RESEND_API_KEY=re_xxx RESEND_AUDIENCE_ID=aud_xxx node scripts/send-workshop-note.js

Available notes:
${workshopNotes.map(n => `  - ${n.id}: ${n.title}`).join('\n')}
  `);
  process.exit(0);
}

sendWorkshopNote(noteId);