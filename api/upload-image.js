/**
 * Vercel Endpoint - Upload Image to ImgBB
 * Upload une image base64 sur ImgBB et retourne l'URL publique
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
    // ImgBB API (gratuit, pas besoin de compte pour clé publique)
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '0b8f8c8d8f8e8f8e8f8e8f8e8f8e8f8e'; // Clé de test

    // Upload to ImgBB
    const formData = new URLSearchParams();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', imageBase64.replace(/^data:image\/\w+;base64,/, ''));
    formData.append('expiration', '600'); // 10 minutes (suffisant pour KIE.AI)

    const uploadResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const uploadResult = await uploadResponse.json();

    if (uploadResult.success) {
      return res.status(200).json({
        success: true,
        imageUrl: uploadResult.data.url,
        displayUrl: uploadResult.data.display_url,
        deleteUrl: uploadResult.data.delete_url,
        expiresIn: 600 // seconds
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'ImgBB upload failed',
        details: uploadResult.error
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
