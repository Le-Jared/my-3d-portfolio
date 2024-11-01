import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TubeGeometry } from 'three';

const ThreePortfolio = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<number>(0.001);
  const isPlayingRef = useRef<boolean>(true);
  const directionRef = useRef<number>(1);
  const [controlState, setControlState] = useState({
    speed: 0.001,
    isPlaying: true,
    direction: 1
  });
  
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    ball: THREE.Mesh;
    curve: THREE.CatmullRomCurve3;
    progress: number;
    animationFrameId?: number;
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

    // Create the track curve with elevated points
    const curvePoints = [
      new THREE.Vector3(-10, 2, 0),
      new THREE.Vector3(-5, 6, 5),
      new THREE.Vector3(0, 2, 10),
      new THREE.Vector3(5, 4, 5),
      new THREE.Vector3(10, 2, 0),
      new THREE.Vector3(5, 6, -5),
      new THREE.Vector3(0, 2, -10),
      new THREE.Vector3(-5, 4, -5),
      new THREE.Vector3(-10, 2, 0),
    ];

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    curve.closed = true;

    // Create two parallel tracks
    const trackOffset = 0.5;
    const createRail = (offset: number) => {
      const railPoints = [];
      const divisions = 100;
      
      for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t);
        const normal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
        railPoints.push(point.clone().add(binormal.multiplyScalar(offset)));
      }
      
      const railCurve = new THREE.CatmullRomCurve3(railPoints);
      const tubeGeometry = new TubeGeometry(railCurve, 100, 0.2, 8, true);
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.3,
      });
      return new THREE.Mesh(tubeGeometry, tubeMaterial);
    };

    const leftRail = createRail(-trackOffset);
    const rightRail = createRail(trackOffset);
    scene.add(leftRail);
    scene.add(rightRail);

    // Create the ball
    const ballGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.7,
      roughness: 0.3,
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    scene.add(ball);

    // Add supports between rails
    const addSupports = () => {
      for (let i = 0; i < 50; i++) {
        const t = i / 50;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t);
        const normal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
        
        const supportGeometry = new THREE.CylinderGeometry(0.05, 0.05, trackOffset * 2);
        const supportMaterial = new THREE.MeshStandardMaterial({
          color: 0x444444,
          metalness: 0.8,
          roughness: 0.3,
        });
        const support = new THREE.Mesh(supportGeometry, supportMaterial);
        
        support.position.copy(point);
        support.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), binormal);
        scene.add(support);

        // Add vertical support to the ground
        const heightSupport = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, point.y),
          new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        heightSupport.position.set(point.x, point.y / 2, point.z);
        scene.add(heightSupport);
      }
    };

    addSupports();

    // Add grid for reference
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // Initialize ball position
    const initialPoint = curve.getPoint(0);
    ball.position.copy(initialPoint);

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

      const { controls, renderer, scene, camera, ball, curve } = sceneRef.current;

      if (isPlayingRef.current) {
        // Update ball position with direction
        let newProgress = sceneRef.current.progress + (speedRef.current * directionRef.current);
        
        // Handle wrapping around
        if (newProgress > 1) newProgress = 0;
        if (newProgress < 0) newProgress = 1;
        
        sceneRef.current.progress = newProgress;
        
        const point = curve.getPoint(newProgress);
        ball.position.copy(point);

        // Get the next point to calculate direction based on current direction
        const nextPoint = curve.getPoint((newProgress + (0.01 * directionRef.current) + 1) % 1);
        ball.lookAt(nextPoint);
      }

      controls.update();
      renderer.render(scene, camera);
      sceneRef.current.animationFrameId = requestAnimationFrame(animate);
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
      if (sceneRef.current?.animationFrameId) {
        cancelAnimationFrame(sceneRef.current.animationFrameId);
      }
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []); // Empty dependency array

  const handleSpeedChange = (newSpeed: number) => {
    speedRef.current = newSpeed;
    setControlState(prev => ({ ...prev, speed: newSpeed }));
  };

  const handlePlayingChange = () => {
    isPlayingRef.current = !isPlayingRef.current;
    setControlState(prev => ({ ...prev, isPlaying: isPlayingRef.current }));
  };

  const handleDirectionChange = (newDirection: number) => {
    directionRef.current = newDirection;
    setControlState(prev => ({ ...prev, direction: newDirection }));
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-0 left-0 p-4 bg-black bg-opacity-50 rounded-lg m-4">
        <h1 className="text-3xl font-bold text-white">3D Portfolio</h1>
        <p className="mt-2 text-white">Use mouse to orbit, zoom, and pan</p>
        
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePlayingChange}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {controlState.isPlaying ? 'Stop' : 'Start'}
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDirectionChange(-1)}
                className={`px-4 py-2 text-white rounded transition-colors ${
                  controlState.direction === -1 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                Backward
              </button>
              <button
                onClick={() => handleDirectionChange(1)}
                className={`px-4 py-2 text-white rounded transition-colors ${
                  controlState.direction === 1 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                Forward
              </button>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-white">Speed:</span>
              <input
                type="range"
                min="0.0001"
                max="0.005"
                step="0.0001"
                value={controlState.speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-48"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSpeedChange(Math.max(0.0001, controlState.speed - 0.0001))}
                className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Slower
              </button>
              <button
                onClick={() => handleSpeedChange(Math.min(0.005, controlState.speed + 0.0001))}
                className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Faster
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreePortfolio;