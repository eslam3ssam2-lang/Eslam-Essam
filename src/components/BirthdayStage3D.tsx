import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Flower2, Sparkles } from 'lucide-react';
import { pickChapterCopy, UI_STRINGS } from '../i18n/translations.ts';
import type { ChapterCopyOverride, Language } from '../types/birthday.ts';
import { triggerCelebrationBurst } from './CelebrationCanvas.tsx';
import { useAudio } from '../context/AudioContext.tsx';

interface BirthdayStage3DProps {
  lang: Language;
  recipientName: string;
  age: number;
  petalsActive: boolean;
  onTogglePetals: () => void;
  chapterCopy?: ChapterCopyOverride;
}

type CameraPreset = 'overview' | 'lanterns' | 'pedestal';

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [0, 3.6, 8.2], target: [0, 1.3, 0] },
  lanterns: { pos: [3.8, 4.4, 5.2], target: [0, 2.3, 0] },
  pedestal: { pos: [-2.8, 2.2, 4.8], target: [0, 0.9, 0] },
};

const _vec3 = new THREE.Vector3();
const _dummy = new THREE.Object3D();

export function BirthdayStage3D({
  lang,
  recipientName,
  age,
  petalsActive,
  onTogglePetals,
  chapterCopy,
}: BirthdayStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const presetTargetRef = useRef<CameraPreset | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [controlsOpen, setControlsOpen] = useState(true);
  const [webglError, setWebglError] = useState(false);

  const t = UI_STRINGS[lang].stage3d;
  const copy = pickChapterCopy(
    chapterCopy,
    { kicker: t.kicker, title: t.title, subtitle: t.subtitle },
    lang,
  );
  const { playFanfare } = useAudio();

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    presetTargetRef.current = preset;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 520;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1E191E');
    scene.fog = new THREE.FogExp2('#1E191E', 0.045);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.5;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.addEventListener('start', () => {
      presetTargetRef.current = null;
    });

    // 3-point warm/romantic lighting rig
    const hemiLight = new THREE.HemisphereLight('#D9A5AE', '#1E191E', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#F5EBDD', 2.1);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight('#D9A5AE', 2.4, 18, 1.8);
    rimLight.position.set(-4.5, 4.5, -3.5);
    scene.add(rimLight);

    // Ground stage floor + soft radial contact shadow
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#292329',
      roughness: 0.65,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringGeo = new THREE.RingGeometry(2.6, 2.7, 64);
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: '#C5A46D',
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floorRing = new THREE.Mesh(ringGeo, goldMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.02;
    scene.add(floorRing);

    // Composite 3-12 part hero subject 1: Tiered Burgundy Velvet & Champagne Gold Keepsake Pedestal
    const pedestalGroup = new THREE.Group();
    const lathePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.85, 0),
      new THREE.Vector2(1.72, 0.18),
      new THREE.Vector2(1.45, 0.28),
      new THREE.Vector2(1.45, 0.62),
      new THREE.Vector2(1.18, 0.72),
      new THREE.Vector2(1.18, 1.05),
      new THREE.Vector2(0, 1.05),
    ];
    const velvetMat = new THREE.MeshStandardMaterial({
      color: '#5C3140',
      roughness: 0.85,
      metalness: 0.08,
    });
    const pedestalBody = new THREE.Mesh(new THREE.LatheGeometry(lathePoints, 48), velvetMat);
    pedestalBody.castShadow = !isSoftwareGl;
    pedestalBody.receiveShadow = true;
    pedestalGroup.add(pedestalBody);

    const trimHeights = [0.22, 0.68, 1.05];
    const trimRadii = [1.66, 1.38, 1.18];
    trimHeights.forEach((h, i) => {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(trimRadii[i], 0.04, 16, 48), goldMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = h;
      pedestalGroup.add(collar);
    });

    // Velvet top cushion + golden crown emblem
    const cushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.02, 0.14, 36),
      new THREE.MeshStandardMaterial({ color: '#713F50', roughness: 0.9, metalness: 0.05 }),
    );
    cushion.position.y = 1.12;
    pedestalGroup.add(cushion);

    const crestBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 24), goldMat);
    crestBase.position.y = 1.26;
    pedestalGroup.add(crestBase);

    const gemMat = new THREE.MeshPhysicalMaterial({
      color: '#D9A5AE',
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
    });
    const gemCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), gemMat);
    gemCore.position.y = 1.78;
    gemCore.castShadow = !isSoftwareGl;
    pedestalGroup.add(gemCore);

    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 14, 48), goldMat);
    haloRing.position.y = 1.78;
    haloRing.rotation.x = Math.PI * 0.35;
    pedestalGroup.add(haloRing);

    scene.add(pedestalGroup);

    // Composite 3-12 part hero subjects 2: Floating Silk Balloons with golden knots & curved ribbons
    const balloonColors = ['#D9A5AE', '#713F50', '#C5A46D', '#A76A77', '#E3C692'];
    const balloons: { group: THREE.Group; baseY: number; phase: number; speed: number }[] = [];
    const balloonProfile = [
      new THREE.Vector2(0, -0.45),
      new THREE.Vector2(0.08, -0.42),
      new THREE.Vector2(0.28, -0.2),
      new THREE.Vector2(0.38, 0.08),
      new THREE.Vector2(0.34, 0.32),
      new THREE.Vector2(0.18, 0.46),
      new THREE.Vector2(0, 0.5),
    ];
    const balloonGeo = new THREE.LatheGeometry(balloonProfile, 28);

    const ribbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.47, 0),
      new THREE.Vector3(0.06, -0.82, 0.04),
      new THREE.Vector3(-0.05, -1.2, -0.03),
      new THREE.Vector3(0.03, -1.55, 0.02),
    ]);
    const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 20, 0.012, 8, false);

    for (let i = 0; i < 6; i++) {
      const bGroup = new THREE.Group();
      const angle = (i / 6) * Math.PI * 2 + 0.4;
      const radius = 2.6 + (i % 2) * 0.7;
      const baseY = 2.5 + (i % 3) * 0.55;
      bGroup.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);

      const shell = new THREE.Mesh(
        balloonGeo,
        new THREE.MeshPhysicalMaterial({
          color: balloonColors[i % balloonColors.length],
          roughness: 0.25,
          metalness: 0.22,
          clearcoat: 0.85,
        }),
      );
      shell.castShadow = !isSoftwareGl;
      bGroup.add(shell);

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), goldMat);
      knot.position.y = -0.46;
      bGroup.add(knot);

      const ribbon = new THREE.Mesh(ribbonGeo, goldMat);
      bGroup.add(ribbon);

      scene.add(bGroup);
      balloons.push({ group: bGroup, baseY, phase: i * 1.1, speed: 0.9 + (i % 3) * 0.2 });
    }

    // Composite 3-12 part hero subjects 3: Orbiting Golden Star Lanterns
    const lanterns: { group: THREE.Group; radius: number; angle: number; y: number }[] = [];
    const lanternCoreMat = new THREE.MeshStandardMaterial({
      color: '#F5EBDD',
      emissive: '#C5A46D',
      emissiveIntensity: 1.4,
      roughness: 0.3,
    });
    for (let i = 0; i < 4; i++) {
      const lGroup = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshStandardMaterial({
        color: '#C5A46D',
        metalness: 0.9,
        roughness: 0.2,
        wireframe: true,
      }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), lanternCoreMat);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 6), goldMat);
      cap.position.y = 0.22;
      lGroup.add(frame, core, cap);
      scene.add(lGroup);
      lanterns.push({ group: lGroup, radius: 2.1, angle: (i / 4) * Math.PI * 2, y: 2.1 + (i % 2) * 0.4 });
    }

    // Instanced rising celebration sparkles
    const sparkleCount = 60;
    const sparkleMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.045, 0),
      new THREE.MeshStandardMaterial({
        color: '#C5A46D',
        emissive: '#C5A46D',
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
      sparkleCount,
    );
    sparkleMesh.frustumCulled = false;
    const sparkleSeeds = Array.from({ length: sparkleCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 1.2 + Math.random() * 3.8,
      y: Math.random() * 5.2,
      speed: 0.2 + Math.random() * 0.35,
      scale: 0.65 + Math.random() * 0.7,
    }));
    scene.add(sparkleMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        gemCore.rotation.y += delta * 0.7;
        gemCore.position.y = 1.78 + Math.sin(elapsed * 1.6) * 0.08;
        haloRing.rotation.z += delta * 0.5;

        for (const b of balloons) {
          b.group.position.y = b.baseY + Math.sin(elapsed * b.speed + b.phase) * 0.16;
          b.group.rotation.z = Math.sin(elapsed * 0.7 + b.phase) * 0.05;
        }

        for (const l of lanterns) {
          l.angle += delta * 0.28;
          l.group.position.set(
            Math.cos(l.angle) * l.radius,
            l.y + Math.sin(elapsed * 1.4 + l.angle) * 0.15,
            Math.sin(l.angle) * l.radius,
          );
          l.group.rotation.y = -l.angle;
        }

        for (let i = 0; i < sparkleCount; i++) {
          const s = sparkleSeeds[i];
          s.y += delta * s.speed;
          if (s.y > 5.4) s.y = 0.2;
          _dummy.position.set(
            Math.cos(s.angle + elapsed * 0.12) * s.radius,
            s.y,
            Math.sin(s.angle + elapsed * 0.12) * s.radius,
          );
          _dummy.rotation.y = elapsed + i;
          _dummy.scale.setScalar(s.scale);
          _dummy.updateMatrix();
          sparkleMesh.setMatrixAt(i, _dummy.matrix);
        }
        sparkleMesh.instanceMatrix.needsUpdate = true;
      }

      if (presetTargetRef.current) {
        const preset = CAMERA_PRESETS[presetTargetRef.current];
        _vec3.set(...preset.pos);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _vec3.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _vec3.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _vec3.z, 4.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, preset.target[0], 4.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, preset.target[1], 4.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, preset.target[2], 4.5, delta);

        if (camera.position.distanceTo(_vec3) < 0.04) {
          presetTargetRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section
      id="section-stage3d"
      className="relative bg-[#1E191E] py-14 sm:py-20 border-b border-[#C5A46D]/20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#C5A46D] tracking-wide">{copy.kicker}</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5EBDD] sm:text-4xl text-balance">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#F5EBDD]/75">{copy.subtitle}</p>
          </div>
          <p className="text-xs text-[#F5EBDD]/60">{t.dragHint}</p>
        </div>

        <div className="relative h-[420px] sm:h-[520px] w-full overflow-hidden rounded-2xl border border-[#C5A46D]/30 bg-[#1E191E] shadow-2xl">
          {webglError ? (
            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#292329] to-[#1E191E] p-8 text-center">
              <Sparkles className="mb-3 h-10 w-10 text-[#C5A46D]" />
              <p className="font-display text-2xl text-[#F5EBDD]">{t.fallbackLabel}</p>
              <p className="mt-2 text-sm text-[#F5EBDD]/75">
                {recipientName} · <span className="tabular-nums">{age}</span>
              </p>
            </div>
          ) : (
            <div ref={mountRef} className="h-full w-full" />
          )}

          {/* Unified collapsible bottom control dock inside the 3D stage (no backdrop-filter over WebGL) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center px-3">
            <button
              type="button"
              onClick={() => setControlsOpen((prev) => !prev)}
              className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-[#C5A46D]/35 bg-[#1E191E]/95 px-3 py-1 text-[11px] font-medium text-[#F5EBDD]/90 hover:text-[#C5A46D]"
            >
              {controlsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              <span>{controlsOpen ? t.hideControls : t.showControls}</span>
            </button>

            {controlsOpen && (
              <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-[#C5A46D]/35 bg-[#1E191E]/95 p-1.5 shadow-lg">
                {(['overview', 'lanterns', 'pedestal'] as CameraPreset[]).map((preset) => {
                  const label =
                    preset === 'overview'
                      ? t.viewOverview
                      : preset === 'lanterns'
                        ? t.viewLanterns
                        : t.viewPedestal;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activePreset === preset
                          ? 'bg-[#713F50] text-[#F5EBDD]'
                          : 'text-[#F5EBDD]/80 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}

                <div className="h-4 w-px bg-[#C5A46D]/25 mx-1 hidden sm:block" aria-hidden="true" />

                <button
                  type="button"
                  onClick={() => {
                    triggerCelebrationBurst('fireworks');
                    playFanfare();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-3 py-1.5 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F] transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t.triggerFireworks}</span>
                </button>

                <button
                  type="button"
                  onClick={onTogglePetals}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    petalsActive
                      ? 'bg-[#D9A5AE] text-[#292329] font-semibold'
                      : 'border border-[#D9A5AE]/40 text-[#D9A5AE] hover:bg-[#D9A5AE]/10'
                  }`}
                >
                  <Flower2 className="h-3.5 w-3.5" />
                  <span>{t.togglePetals}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
