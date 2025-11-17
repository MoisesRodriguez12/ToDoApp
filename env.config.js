// Configuración para cargar variables de entorno
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};
