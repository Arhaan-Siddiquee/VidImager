const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.post("/convert", upload.single("image"), (req, res) => {
  const { duration } = req.body; 
  const imagePath = req.file.path;
  const outputVideoPath = `output_${Date.now()}.mp4`;

  ffmpeg()
    .input(imagePath)
    .inputOptions([`-loop 1`])
    .outputOptions([`-t ${duration}`, "-c:v libx264", "-pix_fmt yuv420p"])
    .save(outputVideoPath)
    .on("end", () => {
      res.download(outputVideoPath, () => {
        fs.unlinkSync(imagePath);
        fs.unlinkSync(outputVideoPath);
      });
    })
    .on("error", (err) => {
      res.status(500).send("Error converting image to video");
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
