const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const improveImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      res.status(400).json({ error });
    }
    const timestamp = Date.now();

    if (req.file) {
      const originalName = req.file.originalname;
      const nameWithoutSpaces = originalName.split(' ').join('_');
      const name = `images/${timestamp}-${nameWithoutSpaces}.webp`;
      const buffer = req.file.buffer;

      sharp(buffer)
        .webp({ quality: 80 })
        .toFile(name, (err) => {
          if (err) {
            // Supprimer l'image non compressée en cas d'erreur
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error });

          }
          req.file.buffer = null;
          req.file.name = name;
          next();
        });
    } else {
      next();
    }
  });
};

module.exports = improveImage;