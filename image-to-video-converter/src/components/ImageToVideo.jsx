import { useRef, useState } from "react";

export default function ImageToVideoConverter() {
  const [images, setImages] = useState([]);
  const [duration, setDuration] = useState(2);
  const canvasRef = useRef(null);

  const handleImageUpload = (event) => {
    const files = event.target.files;
    const imageArray = Array.from(files).map((file) => URL.createObjectURL(file));
    setImages(imageArray);
  };

  const handleConvertToVideo = () => {
    if (images.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream();
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks = [];

    let index = 0;
    const renderFrame = () => {
      if (index >= images.length) {
        recorder.stop();
        return;
      }
      const img = new Image();
      img.src = images[index];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        index++;
        setTimeout(renderFrame, duration * 1000);
      };
    };

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "output.webm";
      a.click();
    };

    recorder.start();
    renderFrame();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded shadow-lg">
      <h1 className="text-2xl font-bold">Image to Video Converter</h1>
      <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="p-2 border rounded" />
      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        className="p-2 border rounded"
        min="1"
      />
      <button onClick={handleConvertToVideo} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
        Convert to Video
      </button>
      <canvas ref={canvasRef} width="800" height="600" className="hidden"></canvas>
    </div>
  );
}
