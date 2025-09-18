const Joi = require('joi');
const { sendContactEmails } = require("../services/contactusService");

// Optional GET handler (if ever used to render a page)
const contactUs = (req, res) => {
  return res.status(200).json({ message: 'Contact endpoint is live.' });
};

// POST /api/contactus
const submitContactUs = async (req, res) => {
  // Validation schema
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email: Joi.string().email().max(254).required(),
    message: Joi.string().min(10).max(2000).trim().required(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map((d) => d.message),
    });
  }

  const { name, email, message } = value;

  try {
    await sendContactEmails({ name, email, message, ip: req.ip });
    return res.status(200).json({
      success: true,
      message: 'Thanks! Your message has been received. We will get back to you shortly.',
    });
  } catch (err) {
    console.error('Contact Us error:', err);
    return res.status(500).json({ error: 'Unable to send your message right now. Please try again later.' });
  }
};

module.exports = {
  contactUs,
  submitContactUs,
};