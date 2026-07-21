import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export const SpatialVisualizer: React.FC<{ position: { x: number; y: number; z: number }; radius: number; active: boolean }> = ({ position, radius, active }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const soundRef = useRef<THREE.Mesh | null>(null);
  const orbitRef = useRef<THREE.Mesh | null>(null);
  const posRef = useRef(position);

  useEffect(() => { posRef.current = position; }, [position]);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(10, 10, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true, transparent: true, opacity: 0.5 }));
    scene.add(head);

    const sound = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
    scene.add(sound);
    soundRef.current = sound;

    const orbit = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.04, 16, 100), new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 }));
    orbit.rotation.x = Math.PI / 2;
    scene.add(orbit);
    orbitRef.current = orbit;

    const light = new THREE.PointLight(0xffaa00, 10, 50);
    scene.add(light);

    const animate = () => {
      requestAnimationFrame(animate);
      if (soundRef.current && orbitRef.current) {
        soundRef.current.position.lerp(new THREE.Vector3(posRef.current.x, posRef.current.y, posRef.current.z), 0.2);
        light.position.copy(soundRef.current.position);
        soundRef.current.scale.setScalar(active ? 1 + Math.sin(Date.now() * 0.01) * 0.3 : 0.4);
      }
      renderer.render(scene, camera);
    };
    animate();
    return () => { renderer.dispose(); containerRef.current?.removeChild(renderer.domElement); };
  }, []);

  useEffect(() => { if (orbitRef.current) orbitRef.current.scale.setScalar(radius / 5); }, [radius]);

  return <div ref={containerRef} className="w-full h-full" />;
};