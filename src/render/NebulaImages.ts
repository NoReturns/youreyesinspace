/** Share one local image request and decode between the sprite atlas and volumetric clouds. */
const images = new Map<string, Promise<HTMLImageElement | null>>();

export function loadNebulaImage(file: string): Promise<HTMLImageElement | null> {
  let image = images.get(file);
  if (!image) {
    image = new Promise((resolve) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => resolve(null);
      element.src = `${import.meta.env.BASE_URL}nebulae/${file}.jpg`;
    });
    images.set(file, image);
  }
  return image;
}
