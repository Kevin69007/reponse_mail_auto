// logger.js
import winston from 'winston';

// Format personnalisé : [timestamp] niveau: message
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Configuration du logger Winston
const logger = winston.createLogger({
  level: 'info', // Niveau minimum à logger (peut être modifié selon l’environnement)
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(), // Pour couleurs dans le terminal
    logFormat
  ),
  transports: [
    new winston.transports.Console(), // Affichage console
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }), // Erreurs
    new winston.transports.File({ filename: 'logs/combined.log' }) // Tous les logs
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }) // Crash du serveur
  ]
});

export default logger;
