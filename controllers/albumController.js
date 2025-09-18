// controllers/albumController.js
const Album = require('../models/Album');
const Portfolio = require('../models/Portfolio');
/**
 * Helper to attach full media objects from Portfolio subdocs
 */
async function enrichAlbumWithMedia(album) {
  const portfolio = await Portfolio.findById(album.portfolio);
  if (!portfolio) return album;

  // Find thumbnail object
  const thumbObj = portfolio.portfolio.id(album.thumbnail) || null;

  // Find media objects
  const mediaObjs = album.media.map(id => portfolio.portfolio.id(id)).filter(Boolean);

  return {
    _id: album._id,
    planner: album.planner,
    portfolio: album.portfolio,
    title: album.title,
    description: album.description,
    eventDate: album.eventDate,
    location: album.location,
    thumbnail: thumbObj,
    media: mediaObjs,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
  };
}

/**
 * Create a new album
 */
exports.createAlbum = async (req, res) => {
  console.log('[Album] createAlbum called by', req.user._id);
  try {
    const { title, description, eventDate, location, thumbnailId, mediaIds } = req.body;
    const plannerId = req.user._id;

    // 1. Load planner's portfolio
    const portfolio = await Portfolio.findOne({ user: plannerId });
    if (!portfolio) {
      console.log('[Album] Portfolio not found for user', plannerId);
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Validate thumbnail + media items
    const validIds = portfolio.portfolio.map(item => item._id.toString());
    if ((thumbnailId && !validIds.includes(thumbnailId)) ||
        (mediaIds && !mediaIds.every(id => validIds.includes(id)))) {
      console.log('[Album] Invalid media selection:', { thumbnailId, mediaIds });
      return res.status(400).json({ message: 'Invalid media selection' });
    }

    // 3. Create album record
    const newAlb = await Album.create({
      planner: plannerId,
      portfolio: portfolio._id,
      title,
      description,
      eventDate,
      location,
      thumbnail: thumbnailId || null,
      media: mediaIds || []
    });

    // 4. Enrich and return
    const enriched = await enrichAlbumWithMedia(newAlb.toObject());
    console.log('[Album] Created', enriched._id);
    return res.status(201).json(enriched);
  } catch (err) {
    console.error('[Album] createAlbum error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all albums for a user
 */
exports.getAlbumsByUser = async (req, res) => {
  const userId = req.params.userId;
  console.log('[Album] getAlbumsByUser called for', userId);
  try {
    const rawAlbums = await Album.find({ planner: userId }).sort({ eventDate: -1 });
    const enrichedList = await Promise.all(rawAlbums.map(a => enrichAlbumWithMedia(a.toObject())));
    return res.json(enrichedList);
  } catch (err) {
    console.error('[Album] getAlbumsByUser error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get album by ID
 */
exports.getAlbumById = async (req, res) => {
  const albumId = req.params.id;
  console.log('[Album] getAlbumById called for', albumId);
  try {
    const raw = await Album.findById(albumId);
    if (!raw) return res.status(404).json({ message: 'Album not found' });
    const enriched = await enrichAlbumWithMedia(raw.toObject());
    return res.json(enriched);
  } catch (err) {
    console.error('[Album] getAlbumById error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update an album
 */
exports.updateAlbum = async (req, res) => {
  const albumId = req.params.id;
  const plannerId = req.user._id;
  console.log('[Album] updateAlbum called:', albumId);
  try {
    const album = await Album.findOne({ _id: albumId, planner: plannerId });
    if (!album) return res.status(404).json({ message: 'Album not found' });

    const portfolio = await Portfolio.findOne({ user: plannerId });
    const validIds = portfolio.portfolio.map(item => item._id.toString());

    const { title, description, eventDate, location, thumbnailId, mediaIds } = req.body;
    if ((thumbnailId && !validIds.includes(thumbnailId)) ||
        (mediaIds && !mediaIds.every(id => validIds.includes(id)))) {
      return res.status(400).json({ message: 'Invalid media selection' });
    }

    Object.assign(album, {
      title: title ?? album.title,
      description: description ?? album.description,
      eventDate: eventDate ?? album.eventDate,
      location: location ?? album.location,
      thumbnail: thumbnailId ?? album.thumbnail,
      media: mediaIds ?? album.media
    });
    await album.save();

    const enriched = await enrichAlbumWithMedia(album.toObject());
    return res.json(enriched);
  } catch (err) {
    console.error('[Album] updateAlbum error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete an album
 */
exports.deleteAlbum = async (req, res) => {
  const albumId = req.params.id;
  const plannerId = req.user._id;
  console.log('[Album] deleteAlbum called:', albumId);
  try {
    const album = await Album.findOneAndDelete({ _id: albumId, planner: plannerId });
    if (!album) return res.status(404).json({ message: 'Album not found' });
    return res.json({ message: 'Album deleted' });
  } catch (err) {
    console.error('[Album] deleteAlbum error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all albums belonging to a specific portfolio
 */
exports.getAlbumsByPortfolio = async (req, res) => {
  const portfolioId = req.params.portfolioId;
  console.log('[Album] getAlbumsByPortfolio called for', portfolioId);
  try {
    const albums = await Album.find({ portfolio: portfolioId })
      .sort({ eventDate: -1 })
      .populate('thumbnail')
      .populate('media');
    res.json(albums);
  } catch (err) {
    console.error('[Album] getAlbumsByPortfolio error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
