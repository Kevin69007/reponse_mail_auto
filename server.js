// Importation des dépendances
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from './logger.js'; // Winston pour journalisation

// Chargement des variables d'environnement (.env)
dotenv.config();

// Initialisation d'Express
const app = express();
app.use(express.json()); // Permet de parser les JSON entrants

// Middleware CORS pour accepter les requêtes depuis n'importe quelle origine
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-secret');
  next();
});

// Middleware de vérification de la clé API secrète
function checkApiKey(req, res, next) {
  if (req.headers['x-api-secret'] !== process.env.API_SECRET_KEY) {
    logger.warn(`Clé API invalide depuis IP ${req.ip}`);
    return res.status(403).json({ error: 'Non autorisé' });
  }
  next();
}

// Fonction générique pour créer un transporteur SMTP à partir d'un préfixe (CUSPIDE, JAK, etc.)
function createTransporter(prefix) {
  return nodemailer.createTransport({
    host: process.env[`${prefix}_SMTP_HOST`],
    port: parseInt(process.env[`${prefix}_SMTP_PORT`]),
    secure: process.env[`${prefix}_SMTP_PORT`] === '465',
    auth: {
      user: process.env[`${prefix}_SMTP_USER`],
      pass: process.env[`${prefix}_SMTP_PASSWORD`]
    }
  });
}

// Fonction générique d’envoi d’email pour chaque service
async function sendEmail(req, res, prefix) {
  const { to, from, subject, messageId, body } = req.body;

  // Vérifie que les champs essentiels sont présents
  if (!from || !subject || !messageId) {
    logger.warn(`[${prefix}] Champs manquants: ${JSON.stringify(req.body)}`);
    return res.status(400).json({
      error: 'Champs manquants',
      required: ['from', 'subject', 'messageId']
    });
  }

  // Création du transporteur SMTP correspondant au service (CUSPIDE, JAK, etc.)
  const transporter = createTransporter(prefix);

  // Préparation du message
  const mailOptions = {
    from: `"${process.env[`${prefix}_FROM_NAME`]}" <${process.env[`${prefix}_FROM_EMAIL`]}>`,
    to,
    subject: `Re: ${subject}`,
    text: body || 'Merci pour votre message. Nous vous répondrons bientôt.',
    inReplyTo: messageId,
    references: messageId
  };

  // Envoi du mail via Nodemailer
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`[${prefix}] Email envoyé à ${to} - ID: ${info.messageId}`);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    logger.error(`[${prefix}] Erreur SMTP: ${error.message}`);
    res.status(500).json({ error: 'Erreur SMTP', details: error.message });
  }
}

// Routes dédiées pour chaque entité avec leur propre configuration SMTP
app.post('/send-cuspide', checkApiKey, (req, res) => sendEmail(req, res, 'CUSPIDE'));
app.post('/send-jak',     checkApiKey, (req, res) => sendEmail(req, res, 'JAK'));
app.post('/send-kelaj',   checkApiKey, (req, res) => sendEmail(req, res, 'KELAJ'));
app.post('/send-ridge',   checkApiKey, (req, res) => sendEmail(req, res, 'RIDGE'));

// Démarrage du serveur sur le port défini dans .env (ou 3000 par défaut)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`🚀 Serveur opérationnel sur http://localhost:${port}`);
});

// Fonction qui affiche l'heure actuelle chaque seconde
setInterval(() => {
  const now = new Date();
  const heureActuelle = now.toLocaleTimeString('fr-FR', { hour12: false });
  logger.info(`🕒 Heure actuelle : ${heureActuelle}`);
}, 1000);