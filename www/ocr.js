let result = null;

function importPhoto() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.click();
}

async function loadJSON() {
  try {
    const response = await fetch("./interaction.json");
    const json = await response.json();
    
    // Attach explicitly to window so the HTML script can read it
    window.data = json; 
    console.log("JSON Data loaded successfully:", window.data);
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

async function initOCR() {
  await loadJSON();

  const fileInput = document.getElementById('fileInput');
  if (!fileInput) return;

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const itemsList = window.data?.items;
    if (!itemsList) {
      console.error("JSON data is not ready yet.");
      return;
    }

    try {
      const image = await loadImage(file);
      
      const imgWidth = image.width || image.naturalWidth;
      const imgHeight = image.height || image.naturalHeight;

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

      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => console.log(`[Tesseract] ${m.status}`)
      });

      result = await worker.recognize(canvas);
      await worker.terminate();

      const txt = result?.data?.text || "";
      console.log("Tesseract result:", txt);

      const searchInput = document.getElementById("site-search");

      if (txt && searchInput) {
        for (const member of itemsList) {
          // Supports both string arrays and object arrays { name: "..." }
          const itemName = typeof member === 'string' ? member : member?.name;
          if (!itemName) continue;

          if (txt.toLowerCase().includes(itemName.toLowerCase())) {
            console.log("Found match: ", itemName);
            searchInput.value = itemName;
            searchInput.dispatchEvent(new Event('input'));
            return;
          }
        }
        
        searchInput.value = "No Matches";
        searchInput.dispatchEvent(new Event('input'));
      }
    } catch (e) {
      console.error("Error during OCR: ", e);
    }
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}