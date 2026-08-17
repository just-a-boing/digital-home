"use client";

import { useFrame } from "@react-three/fiber";
import { Environment, Float, Stars } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
} from "@react-three/postprocessing";
import { useRef } from "react";
import * as THREE from "three";

function House() {
  const house = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!house.current) return;

    // Extremely subtle movement so the scene feels alive.
    house.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.15) * 0.025;
  });

  return (
    <group ref={house}>
      {/* Main house */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[4.8, 2.4, 3.5]} />
        <meshStandardMaterial
          color="#b8aa98"
          roughness={0.85}
        />
      </mesh>

      {/* Roof */}
      <mesh
        position={[0, 3, 0]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <coneGeometry args={[3.7, 2, 4]} />
        <meshStandardMaterial
          color="#403a38"
          roughness={0.9}
        />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.7, 1.78]}>
        <boxGeometry args={[0.8, 1.6, 0.12]} />
        <meshStandardMaterial
          color="#3b3029"
          roughness={0.7}
        />
      </mesh>

      {/* Left window */}
      <mesh position={[-1.45, 1.5, 1.78]}>
        <boxGeometry args={[0.9, 0.9, 0.1]} />
        <meshStandardMaterial
          color="#ffdca8"
          emissive="#ffb85c"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Right window */}
      <mesh position={[1.45, 1.5, 1.78]}>
        <boxGeometry args={[0.9, 0.9, 0.1]} />
        <meshStandardMaterial
          color="#ffdca8"
          emissive="#ffb85c"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Chimney */}
      <mesh position={[1.35, 4, -0.5]}>
        <boxGeometry args={[0.6, 1.3, 0.6]} />
        <meshStandardMaterial
          color="#625954"
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

function Heart() {
  return (
    <Float
      speed={1}
      rotationIntensity={0.15}
      floatIntensity={0.3}
    >
      <mesh position={[0, 5.3, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color="#b84c5a"
          emissive="#7c2634"
          emissiveIntensity={1}
        />
      </mesh>
    </Float>
  );
}

function Ground() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
    >
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        color="#161618"
        roughness={1}
      />
    </mesh>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} />

      <directionalLight
        position={[4, 8, 5]}
        intensity={1.2}
      />

      {/* Warm light coming from the house */}
      <pointLight
        position={[0, 2, 3]}
        intensity={8}
        distance={8}
        color="#ffb86b"
      />

      {/* Soft moonlight */}
      <directionalLight
        position={[-5, 8, -6]}
        intensity={0.5}
        color="#b8c7ff"
      />
    </>
  );
}

export default function Scene() {
  return (
    <>
      <color
        attach="background"
        args={["#101014"]}
      />

      <fog
        attach="fog"
        args={["#101014", 8, 22]}
      />

      <SceneLighting />

      <Ground />

      <House />

      <Heart />

      <Stars
        radius={40}
        depth={20}
        count={1500}
        factor={1.2}
        saturation={0}
        fade
        speed={0.15}
      />

      <Environment preset="night" />

      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}