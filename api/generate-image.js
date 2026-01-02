/**
 * Vercel Endpoint - Generate Image (text-to-image)
 * Génère une image depuis un prompt avec API KIE.AI
 * Endpoint: /api/generate-image
 */
const { getFirestore, admin } = require('./_firebase');

// Styles prédéfinis avec leurs prompts
const STYLE_PROMPTS = {
  pixar: 'in Pixar 3D animation style, colorful, expressive characters, high quality CGI',
  manga: 'in Japanese manga style, black and white ink art, dynamic action lines, expressive eyes',
  anime: 'in anime style, vibrant colors, detailed shading, beautiful character design',
  cartoon: 'in modern cartoon style, bold outlines, flat colors, playful and fun',
  watercolor: 'in watercolor painting style, soft brushstrokes, dreamy colors, artistic',
  oilpainting: 'in classical oil painting style, rich textures, museum quality, renaissance art',
  sketch: 'in pencil sketch style, detailed linework, artistic shading, hand-drawn look',
  comic: 'in American comic book style, bold colors, dramatic shadows, superhero aesthetic',
  fantasy: 'in fantasy art style, magical atmosphere, ethereal lighting, epic composition',
  cyberpunk: 'in cyberpunk style, neon lights, futuristic cityscape, high-tech aesthetic',
  retro: 'in retro 80s style, vibrant neon colors, synthwave aesthetic, nostalgic vibe'
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, style, customPrompt, imageUrl } = req.body;

  if (!userId || !style || !imageUrl) {
    return res.status(400).json({ error: 'Missing userId, style or imageUrl' });
  }

  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Vérifier les quotas
    if (userData.subscriptionType === 'FREE' && userData.quotaRemaining <= 0) {
      return res.status(403).json({
        error: 'Quota exceeded',
        message: 'You have reached your weekly limit. Upgrade or watch an ad!'
      });
    }

    if (userData.subscriptionType === 'STANDARD' && userData.quotaRemaining <= 0) {
      return res.status(403).json({
        error: 'Quota exceeded',
        message: 'You have reached your weekly limit of 50 transformations.'
      });
    }

    // Construire le prompt
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.pixar;
    const basePrompt = customPrompt || 'transform this person';
    const fullPrompt = `${basePrompt}, ${stylePrompt}`;

    // Toujours utiliser nano-banana-edit (édition d'image)
    const model = 'google/nano-banana-edit';

    // Callback URL Vercel - utilise le host de la requête pour être dynamique
    const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;

    // Appeler KIE.AI
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        callBackUrl: callbackUrl,
        input: {
          prompt: fullPrompt,
          image_urls: [imageUrl],
          output_format: 'png',
          image_size: '1:1'
        }
      })
    });

    const kieResult = await kieResponse.json();

    if (kieResult.code !== 200) {
      return res.status(500).json({
        error: 'KIE.AI API error',
        details: kieResult.msg
      });
    }

    const taskId = kieResult.data.taskId;

    // Décrémenter le quota
    await userRef.update({
      quotaRemaining: admin.firestore.FieldValue.increment(-1)
    });

    // Sauvegarder la transformation en pending
    const transformationRef = db.collection('transformations').doc(taskId);
    await transformationRef.set({
      userId: userId,
      taskId: taskId,
      style: style,
      prompt: fullPrompt,
      originalImageUrl: imageUrl || null,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionTypeAtCreation: userData.subscriptionType
    });

    return res.status(200).json({
      success: true,
      taskId: taskId,
      message: 'Transformation started! Results will be available soon.',
      estimatedTime: '10-15 seconds'
    });

  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
