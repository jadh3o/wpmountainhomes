export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, name, email, phone } = req.body || {};

  // Validate required fields
  if (!address || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields: address, name, and email are required.' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const leadData = {
    address: address.trim(),
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : '',
    source: 'wpmountainhomes.com',
    type: 'home-value-request',
    timestamp: new Date().toISOString(),
  };

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.LEAD_EMAIL || 'jonathan@wpmountainhomes.com';

  if (!resendKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'WP Mountain Homes <onboarding@resend.dev>',
        to: [toEmail],
        subject: `Home Value Request: ${leadData.address}`,
        html: `
          <h2>New Home Value Request</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
            <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#2D4A3E;">Property</td><td style="padding:8px 0;">${leadData.address}</td></tr>
            <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#2D4A3E;">Name</td><td style="padding:8px 0;">${leadData.name}</td></tr>
            <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#2D4A3E;">Email</td><td style="padding:8px 0;"><a href="mailto:${leadData.email}">${leadData.email}</a></td></tr>
            <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#2D4A3E;">Phone</td><td style="padding:8px 0;">${leadData.phone || 'Not provided'}</td></tr>
            <tr><td style="padding:8px 16px 8px 0;font-weight:bold;color:#2D4A3E;">Submitted</td><td style="padding:8px 0;">${new Date(leadData.timestamp).toLocaleString('en-US', { timeZone: 'America/Denver' })}</td></tr>
          </table>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('Resend error:', emailRes.status, errBody);
      return res.status(500).json({ error: 'Failed to send notification email.' });
    }
  } catch (err) {
    console.error('Email delivery failed:', err.message);
    return res.status(500).json({ error: 'Failed to send notification email.' });
  }

  console.log('HOME VALUE LEAD:', JSON.stringify(leadData));

  return res.status(200).json({ success: true });
}
