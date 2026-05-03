import * as multer from 'multer';

export const multerConfig: multer.Options = {
  storage: multer.memoryStorage(), // En mémoire
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};
