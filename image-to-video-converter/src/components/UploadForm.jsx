import React, { useState } from "react";

const UploadForm = () => {
  const [image, setImage] = useState(null);
  const [duration, setDuration] = useState(10);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("image", image);
    formData.append("duration", duration);

    try {
      const response = await fetch("http://localhost:5000/convert", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "converted_video.mp4";
        link.click();
        setMessage("Video created successfully!");
      } else {
        setMessage("Error creating video.");
      }
    } catch (error) {
      setMessage("An error occurred.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Image to Video Converter</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded">
        <div className="mb-4">
          <label className="block mb-2 text-gray-700">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-gray-700">Duration (seconds)</label>
          <input
            type="number"
            min="10"
            max="1800"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Convert
        </button>
      </form>
      {message && <p className="mt-4 text-green-500">{message}</p>}
    </div>
  );
};

export default UploadForm;
