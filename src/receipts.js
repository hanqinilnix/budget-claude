// Long enough for the small print on a tall receipt to stay readable, at a few
// hundred KB instead of the several MB a phone photo takes.
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.8;

export async function shrinkReceiptImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; // JPEG has no transparency, which would turn black
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new Error('Could not encode the image');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
