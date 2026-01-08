export type LayerType = 'base' | 'overlay' | 'modal' | 'popover' | 'toast';

class ZIndexManager {
  private baseZIndex: number = 0;
  private layerZIndex: Record<LayerType, number> = {
    base: 0,
    overlay: 1000,
    modal: 1100,
    popover: 1200,
    toast: 1300,
  };

  generateId(layer: LayerType): string {
<<<<<<< HEAD
    return `${layer}-${Math.random().toString(36).slice(2, 8)}`;
=======
    // Use crypto for secure random ID generation
    const randomBytes = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 8); // Fallback for non-browser environments
    return `${layer}-${randomBytes}`;
>>>>>>> ca51ac36
  }

  registerLayer(id: string, layer: LayerType, _parentId?: string): number {
    // Simple strategy: return configured z-index for layer
    return this.get(layer);
  }

  unregisterLayer(_id: string): void {
    // No-op for now
  }

  get(layer: LayerType): number {
    return this.layerZIndex[layer] ?? this.baseZIndex;
  }
}

export const zIndexManager = new ZIndexManager();

