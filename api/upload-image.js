/**
 * Vercel Endpoint - Upload Image to ImgBB
 * Upload une image base64 sur ImgBB et retourne l'URL publique
 * IMPORTANT: Vous devez avoir une clé API ImgBB (gratuit)
 * Inscrivez-vous sur https://api.imgbb.com/ pour obtenir votre clé
 * Puis ajoutez IMGBB_API_KEY dans les variables d'environnement Vercel
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

  const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

  if (!IMGBB_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'IMGBB_API_KEY not configured',
      message: 'Please add IMGBB_API_KEY to Vercel environment variables. Get your free key at https://api.imgbb.com/'
    });
  }

  try {
    // Nettoyer le base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Créer FormData pour ImgBB
    const formData = new URLSearchParams();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Data);
    formData.append('expiration', '600'); // 10 minutes

    // Upload to ImgBB
    const uploadResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const uploadResult = await uploadResponse.json();

    if (uploadResult.success && uploadResult.data) {
      return res.status(200).json({
        success: true,
        imageUrl: uploadResult.data.url
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'ImgBB upload failed',
        details: uploadResult.error || uploadResult
      });
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
