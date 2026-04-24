import html2canvas from 'html2canvas';

export async function captureReceiptAsImage(
  element: HTMLElement,
): Promise<Blob | null> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: window.devicePixelRatio || 2,
  });

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}
