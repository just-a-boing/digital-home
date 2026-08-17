"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  OrbitControls,
  Stars,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useRef } from "react";
import * as THREE from "three";

function House() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;

    group.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.15) * 0.025;
  });

  return (
    <group ref={group}>
      {/* Main house */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[4.8, 2.4, 3.5]} />
        <meshStandardMaterial color="#b8aa98" roughness={0.85} />
      </mesh>

      {/* Roof */}
      <mesh
        position={[0, 3, 0]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <coneGeometry args={[3.7, 2, 4]} />
        <meshStandardMaterial color="#403a38" roughness={0.9} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.7, 1.78]}>
        <boxGeometry args={[0.8, 1.6, 0.12]} />
        <meshStandardMaterial color="#3b3029" roughness={0.7} />
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

      {/* Small chimney */}
      <mesh position={[1.35, 4, -0.5]}>
        <boxGeometry args={[0.6, 1.3, 0.6]} />
        <meshStandardMaterial color="#625954" roughness={0.9} />
      </mesh>
    </group>
  );
}

function FloatingHeart() {
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

function Scene() {
  return (
    <>
      <color attach="background" args={["#101014"]} />

      <fog attach="fog" args={["#101014", 8, 22]} />

      <ambientLight intensity={0.35} />

      <directionalLight
        position={[4, 8, 5]}
        intensity={1.2}
      />

      <pointLight
        position={[0, 2, 3]}
        intensity={8}
        distance={8}
        color="#ffb86b"
      />

      <House />

      <FloatingHeart />

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

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 2.1}
        minAzimuthAngle={-Math.PI / 8}
        maxAzimuthAngle={Math.PI / 8}
      />
    </>
  );
}

export default function HomeScene() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{
          position: [7, 4.5, 8],
          fov: 40,
        }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}