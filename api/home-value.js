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

  // Forward to webhook if configured
  const webhookUrl = process.env.HOME_VALUE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (!webhookRes.ok) {
        console.error('Webhook responded with status:', webhookRes.status);
      }
    } catch (err) {
      // Log but don't fail the request — still confirm to the user
      console.error('Webhook delivery failed:', err.message);
    }
  }

  // Always log to Vercel function logs for visibility
  console.log('HOME VALUE LEAD:', JSON.stringify(leadData));

  return res.status(200).json({ success: true });
}
