// Global type declarations for zoom functions
declare global {
  interface Window {
    setZoom: (zoom: number) => void;
    getZoom: () => number;
  }
}

export {};
