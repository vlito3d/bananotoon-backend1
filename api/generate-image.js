/**
 * Vercel Endpoint - Generate Image (text-to-image)
 * Génère une image depuis un prompt avec API KIE.AI
 * Endpoint: /api/generate-image
 */
const { getFirestore, admin } = require('./_firebase');

// Master prompts pour transformer la référence dans le style choisi
const STYLE_PROMPTS = {
  neutral: 'high quality professional photography, preserve all facial features and details, maintain original composition and style, realistic rendering, natural lighting',
  pixar: 'turn this character into Pixar 3D animation style, preserve facial features and identity, smooth CGI rendering, expressive eyes, vibrant colors, Disney-Pixar quality, professional character design, maintain pose and composition',
  manga: 'transform this character into Japanese manga style, preserve facial features and expression, black and white ink art, dynamic screentone shading, bold linework, expressive manga eyes, detailed hair strands, professional manga artist quality',
  anime: 'convert this character into anime style, keep facial structure and identity, vibrant cel-shaded colors, detailed anime shading, beautiful character design, sharp linework, expressive anime eyes, studio-quality animation style',
  cartoon: 'turn this character into modern cartoon style, preserve character likeness, bold clean outlines, flat vibrant colors, simplified features, playful expression, professional cartoon illustration',
  watercolor: 'transform this portrait into watercolor painting, maintain facial features and expression, soft watercolor brushstrokes, flowing colors, artistic paper texture, dreamy atmospheric painting, traditional art style',
  oilpainting: 'convert this portrait into classical oil painting, preserve facial structure and likeness, rich oil paint textures, masterful brushwork, renaissance painting technique, museum-quality portrait art, deep colors and lighting',
  sketch: 'turn this portrait into detailed pencil sketch, keep facial features accurate, professional sketching technique, varied pencil strokes, artistic shading and hatching, hand-drawn illustration quality, graphite on paper look',
  comic: 'transform this character into American comic book style, preserve character identity, bold ink outlines, vibrant comic colors, dramatic cel shading, superhero comic aesthetic, professional comic art quality',
  fantasy: 'convert this character into fantasy art style, maintain facial features, magical ethereal atmosphere, epic fantasy painting, dramatic lighting, mystical elements, professional fantasy illustration, rich detailed rendering',
  cyberpunk: 'turn this character into cyberpunk style, keep character likeness, neon lighting effects, futuristic tech elements, cyberpunk aesthetic, dramatic sci-fi atmosphere, high-tech urban background, professional digital art',
  retro: 'transform this character into retro 80s style, preserve facial features, vibrant neon colors, synthwave aesthetic, vintage 80s vibe, nostalgic retro art style, bold graphic design, professional retro illustration'
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, style, customPrompt, imageUrl, imageUrls, mode, image_size, isPro, duration, resolution } = req.body;

  if (!userId || !style) {
    return res.status(400).json({ error: 'Missing userId or style' });
  }

  // VIDEO GENERATION MODE (style === "video")
  if (style === 'video') {
    if (!imageUrl && !imageUrls) {
      return res.status(400).json({ error: 'imageUrl or imageUrls required for video generation' });
    }

    const videoImageUrl = imageUrl || (imageUrls && imageUrls[0]);
    const videoDuration = duration || "5";
    const videoResolution = resolution || "1080p";
    const videoPrompt = customPrompt || 'A cinematic video transformation of this image with smooth camera movement';

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
          message: 'You have reached your weekly limit.'
        });
      }

      // Callback URL Vercel
      const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
      const callbackUrl = `https://${host}/api/kie-callback`;

      // Choose model based on isPro flag
      const videoModel = isPro ? "wan/2-6-image-to-video" : "wan/2-5-image-to-video";

      console.log('=== VIDEO GENERATION ===');
      console.log('userId:', userId);
      console.log('imageUrl:', videoImageUrl);
      console.log('prompt:', videoPrompt);
      console.log('duration:', videoDuration);
      console.log('resolution:', videoResolution);
      console.log('isPro:', isPro);
      console.log('model:', videoModel);

      // Appeler KIE.AI wan/2-5 (normal) ou wan/2-6 (pro)
      const videoInput = {
        prompt: videoPrompt,
        image_url: videoImageUrl, // wan/2-5 uses image_url instead of image_urls
        duration: videoDuration,
        resolution: videoResolution
      };

      // wan/2-5 supports prompt expansion
      if (!isPro) {
        videoInput.enable_prompt_expansion = true;
      }

      const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KIE_API_KEY}`
        },
        body: JSON.stringify({
          model: videoModel,
          callBackUrl: callbackUrl,
          input: videoInput
        })
      });

      const kieResult = await kieResponse.json();

      if (kieResult.code !== 200) {
        console.error('KIE.AI video error:', kieResult);
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
        type: 'video',
        prompt: videoPrompt,
        originalImageUrl: videoImageUrl,
        duration: videoDuration,
        resolution: videoResolution,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionTypeAtCreation: userData.subscriptionType
      });

      console.log(`✅ Video generation started - taskId: ${taskId}`);

      return res.status(200).json({
        success: true,
        taskId: taskId,
        message: 'Video generation started! This may take 30-60 seconds.',
        estimatedTime: '30-60 seconds'
      });

    } catch (error) {
      console.error('❌ Video generation error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // IMAGE GENERATION MODE (normal flow)
  // Mode can be 'generate' (text-to-image), 'edit' (image-to-image), or 'pro' (premium generation)
  const generationMode = mode || (imageUrl || imageUrls ? 'edit' : 'generate');
  const usePro = isPro === true || mode === 'pro';

  if (generationMode === 'edit' && !imageUrl && !imageUrls) {
    return res.status(400).json({ error: 'imageUrl or imageUrls required for edit mode' });
  }

  // Utiliser image_size depuis req.body, défaut 1:1
  const imageSize = image_size || '1:1';

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

    // Construire le master prompt
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.pixar;

    let fullPrompt;
    if (generationMode === 'generate') {
      // Text-to-image: génération pure depuis description
      const userPrompt = customPrompt || 'a portrait of a person';
      fullPrompt = `create ${userPrompt}, ${stylePrompt}`;
    } else {
      // Image-to-image: transformation de la référence
      const userDirective = customPrompt ? `, ${customPrompt}` : '';
      // Le style prompt contient déjà "turn this character into..."
      fullPrompt = `${stylePrompt}${userDirective}`;
    }

    // Choisir le modèle selon le mode
    let model;
    if (usePro) {
      model = 'nano-banana-pro'; // Mode PRO
    } else {
      model = generationMode === 'generate' ? 'google/nano-banana' : 'google/nano-banana-edit';
    }

    // Callback URL Vercel - utilise le host de la requête pour être dynamique
    const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;

    // Préparer les URLs d'images pour le mode edit
    const imageUrlsArray = imageUrls || (imageUrl ? [imageUrl] : null);

    // DEBUG LOG
    console.log('=== BACKEND GENERATE-IMAGE ===');
    console.log('userId:', userId);
    console.log('style:', style);
    console.log('mode:', generationMode);
    console.log('isPro:', usePro);
    console.log('model:', model);
    console.log('image_size:', imageSize);
    console.log('imageUrlsArray:', imageUrlsArray);
    console.log('customPrompt:', customPrompt);
    console.log('FINAL PROMPT:', fullPrompt);
    console.log('==============================');

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
        input: usePro ? {
          prompt: fullPrompt,
          aspect_ratio: imageSize, // Pro model uses aspect_ratio
          resolution: '1K',
          output_format: 'png'
        } : (generationMode === 'edit' ? {
          prompt: fullPrompt,
          image_urls: imageUrlsArray,
          output_format: 'png',
          image_size: imageSize
        } : {
          prompt: fullPrompt,
          output_format: 'png',
          image_size: imageSize
        })
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
