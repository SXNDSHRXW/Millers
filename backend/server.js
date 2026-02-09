const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Email configuration (using Gmail as example - you can use SendGrid, AWS SES, etc.)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  // Your email address
        pass: process.env.EMAIL_PASS   // Your email app password
    }
});

// Beat files configuration
// Store your beat files in a secure location (AWS S3, Google Cloud Storage, or local)
const beatFiles = {
    'beat1': {
        name: 'GN1',
        wav: 'https://drive.google.com/drive/folders/1oJZZhl3nKjwkDMo3Ro5kOIVgiD4aAEZT',      // Replace with actual file URLs
        stems: 'https://your-storage.com/beats/beat1_stems.zip' // Replace with actual stems URL
    },
};

// Create Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { beatId, beatName, price, hasStems, customerEmail } = req.body;

        // Create line items
        const lineItems = [{
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: `${beatName} - ${hasStems ? 'WAV + Stems' : 'WAV Only'}`,
                    description: `Exclusive license for ${beatName}`,
                },
                unit_amount: price * 100, // Convert to pence
            },
            quantity: 1,
        }];

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/beatstore.html`,
            customer_email: customerEmail,
            metadata: {
                beatId: beatId,
                beatName: beatName,
                hasStems: hasStems.toString()
            }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook - handles successful payments
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        const beatId = session.metadata.beatId;
        const beatName = session.metadata.beatName;
        const hasStems = session.metadata.hasStems === 'true';
        const customerEmail = session.customer_email || session.customer_details?.email;

        if (customerEmail && beatId) {
            await sendBeatFiles(customerEmail, beatId, beatName, hasStems);
        }
    }

    res.json({ received: true });
});

// Send beat files via email
async function sendBeatFiles(email, beatId, beatName, hasStems) {
    const beat = beatFiles[beatId];
    
    if (!beat) {
        console.error('Beat not found:', beatId);
        return;
    }

    const attachments = [
        {
            filename: `${beat.name}.wav`,
            path: beat.wav
        }
    ];

    if (hasStems && beat.stems) {
        attachments.push({
            filename: `${beat.name}_Stems.zip`,
            path: beat.stems
        });
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Your Exclusive Beat Purchase - ${beatName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0B0F1F; color: #e2e8f0;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
                    <h1 style="color: #e2e8f0; margin: 0; font-size: 28px;">MILLERS</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0;">Exclusive Beat Purchase</p>
                </div>
                
                <div style="padding: 30px 20px;">
                    <h2 style="color: #22c55e; margin-bottom: 20px;">Thank you for your purchase!</h2>
                    
                    <p style="color: #cbd5e1; line-height: 1.6;">
                        Your exclusive beat <strong style="color: #fff;">${beatName}</strong> is attached to this email.
                    </p>
                    
                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <h3 style="color: #22c55e; margin: 0 0 10px; font-size: 16px;">What's Included:</h3>
                        <ul style="color: #cbd5e1; margin: 0; padding-left: 20px;">
                            <li>High-quality WAV file</li>
                            ${hasStems ? '<li>Full stems (individual tracks)</li>' : ''}
                            <li>Exclusive license (full ownership)</li>
                        </ul>
                    </div>
                    
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <h3 style="color: #f59e0b; margin: 0 0 10px; font-size: 16px;">Exclusive License Terms:</h3>
                        <ul style="color: #cbd5e1; margin: 0; padding-left: 20px; font-size: 14px;">
                            <li>You own 100% of the rights to this beat</li>
                            <li>Unlimited commercial use</li>
                            <li>No royalties to pay</li>
                            <li>This beat has been removed from our store</li>
                            <li>You can register the song with PROs</li>
                        </ul>
                    </div>
                    
                    <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                        If you have any questions, reply to this email or contact us at contact@millersaudio.com
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; border-top: 1px solid rgba(148, 163, 184, 0.2); color: #64748b; font-size: 12px;">
                    <p>&copy; 2026 MILLERS. All rights reserved.</p>
                </div>
            </div>
        `,
        attachments: attachments
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Beat files sent to ${email} for ${beatName}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Verify session endpoint (for success page)
app.get('/verify-session', async (req, res) => {
    try {
        const { session_id } = req.query;
        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        res.json({
            status: session.payment_status,
            customer_email: session.customer_email,
            beatName: session.metadata?.beatName
        });
    } catch (error) {
        console.error('Error verifying session:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
