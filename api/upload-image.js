/**
 * Vercel Endpoint - Upload Image to Catbox
 * Upload une image base64 sur Catbox.moe et retourne l'URL publique
 * Catbox.moe = 100% gratuit, pas de clé API, pas de limite
 * Endpoint: /api/upload-image
 */

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64' });
  }

  try {
    // Convertir base64 en buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Créer un FormData pour Catbox
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', imageBuffer, {
      filename: `image-${Date.now()}.png`,
      contentType: 'image/png'
    });

    // Upload to Catbox.moe (gratuit, anonyme, pas de clé API)
    const uploadResponse = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const imageUrl = await uploadResponse.text();

    // Catbox retourne directement l'URL en texte
    if (imageUrl && imageUrl.startsWith('https://files.catbox.moe/')) {
      return res.status(200).json({
        success: true,
        imageUrl: imageUrl.trim()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Catbox upload failed',
        details: imageUrl
      });
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
