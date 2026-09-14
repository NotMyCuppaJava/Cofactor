
function importPhoto(){
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
}

function initOCR() {
  document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("File selected: ", file.name, "Type: ", file.type);

    try {
      // Decode image natively without external HEIC libraries
      const image = await loadImage(file);
      console.log("Loaded image successfully");

      const imgWidth = image.width || image.naturalWidth;
      const imgHeight = image.height || image.naturalHeight;

      // Upscale dimensions and add white padding for Tesseract
      const padding = 20;
      const scaleFactor = Math.max(1, 1200 / imgWidth);
      const scaledWidth = imgWidth * scaleFactor;
      const scaledHeight = imgHeight * scaleFactor;

      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth + (padding * 2);
      canvas.height = scaledHeight + (padding * 2);

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, padding, padding, scaledWidth, scaledHeight);
      console.log("Canvas drawn");

      // Initialize Tesseract worker with progress logger
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.progress !== undefined) {
            const percent = Math.round(m.progress * 100);
            console.log(`[Tesseract] ${m.status}: ${percent}%`);
          } else {
            console.log(`[Tesseract] ${m.status}`);
          }
        }
      });

      const result = await worker.recognize(canvas);
      await worker.terminate();

      console.log("Tesseract result: ", result.data.text);
    } catch (e) {
      console.log("Error during OCR: ", e);
    }
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image into browser context.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}