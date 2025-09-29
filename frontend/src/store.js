// src/store.js
import { create } from 'zustand';

// Lighting Analysis Class
class LightingAnalysis {
  constructor() {
    this.furniture = [];
    this.lamps = [];
    this.shadowMap = [];
  }

  addFurniture(id, position, dimensions, modelType) {
    // Only track furniture types, not lamps
    if (modelType && !modelType.includes('lamp')) {
      this.furniture.push({ id, position, dimensions, modelType });
      this.calculateShadows();
    }
  }

  addLamp(id, position, modelType) {
    // Only track lamp types
    if (modelType && modelType.includes('lamp')) {
      this.lamps.push({ id, position, modelType });
      this.calculateShadows();
    }
  }

  moveObject(id, newPosition, modelType) {
    // Update furniture position
    const furniture = this.furniture.find(item => item.id === id);
    if (furniture) {
      furniture.position = newPosition;
    }

    // Update lamp position
    const lamp = this.lamps.find(item => item.id === id);
    if (lamp) {
      lamp.position = newPosition;
    }

    this.calculateShadows();
  }

  removeObject(id) {
    this.furniture = this.furniture.filter(item => item.id !== id);
    this.lamps = this.lamps.filter(item => item.id !== id);
    this.calculateShadows();
  }

  isLampInFrontOfFurniture(lamp, furniture) {
    const lampPos = lamp.position;
    const furnPos = furniture.position;
    const furnDims = furniture.dimensions;

    // Check if lamp is in front of furniture (simple 2D top-down check)
    const horizontalOverlap = 
      lampPos[0] >= furnPos[0] - furnDims[0]/2 && 
      lampPos[0] <= furnPos[0] + furnDims[0]/2;
      
    const verticalProximity = 
      Math.abs(lampPos[2] - furnPos[2]) < 2 && // Lamp is close in Z-axis (depth)
      lampPos[2] < furnPos[2]; // Lamp is in front of furniture

    return horizontalOverlap && verticalProximity;
  }

  createShadowArea(lamp, furniture) {
    const furnPos = furniture.position;
    const furnDims = furniture.dimensions;

    const shadow = {
      position: [
        furnPos[0],
        0.1, // Slightly above floor
        furnPos[2] + furnDims[2]/2 // Behind the furniture
      ],
      dimensions: [
        furnDims[0] * 1.5, // width
        0.1,               // height
        2                  // depth (shadow length)
      ],
      intensity: 0.6
    };

    this.shadowMap.push(shadow);
  }

  calculateShadows() {
    this.shadowMap = [];
    
    for (const lamp of this.lamps) {
      for (const furniture of this.furniture) {
        if (this.isLampInFrontOfFurniture(lamp, furniture)) {
          this.createShadowArea(lamp, furniture);
        }
      }
    }
  }

  getShadows() {
    return this.shadowMap;
  }

  clear() {
    this.furniture = [];
    this.lamps = [];
    this.shadowMap = [];
  }
}

export const useStore = create((set, get) => ({
  // STATE
  models: [],
  selectedObject: null,
  transformMode: 'translate',
  lightIntensity: 10,
  
  // NEW: Lighting Analysis State
  lightingAnalysis: new LightingAnalysis(),
  shadowMap: [],

  // ACTIONS
  setModels: (newModels) => {
    const lightingAnalysis = get().lightingAnalysis;
    lightingAnalysis.clear();
    
    // Add all models to lighting analysis
    newModels.forEach(model => {
      if (model.modelType && model.modelType.includes('lamp')) {
        lightingAnalysis.addLamp(model.instanceId, model.position, model.modelType);
      } else {
        lightingAnalysis.addFurniture(model.instanceId, model.position, model.scale, model.modelType);
      }
    });
    
    set({ 
      models: newModels, 
      selectedObject: null,
      shadowMap: lightingAnalysis.getShadows()
    });
  },
  
  addModel: (newModel) => set((state) => {
    const lightingAnalysis = state.lightingAnalysis;
    
    // Add to lighting analysis based on type
    if (newModel.modelType && newModel.modelType.includes('lamp')) {
      lightingAnalysis.addLamp(newModel.instanceId, newModel.position, newModel.modelType);
    } else {
      lightingAnalysis.addFurniture(newModel.instanceId, newModel.position, newModel.scale, newModel.modelType);
    }
    
    return {
      models: [...state.models, newModel],
      shadowMap: lightingAnalysis.getShadows()
    };
  }),
  
  deleteSelectedObject: () => set((state) => {
    if (!state.selectedObject) return state;
    
    const instanceId = state.selectedObject.userData.instanceId;
    const lightingAnalysis = state.lightingAnalysis;
    lightingAnalysis.removeObject(instanceId);
    
    return {
      models: state.models.filter(m => m.instanceId !== instanceId),
      selectedObject: null,
      shadowMap: lightingAnalysis.getShadows()
    };
  }),
  
  setSelectedObject: (object) => set({ selectedObject: object }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setLightIntensity: (intensity) => set({ lightIntensity: intensity }),

  updateModelTransform: (instanceId, newPosition, newRotation, newScale) => set((state) => {
    const lightingAnalysis = state.lightingAnalysis;
    
    // Find the model to get its type
    const model = state.models.find(m => m.instanceId === instanceId);
    if (model) {
      lightingAnalysis.moveObject(instanceId, newPosition, model.modelType);
    }
    
    return {
      models: state.models.map(model => 
        model.instanceId === instanceId 
          ? { ...model, position: newPosition, rotation: newRotation, scale: newScale } 
          : model
      ),
      shadowMap: lightingAnalysis.getShadows()
    };
  }),

  // NEW: Direct access to shadow map
  getShadowMap: () => {
    return get().shadowMap;
  },

  // NEW: Force shadow recalculation (useful for manual updates)
  recalculateShadows: () => set((state) => {
    const lightingAnalysis = state.lightingAnalysis;
    lightingAnalysis.calculateShadows();
    return {
      shadowMap: lightingAnalysis.getShadows()
    };
  })
}));