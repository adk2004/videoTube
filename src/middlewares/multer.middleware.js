import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // cb(null, file.fieldname + "-" + uniqueSuffix);
    // this format of storing filename is generally preffered to avoid 
    // duplication but we will use the one below for  simplicicty
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage, });
