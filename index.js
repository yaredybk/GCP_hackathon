require('dotenv').config();
const express = require('express');
const { TranslationServiceClient } = require('@google-cloud/translate');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const PORT = process.env.PORT || 8080;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;

// --- Google Cloud Translation Setup ---
// Make sure you have authenticated with Google Cloud CLI:
// `gcloud auth application-default login`
// Or set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
const translationClient = new TranslationServiceClient();

/**
 * Detects the language of a given text.
 * @param {string} text The text to detect the language for.
 * @returns {Promise<string|null>} The BCP-47 language code (e.g., "am", "en") or null on error.
 */
async function detectLanguage(text) {
  if (!GCP_PROJECT_ID) {
    console.error("GCP_PROJECT_ID is not set. Please check your .env file.");
    // Placeholder logic: Default to English if detection is not configured.
    return 'en';
  }
  try {
    const request = {
      parent: `projects/${GCP_PROJECT_ID}/locations/global`,
      content: text,
      mimeType: 'text/plain', // Mime types: text/plain, text/html
    };

    const [response] = await translationClient.detectLanguage(request);
    
    if (response.languages && response.languages.length > 0) {
      // The most likely language is the first one in the list.
      const languageCode = response.languages[0].languageCode;
      console.log(`Detected language: ${languageCode}`);
      return languageCode;
    }
    return 'en'; // Default to English if detection is uncertain
  } catch (error) {
    console.error('Error in language detection:', error);
    return null;
  }
}

/**
 * Translates text to a target language.
 * @param {string} text The text to translate.
 * @param {string} targetLanguageCode The BCP-47 code of the target language (e.g., "en").
 * @returns {Promise<string|null>} The translated text or null on error.
 */
async function translateText(text, targetLanguageCode) {
  if (!GCP_PROJECT_ID) {
    console.error("GCP_PROJECT_ID is not set. Please check your .env file.");
    return text; // Return original text if not configured
  }
  try {
    const request = {
      parent: `projects/${GCP_PROJECT_ID}/locations/global`,
      contents: [text],
      mimeType: 'text/plain',
      targetLanguageCode,
    };

    const [response] = await translationClient.translateText(request);
    const translatedText = response.translations[0].translatedText;
    console.log(`Translated text to ${targetLanguageCode}: ${translatedText}`);
    return translatedText;
  } catch (error) {
    console.error('Error in translation:', error);
    return null;
  }
}

// --- API Endpoint ---
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).send({ error: 'Message is required.' });
  }

  // 1. & 2. Detect the user's input language
  const originalLanguage = await detectLanguage(message);

  if (originalLanguage === null) {
    return res.status(500).send({ error: 'Failed to detect language. Please check server logs for details.' });
  }

  // 3. If input is NOT English -> translate to English
  let messageForAI = message;
  if (originalLanguage && originalLanguage !== 'en') {
    messageForAI = await translateText(message, 'en');
  }

  // --- Placeholder for next steps ---
  // 4. Send `messageForAI` to the Gemini API or another AI model.
  // 5. Get the response in English.
  // 6. If originalLanguage was not 'en', translate the AI response back.
  // 7. Send the final, translated response to the user.

  console.log(`Original Language: ${originalLanguage}`);
  console.log(`Message for AI (in English): ${messageForAI}`);

  // For now, we'll just echo back the processed message
  res.status(200).send({ 
    original_language: originalLanguage,
    message_for_ai: messageForAI,
    reply: `Processed message: "${messageForAI}"` // This will be replaced by the AI's response
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});