declare module "imagetracerjs" {
  interface ImageTracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    colorsampling?: number;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    strokewidth?: number;
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
    desc?: boolean;
    [key: string]: unknown;
  }

  const ImageTracer: {
    imagedataToSVG(imageData: ImageData, options?: ImageTracerOptions): string;
    imageToSVG(url: string, callback: (svgStr: string) => void, options?: ImageTracerOptions): void;
    loadImage(url: string, callback: (canvas: HTMLCanvasElement) => void): void;
  };

  export default ImageTracer;
}
