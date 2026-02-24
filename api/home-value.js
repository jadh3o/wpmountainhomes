export default async function handler(req, res) {
  // CORS headers for the static site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[v0] Received home-value request, body:', JSON.stringify(req.body));

  const { address, name, email, phone } = req.body || {};

  if (!address || !name || !email) {
    console.log('[v0] Validation failed — missing fields:', { address: !!address, name: !!name, email: !!email });
    return res.status(400).json({ error: 'Missing required fields: address, name, and email are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('[v0] Invalid email format:', email);
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

  if (!resendKey) {
    console.error('[v0] RESEND_API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  console.log('[v0] RESEND_API_KEY is set, length:', resendKey.length);

  const emailPayload = {
    from: 'WP Mountain Homes <onboarding@resend.dev>',
    to: ['jonathandickey333@gmail.com'],
    subject: `Home Value Request: ${leadData.address}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;">
        <h2 style="color:#2D4A3E;margin-bottom:4px;">New Home Value Request</h2>
        <p style="color:#888;font-size:13px;margin-top:0;">From wpmountainhomes.com</p>
        <table style="border-collapse:collapse;font-size:14px;width:100%;margin-top:16px;">
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px 16px 10px 0;font-weight:bold;color:#2D4A3E;white-space:nowrap;">Property Address</td>
            <td style="padding:10px 0;">${leadData.address}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px 16px 10px 0;font-weight:bold;color:#2D4A3E;white-space:nowrap;">Name</td>
            <td style="padding:10px 0;">${leadData.name}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px 16px 10px 0;font-weight:bold;color:#2D4A3E;white-space:nowrap;">Email</td>
            <td style="padding:10px 0;"><a href="mailto:${leadData.email}" style="color:#C8A96E;">${leadData.email}</a></td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px 16px 10px 0;font-weight:bold;color:#2D4A3E;white-space:nowrap;">Phone</td>
            <td style="padding:10px 0;">${leadData.phone ? `<a href="tel:${leadData.phone}" style="color:#C8A96E;">${leadData.phone}</a>` : '<span style="color:#999;">Not provided</span>'}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px 10px 0;font-weight:bold;color:#2D4A3E;white-space:nowrap;">Submitted</td>
            <td style="padding:10px 0;">${new Date(leadData.timestamp).toLocaleString('en-US', { timeZone: 'America/Denver' })}</td>
          </tr>
        </table>
      </div>
    `,
  };

  console.log('[v0] Sending email to Resend API...');

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const resBody = await emailRes.text();
    console.log('[v0] Resend response status:', emailRes.status);
    console.log('[v0] Resend response body:', resBody);

    if (!emailRes.ok) {
      console.error('[v0] Resend API error:', emailRes.status, resBody);
      return res.status(500).json({ error: 'Failed to send notification email.', detail: resBody });
    }

    console.log('[v0] Email sent successfully');
  } catch (err) {
    console.error('[v0] Email delivery exception:', err.message, err.stack);
    return res.status(500).json({ error: 'Failed to send notification email.', detail: err.message });
  }

  console.log('[v0] HOME VALUE LEAD:', JSON.stringify(leadData));

  return res.status(200).json({ success: true });
}
