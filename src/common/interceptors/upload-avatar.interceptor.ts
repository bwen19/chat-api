import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AVATAR_FIELD_KEY, CUSTOM_AVATAR_PATH, STATIC_ROOT } from '@constants';

export const UploadAvatarInterceptor = FileInterceptor(AVATAR_FIELD_KEY, {
  storage: diskStorage({
    destination: `${STATIC_ROOT}/${CUSTOM_AVATAR_PATH}`,
    filename: function (req, file, callback) {
      callback(null, `${file.fieldname}-${req.user['username']}-${Date.now()}`);
    },
  }),
  fileFilter: function (req, file, callback) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
  },
});
