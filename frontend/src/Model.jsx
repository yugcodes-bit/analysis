// src/Model.jsx - FIXED WITH ERROR HANDLING
import { useGLTF } from '@react-three/drei';
import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export function Model({ modelData, setSelectedObject, lightIntensity }) {
  const [modelError, setModelError] = useState(false);
  const groupRef = useRef();
  const pointLightRef = useRef();

  // Load the model with error handling
  const { scene, error } = useGLTF(modelData.models.file_url, true, (error) => {
    console.error("Failed to load model:", error);
    setModelError(true);
  });

  const clonedScene = useMemo(() => {
    if (!scene || modelError) {
      // Return a simple fallback geometry if model fails to load
      const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
      const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      return fallbackMesh;
    }
    
    const cloned = scene.clone();
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene, modelError]);

  // Calculate the height of the lamp to position the light correctly
  useEffect(() => {
    if (modelData.models.category === 'lamp' && pointLightRef.current && clonedScene) {
      try {
        const box = new THREE.Box3().setFromObject(clonedScene);
        const height = box.max.y - box.min.y;
        
        // Position the light at the top of the lamp
        pointLightRef.current.position.y = height * 0.8;
        
        console.log("💡 Lamp light positioned at height:", height * 0.8);
      } catch (error) {
        console.error("Error calculating lamp height:", error);
        // Default position if calculation fails
        pointLightRef.current.position.y = 2;
      }
    }
  }, [clonedScene, modelData.models.category]);

  // If there's an error loading the model, show a fallback
  if (modelError) {
    return (
      <group
        ref={groupRef}
        position={modelData.position}
        rotation={modelData.rotation}
        scale={modelData.scale}
      >
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={groupRef}
      position={modelData.position}
      rotation={modelData.rotation}
      scale={modelData.scale}
      userData={{
        instanceId: modelData.instanceId,
        category: modelData.models.category,
        isLamp: modelData.models.category === 'lamp'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (modelData.models.category === 'room_base') {
          setSelectedObject(null);
        } else {
          setSelectedObject(groupRef.current);
        }
      }}
    >
      <primitive object={clonedScene} />
      
      {modelData.models.category === 'lamp' && (
        <pointLight
          ref={pointLightRef}
          color={"#FFDDB3"}
          intensity={lightIntensity}
          distance={10}
          decay={1}
          castShadow
          position={[0, 2, 0]} // Default position
        />
      )}
    </group>
  );
}