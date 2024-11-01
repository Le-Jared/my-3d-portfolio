import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TubeGeometry } from 'three';

const ThreePortfolio = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    ball: THREE.Mesh;
    curve: THREE.CatmullRomCurve3;
    progress: number;
  }>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create the track curve
    const curvePoints = [
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(-5, 4, 5),
      new THREE.Vector3(0, 0, 10),
      new THREE.Vector3(5, -4, 5),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(5, 4, -5),
      new THREE.Vector3(0, 0, -10),
      new THREE.Vector3(-5, -4, -5),
      new THREE.Vector3(-10, 0, 0),
    ];

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    curve.closed = true;

    // Create the track
    const tubeGeometry = new TubeGeometry(curve, 100, 0.3, 16, true);
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.3,
    });
    const track = new THREE.Mesh(tubeGeometry, tubeMaterial);
    scene.add(track);

    // Create the ball
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.7,
      roughness: 0.3,
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    scene.add(ball);

    // Section markers
    const sections = [
      { position: new THREE.Vector3(-10, 2, 0), title: "About Me" },
      { position: new THREE.Vector3(0, 2, 10), title: "Projects" },
      { position: new THREE.Vector3(10, 2, 0), title: "Skills" },
      { position: new THREE.Vector3(0, 2, -10), title: "Contact" },
    ];

    sections.forEach(({ position }) => {
      const markerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const markerMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        metalness: 0.5,
        roughness: 0.5,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(position);
      scene.add(marker);
    });

    // Add grid for reference
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      ball,
      curve,
      progress: 0,
    };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;

      const { controls, renderer, scene, camera, ball, curve, progress } = sceneRef.current;

      // Update ball position
      sceneRef.current.progress = (progress + 0.001) % 1;
      const point = curve.getPoint(sceneRef.current.progress);
      ball.position.copy(point);

      // Get the next point to calculate direction
      const nextPoint = curve.getPoint((sceneRef.current.progress + 0.01) % 1);
      ball.lookAt(nextPoint);

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-0 left-0 p-4 text-white">
        <h1 className="text-3xl font-bold">3D Portfolio</h1>
        <p className="mt-2">Use mouse to orbit, zoom, and pan</p>
      </div>
    </div>
  );
};

export default ThreePortfolio;