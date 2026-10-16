import './style.css';
import { Matrix3, Quaternion, Vector3 } from 'three';
import { Engine } from './core/Engine';
import { TimeSystem } from './core/TimeSystem';
import { Universe, catalogIndexOf, type StarId } from './core/Universe';
import type { StarSystem } from './core/StarSystem';
import { CelestialBody } from './core/CelestialBody';
import { StarCatalog } from './data/StarCatalog';
import { LightPulse } from './render/TourEffects';
import { BodyRenderer, type BodyView } from './render/BodyRenderer';
import { BodyPoints } from './render/BodyPoints';
import { OrbitLines } from './render/OrbitLines';
import { StarPoints } from './render/StarPoints';
import { ProcStarPoints } from './render/ProcStarPoints';
import { GalaxySprites } from './render/GalaxySprites';
import { LandmarkSprites } from './render/LandmarkSprites';
import { NebulaClouds } from './render/NebulaClouds';
import { GalaxyCloud } from './render/GalaxyCloud';
import { FarUniverse, localFade } from './galaxy/FarUniverse';
import { Belts } from './render/Belts';
import { SkyGrid } from './render/SkyGrid';
import { Overlay, type StarSelectionScreen } from './render/Overlay';
import type { NamedStarScreen } from './render/StarPoints';
import { Input } from './input/Input';
import { CameraController } from './camera/CameraController';
import { ReachVoyageDirector, REACH_ALPHA_DESTINATION_ID, REACH_PRODUCTION_ROUTE, reachPreviewRoute } from './reach/ReachVoyageDirector';
import { destinationRef, destinationSystem, reachPilotStarAppearance, reachStarVisualDrift, REACH_PROXIMA_PILOT } from './reach/ReachDestinations';
import { ReachCountdownOverlay, readCountdownContract } from './reach/ReachCountdownOverlay';
import { ReachScaleComparison, scalePreviewEnabled } from './reach/ReachScaleComparison';
import { ReachOdometerOverlay, readOdometerContract } from './reach/ReachOdometer';
import { reachInfoOpacity, reachInfoPlacement, reachInfoTarget, type ReachInfoSide } from './reach/ReachInfoCard';
import { ReachPanoramaSync, readReachPanorama, reachCompositionTarget } from './reach/ReachPanorama';
import { LocalStorageReachJourneyStore, REACH_PROXIMA_PILOT_KEY, inspectReachJourneyStore, saveReachJourney, type ReachJourneyState, type ReachJourneyStore } from './reach/JourneyState';
import { ReachTiming } from './reach/ReachTiming';
import { ReachArrivalTrace } from './reach/ReachArrivalTrace';
import { suppressProximaPlanetMeshes } from './reach/ReachPlanetMeshIsolation';
import { ALPHA_A_INDEX, ALPHA_B_INDEX, ALPHA_BARY_ID, ALPHA_SYSTEM_ID,
  alphaPointDirection, createAlphaCentauriPreviewSystem } from './reach/ReachAlphaCentauri';
import { preparePlanetResources } from './reach/ReachPlanetResourcePreparation';
import { PerseveranceSurfacePreview, marsPreviewDaylightJd } from './reach/PerseveranceSurfacePreview';
import { UI, type UIHost } from './ui/UI';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './ui/Settings';
import { DAY_S, DEG, J2000_JD, PARSEC_KM } from './core/constants';
import { starLightColor } from './astro/stellar';
import { fmtDuration, fmtLightYears } from './ui/format';
import { _, applyDom, initI18n } from './i18n';
import { Missions, type ActiveMission } from './core/Missions';
import { TrajectoryLines } from './render/TrajectoryLines';
import { readReachVisualAssets } from './reach/ReachVisualAssets';
import { TourPlayer, type SurfacePin, type TourOverrides } from './core/TourPlayer';
import type { MissionPlan } from './astro/mission';

const IDENTITY = new Matrix3();
/** Flight time of a tour cue's hop (overview and back): quick, so the demo fits in one sentence */
const TOUR_HOP_S = 1.6;
/** auto-orbit speed (rad/s) of the opening backdrop */
const BACKDROP_ORBIT = 0.03;
const REACH_MODE = new URLSearchParams(window.location.search).get('reach') === '1';
const REACH_FLICKER = import.meta.env.DEV && REACH_MODE
  && new URLSearchParams(window.location.search).get('reachFlicker') === '1';
const REACH_PILOT = import.meta.env.DEV && REACH_MODE
  && new URLSearchParams(window.location.search).get('reachPilot') === 'proxima';
const REACH_PREVIEW_ID = import.meta.env.DEV && REACH_MODE
  ? new URLSearchParams(window.location.search).get('reachPreview') : null;
const REACH_INSPECT_ID = import.meta.env.DEV && REACH_MODE
  ? new URLSearchParams(window.location.search).get('reachInspect') : null;
const REACH_INSPECT_FIXTURES = new Set([
  'voyager-proxima', 'proxima-alpha', 'alpha-establish', 'alpha-cross',
  'alpha-a', 'alpha-b', 'alpha-final', 'alpha-inbound', 'vega-turn', 'earth-return',
]);
if (REACH_INSPECT_ID && !REACH_INSPECT_FIXTURES.has(REACH_INSPECT_ID))
  throw new Error(`Unknown Reach inspection checkpoint: ${REACH_INSPECT_ID}`);
const REACH_PREVIEW_ROUTE = REACH_PREVIEW_ID ? reachPreviewRoute(REACH_PREVIEW_ID) : null;
if (REACH_PREVIEW_ID && !REACH_PREVIEW_ROUTE) throw new Error(`Unknown Reach preview stop: ${REACH_PREVIEW_ID}`);
const REACH_ROUND_TRIP_PREVIEW = REACH_PREVIEW_ROUTE?.id === 'preview:woh-tarantula';
const REACH_ALPHA_PREVIEW = REACH_PREVIEW_ROUTE?.id === 'preview:alpha-centauri';
const REACH_SGRA_PREVIEW = REACH_PREVIEW_ROUTE?.id === 'preview:sgra';
const REACH_PREVIEW_STAR_ID = REACH_PREVIEW_ROUTE?.stops[1]?.ref?.kind === 'star'
  ? REACH_PREVIEW_ROUTE.stops[1].ref.starId : null;
const REACH_STAR_ENCOUNTER_ID = REACH_ALPHA_PREVIEW ? ALPHA_SYSTEM_ID
  : REACH_PREVIEW_ROUTE ? REACH_PREVIEW_STAR_ID
  : (REACH_PILOT ? 'c64548' : null);
const REACH_TRACE = REACH_STAR_ENCOUNTER_ID === 'c64548'
  && new URLSearchParams(window.location.search).get('reachTrace') === '1';
const REACH_TRACE_FRESH = REACH_TRACE && new URLSearchParams(window.location.search).get('reachFresh') === '1';
const REACH_NO_CORONA_BLEND = REACH_STAR_ENCOUNTER_ID !== null
  && new URLSearchParams(window.location.search).get('reachNoCoronaBlend') === '1';
const REACH_NO_PLANET_MESHES = REACH_STAR_ENCOUNTER_ID !== null
  && new URLSearchParams(window.location.search).get('reachNoPlanetMeshes') === '1';
const REACH_SHOW_PLANET_MESHES = REACH_STAR_ENCOUNTER_ID !== null
  && new URLSearchParams(window.location.search).get('reachShowPlanetMeshes') === '1';
const REACH_HIDE_ENCOUNTER_PLANETS = REACH_STAR_ENCOUNTER_ID !== null
  && (!REACH_SHOW_PLANET_MESHES || REACH_NO_PLANET_MESHES);
if (REACH_TRACE) (window as Window & { __reachArrivalTrace?: boolean }).__reachArrivalTrace = true;
const REACH_SURFACE_PREVIEW = import.meta.env.DEV && REACH_MODE
  && new URLSearchParams(window.location.search).get('reachSurface') === 'perseverance';
if (REACH_SURFACE_PREVIEW && (new URLSearchParams(window.location.search).get('panorama') === '1'
  || (window as Window & { __reachPanorama?: unknown }).__reachPanorama))
  throw new Error('Perseverance surface preview requires a standalone development browser');
const REACH_ROUTE = REACH_PREVIEW_ROUTE ?? (REACH_PILOT ? REACH_PROXIMA_PILOT : REACH_PRODUCTION_ROUTE);
const REACH_TIMING_MODE = REACH_PREVIEW_ROUTE ? 'preview'
  : import.meta.env.DEV && new URLSearchParams(window.location.search).get('timing') === 'test'
    ? 'test' : 'production';
class App implements UIHost {
  readonly universe: Universe;
  readonly time = new TimeSystem();
  readonly settings: Settings = REACH_MODE ? { ...DEFAULT_SETTINGS } : loadSettings();
  readonly engine: Engine;
  readonly starPoints: StarPoints;
  readonly procPoints: ProcStarPoints;
  readonly galaxySprites: GalaxySprites;
  readonly farUniverse: FarUniverse;
  readonly farSprites: GalaxySprites[];
  readonly clouds = new Map<number, GalaxyCloud>();
  readonly bodies: BodyRenderer;
  readonly points: BodyPoints;
  readonly orbits: OrbitLines;
  readonly belts: Belts;
  readonly grid: SkyGrid;
  readonly overlay: Overlay;
  readonly input: Input;
  readonly camera: CameraController;
  readonly reach: ReachVoyageDirector | null;
  private readonly surfacePreview: PerseveranceSurfacePreview | null;
  private readonly reachCountdown: ReachCountdownOverlay | null;
  private readonly reachOdometer: ReachOdometerOverlay | null;
  private readonly reachScale: ReachScaleComparison | null;
  private alphaMarkers: HTMLDivElement[] = [];
  private alphaDiagnostics: HTMLPreElement | null = null;
  private readonly panorama = REACH_MODE ? readReachPanorama() : null;
  private readonly panoramaSync = this.panorama ? new ReachPanoramaSync(this.panorama) : null;
  private lastPanoramaSequence = -1;
  private compositionShiftX = 0;
  private compositionInitialized = false;
  private readonly reachStore: ReachJourneyStore | null = REACH_MODE && !REACH_FLICKER
    && (!REACH_PREVIEW_ROUTE || REACH_ROUND_TRIP_PREVIEW) && !REACH_SURFACE_PREVIEW && !REACH_INSPECT_ID
    && this.panorama?.isPrimaryDisplay !== false
    ? new LocalStorageReachJourneyStore(REACH_ROUND_TRIP_PREVIEW
      ? 'the-reach:journey:preview-woh-tarantula:v1'
      : REACH_PILOT ? REACH_PROXIMA_PILOT_KEY : undefined) : null;
  private lastReachSave = performance.now();
  private reachCheckpointWritable = true;
  private readonly arrivalTrace = REACH_TRACE
    ? new ReachArrivalTrace(REACH_NO_CORONA_BLEND, REACH_HIDE_ENCOUNTER_PLANETS) : null;
  private planetPreparation: AbortController | null = null;
  readonly ui: UI;
  selected: CelestialBody | null = null;
  selectedStar: StarId | null = null;
  selectedGalaxy: number | null = null;
  /** selected deep-sky landmark (index into universe.landmarks) when nothing else is selected */
  selectedLandmark: number | null = null;
  readonly landmarkSprites: LandmarkSprites;
  readonly nebulaClouds: NebulaClouds;
  readonly missions: Missions;
  readonly trajectories: TrajectoryLines;
  readonly tours: TourPlayer;
  /** render settings forced by the running tour (empty when none) */
  private tourOverrides: TourOverrides = {};
  /** labelled surface feature the overlay points at (tours) */
  private surfacePin: SurfacePin | null = null;
  private readonly pinScreen = { dir: new Vector3(), label: '', alpha: 1, visible: false };
  /** tour size comparison: a true-scale stand-in of `ref` kept at the screen-right of `beside` */
  private ghost: { body: CelestialBody; ref: CelestialBody; beside: CelestialBody; alpha: number; leaving: boolean } | null = null;
  private pulse: LightPulse | null = null;
  /** camera offset from the followed vehicle, kept across frame switches */
  private readonly followOffset = new Vector3();
  private followOffsetValid = false;
  uiVisible = true;
  private wantScreenshot = false;
  private last = performance.now();
  private readonly camPosTmp = new Vector3();
  private readonly camPc = new Vector3();
  private readonly camForward = new Vector3();
  private readonly sunColor = new Vector3(1, 1, 1);
  private starLuminosity = 1;
  private reachInfoSide: ReachInfoSide | null = null;
  private frameCheckAcc = 0;
  private readonly sgraFrameIntervals: number[] = [];
  private sgraDiagnostics: HTMLPreElement | null = null;
  private sgraLastDiagnostic = 0;
  private galaxyCheckAcc = 1;
  private galaxyBoost = 0;
  private readonly maxPointPx: number;
  private readonly starSel: StarSelectionScreen = { name: '', dir: new Vector3() };

  constructor(catalog: StarCatalog, diagnosticJourney: ReachJourneyState | null = null) {
    if (this.arrivalTrace) {
      (window as Window & { __reachArrivalReport?: () => string }).__reachArrivalReport =
        () => this.arrivalTrace!.report();
    }
    const sceneCanvas = document.getElementById('scene') as HTMLCanvasElement;
    const overlayCanvas = document.getElementById('overlay') as HTMLCanvasElement;
    if (this.arrivalTrace) {
      sceneCanvas.addEventListener('webglcontextlost', () => this.arrivalTrace!.event('webgl-context-lost'));
      sceneCanvas.addEventListener('webglcontextrestored', () => this.arrivalTrace!.event('webgl-context-restored'));
    }
    this.engine = new Engine(sceneCanvas);
    if (this.panorama) this.engine.setPanorama(this.panorama);
    const scene = this.engine.scene;
    const gl = this.engine.renderer.getContext();
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | number[];
    this.maxPointPx = Math.max(32, Math.min(256, (range?.[1] ?? 64) / this.engine.pixelRatio));

    this.universe = new Universe(catalog,
      REACH_MODE ? createAlphaCentauriPreviewSystem(catalog) : null);
    let savedJourney = REACH_PREVIEW_ROUTE || REACH_SURFACE_PREVIEW ? null : diagnosticJourney;
    if (this.reachStore) {
      const stored = inspectReachJourneyStore(this.reachStore, REACH_ROUTE, (id) => {
        const stop = REACH_ROUTE.stops.find((candidate) => candidate.id === id);
        if (stop) {
          const ref = destinationRef(stop);
          if (ref.kind === 'landmark') return !!this.universe.landmark(ref.landmarkId);
          const system = this.universe.system(ref.kind === 'star' ? ref.starId : ref.systemId);
          return !!(ref.kind === 'star' ? system.star : system.get(ref.bodyId));
        }
        if (this.universe.get(id) || this.universe.system('c0').get(id)) return true;
        if (id === ALPHA_BARY_ID || id === `s${ALPHA_A_INDEX}-star`
          || id === `s${ALPHA_B_INDEX}-star`)
          return !!this.universe.system(ALPHA_SYSTEM_ID).get(id);
        return REACH_ROUTE.stops.some((candidate) => {
          const ref = destinationRef(candidate);
          return ref.kind === 'star' && this.universe.system(ref.starId).star?.id === id;
        });
      });
      if (!savedJourney && !REACH_TRACE_FRESH) savedJourney = stored.state;
      this.reachCheckpointWritable = stored.canWrite;
      if (!stored.canWrite) console.warn('Reach checkpoint was not replaced because it could not be restored');
    }
    if (savedJourney) {
      this.time.setRate(savedJourney.simulation.rate);
      this.time.jd = savedJourney.simulation.jd;
      if (savedJourney.frame.starId !== this.universe.current.starId)
        this.universe.switchTo(savedJourney.frame.starId, this.time.jd, this.time.t);
    } else if (REACH_ROUND_TRIP_PREVIEW || REACH_SGRA_PREVIEW) {
      this.universe.switchTo(destinationSystem(REACH_ROUTE.stops[0]), this.time.jd, this.time.t);
    }
    // Evaluate once so orbital elements exist before building renderers
    this.universe.update(this.time.jd, this.time.t);
    if (REACH_SURFACE_PREVIEW) {
      const mars = this.universe.get('mars');
      const rover = this.universe.get('perseverance');
      if (!mars || !rover) throw new Error('Perseverance surface preview catalogue is incomplete');
      const daylightJd = marsPreviewDaylightJd(this.time.jd, mars.displayRotationHours, (jd) => {
        this.universe.update(jd, (jd - J2000_JD) * DAY_S);
        return new Vector3().subVectors(rover.position, mars.position).normalize()
          .dot(new Vector3().subVectors(this.universe.star.position, mars.position).normalize());
      });
      this.time.jd = daylightJd;
      this.universe.update(this.time.jd, this.time.t);
    }

    this.galaxySprites = new GalaxySprites(this.universe.galaxies, scene, this.maxPointPx);
    this.landmarkSprites = new LandmarkSprites(this.universe.landmarks, scene);
    this.nebulaClouds = new NebulaClouds(this.universe.landmarks, scene, this.maxPointPx);
    this.nebulaClouds.onReady = () => this.landmarkSprites.setCloudHandover(true);
    this.farUniverse = new FarUniverse();
    this.farSprites = this.farUniverse.tiers.map((t) => {
      const s = new GalaxySprites(t, scene, this.maxPointPx, t.spec.boostMag);
      s.setFade(0);
      return s;
    });
    this.starPoints = new StarPoints(catalog, scene);
    this.procPoints = new ProcStarPoints(this.universe.procStars, scene);
    this.grid = new SkyGrid(scene);
    this.belts = new Belts(scene);
    this.orbits = new OrbitLines(scene);
    this.bodies = new BodyRenderer(scene, this.engine.renderer.capabilities.getMaxAnisotropy(),
      REACH_MODE ? readReachVisualAssets() : undefined);
    this.points = new BodyPoints(scene);
    this.overlay = new Overlay(overlayCanvas);
    this.reachScale = scalePreviewEnabled(import.meta.env.DEV, REACH_MODE, REACH_PREVIEW_ID,
      new URLSearchParams(window.location.search).get('reachScale'), this.panorama?.isPrimaryDisplay !== false)
      ? new ReachScaleComparison(overlayCanvas) : null;
    this.input = new Input(sceneCanvas, !REACH_MODE);
    this.camera = new CameraController(this.universe);
    this.trajectories = new TrajectoryLines(scene);
    this.missions = new Missions(this.universe, {
      spawned: (m, b) => this.onMissionSpawned(m, b),
      despawned: (m, b) => this.onMissionDespawned(m, b),
      frameSwitch: (m, systemId) => this.onMissionFrameSwitch(m, systemId),
      arrived: (m) => this.onMissionArrived(m),
    });
    this.tours = new TourPlayer(this);
    this.tours.onEnd = (why) => {
      this.ui.showToast(why === 'finished' ? _('Tur tamamlandı') : _('Tur bitirildi'), 2400);
      // a finished tour hands back to the circling backdrop; an interrupted one leaves the
      // camera where the visitor sent it
      if (why === 'finished') this.showBackdrop(true);
    };
    this.ui = new UI(this, !REACH_MODE);

    this.loadSystemRenderables(this.universe.current);
    this.universe.onSystemChange((sys) => this.loadSystemRenderables(sys));

    this.resizeOverlay();
    window.addEventListener('resize', () => this.resizeOverlay());
    window.visualViewport?.addEventListener('resize', () => { this.engine.resize(); this.resizeOverlay(); });

    // Opening view: the planetary system as a slowly circling backdrop until the visitor picks a
    // destination (and again after a tour has finished)
    if (REACH_SURFACE_PREVIEW) {
      const mars = this.universe.get('mars');
      const rover = this.universe.get('perseverance');
      if (!mars || !rover) throw new Error('Perseverance surface preview catalogue is incomplete');
      this.surfacePreview = new PerseveranceSurfacePreview(mars, rover, this.camera, scene);
      this.reach = null;
      this.reachCountdown = null;
      this.reachOdometer = null;
      this.uiVisible = false;
      Object.defineProperty(window, '__reachSurfacePreviewStatus', {
        value: () => this.surfacePreview!.status, configurable: false,
      });
    } else if (REACH_MODE && this.panorama?.isPrimaryDisplay === false) {
      this.surfacePreview = null;
      this.reach = null;
      this.reachCountdown = null;
      this.reachOdometer = null;
      this.uiVisible = false;
    } else if (REACH_MODE) {
      this.surfacePreview = null;
      this.ui.enableReachInfo();
      this.reach = new ReachVoyageDirector(this.universe, this.camera, this.time,
        new ReachTiming(REACH_TIMING_MODE), savedJourney, () => this.checkpointReach(), REACH_ROUTE,
        this.engine.camera.fov * Math.PI / 180);
      const countdown = readCountdownContract(true);
      this.reachCountdown = countdown ? new ReachCountdownOverlay(this.reach,
        REACH_ALPHA_PREVIEW ? 'top-centre' : countdown.position) : null;
      const odometer = readOdometerContract(true);
      this.reachOdometer = odometer ? new ReachOdometerOverlay(this.reach,
        REACH_ALPHA_PREVIEW ? 'top-centre' : odometer.position) : null;
      this.reachCountdown?.update(performance.now());
      this.reachOdometer?.update(performance.now());
      if (REACH_SGRA_PREVIEW) {
        this.sgraDiagnostics = document.createElement('pre');
        this.sgraDiagnostics.id = 'reach-sgra-diagnostics';
        this.sgraDiagnostics.hidden = true;
        document.body.appendChild(this.sgraDiagnostics);
      }
      if (REACH_ALPHA_PREVIEW) {
        Object.defineProperty(window, '__reachAlphaStatus', {
          value: () => this.alphaPreviewStatus(), configurable: false,
        });
        this.alphaDiagnostics = document.createElement('pre');
        this.alphaDiagnostics.id = 'reach-alpha-diagnostics';
        this.alphaDiagnostics.hidden = true;
        document.body.appendChild(this.alphaDiagnostics);
      }
      this.uiVisible = false;
      window.addEventListener('pagehide', () => this.checkpointReach());
      document.addEventListener('visibilitychange', () => {
        this.arrivalTrace?.event(`visibility:${document.visibilityState}`);
        if (document.hidden) this.checkpointReach();
      });
      this.checkpointReach();
    } else {
      this.surfacePreview = null;
      this.reach = null;
      this.reachCountdown = null;
      this.reachOdometer = null;
      this.showBackdrop(false);
    }

    if (REACH_MODE && !REACH_SURFACE_PREVIEW) {
      for (const name of ['ALPHA A', 'ALPHA B']) {
        const marker = document.createElement('div');
        marker.className = 'reach-alpha-marker';
        marker.textContent = name;
        marker.hidden = true;
        document.body.appendChild(marker);
        this.alphaMarkers.push(marker);
      }
    }

    if (!REACH_MODE) {
      this.input.onClick = (x, y, dbl) => this.onClick(x, y, dbl);
      this.input.onKey = (code, e) => this.onKey(code, e);
      this.input.onLockChange = (locked) => this.onLockChange(locked);
      sceneCanvas.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || this.input.dragging || this.input.locked) { this.overlay.hoverId = null; return; }
        const b = this.overlay.pick(e.clientX, e.clientY, 16);
        this.overlay.hoverId = b?.id ?? null;
        sceneCanvas.style.cursor = b ? 'pointer' : 'default';
      });
    }

    // Galaxy-scale state for the first frame
    this.universe.toParsecs(this.camera.position, this.camPc);
    this.updateGalaxyScale(true);

    this.applySettings();
    if (this.panorama) Object.defineProperty(window, '__reachPanoramaStatus', {
      value: () => ({
        primary: this.panorama!.isPrimaryDisplay,
        sequence: this.panorama!.isPrimaryDisplay ? this.panoramaSync!.sentSequence : this.lastPanoramaSequence,
        countdown: document.getElementById('reach-countdown') !== null,
        viewport: [this.engine.width, this.engine.height],
        viewOffset: this.engine.camera.view,
        projection: this.engine.camera.projectionMatrix.elements,
        canvas: [this.engine.renderer.domElement.width, this.engine.renderer.domElement.height],
        contract: this.panorama,
      }),
      configurable: false,
    });
    if (!REACH_FLICKER) requestAnimationFrame(this.frame);
    document.getElementById('loader')?.classList.add('done');
  }

  private checkpointReach(): void {
    if (!this.reach || !this.reachStore || !this.reachCheckpointWritable) return;
    try { saveReachJourney(this.reachStore, this.reach.capture()); } catch { /* storage must not stop the voyage */ }
    this.lastReachSave = performance.now();
  }

  /** Development-only binary shot diagnostics, in the active system's km frame. */
  private alphaPreviewStatus(): object {
    const cinematic = this.reach?.alphaCinematic;
    const binary = this.universe.system(ALPHA_SYSTEM_ID);
    if (binary !== this.universe.current) binary.update(this.time.jd, this.time.t);
    const project = (relative: Vector3) => {
      const distanceKm = relative.length();
      const ndc = relative.clone().normalize().multiplyScalar(1e11).project(this.engine.camera);
      return { distanceKm, x: (ndc.x + 1) * this.engine.width / 2,
        y: (1 - ndc.y) * this.engine.height / 2,
        visible: ndc.z >= -1 && ndc.z <= 1 && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 };
    };
    const a = binary?.get(`s${ALPHA_A_INDEX}-star`);
    const b = binary?.get(`s${ALPHA_B_INDEX}-star`);
    const toA = a && alphaPointDirection(binary, a, this.universe.current.origin, this.camera.position);
    const toB = b && alphaPointDirection(binary, b, this.universe.current.origin, this.camera.position);
    const landmarks = this.landmarkSprites.named.map((item) => ({
      name: item.name, radiusPx: item.radiusPx,
      ...project(item.dir.clone()),
    })).filter((item) => item.visible);
    const galaxies = this.galaxySprites.named.map((item) => ({
      name: item.name, radiusPx: this.galaxySprites.apparent(item.index).angRad
        * this.engine.height / 2 / Math.tan(this.engine.localVerticalFovRad / 2),
      ...project(item.dir.clone()),
    })).filter((item) => item.visible);
    return {
      stage: cinematic?.stage ?? 'interstellar-approach',
      label: cinematic?.label ?? 'APPROACH ALPHA CENTAURI',
      secondsLeft: cinematic?.secondsLeft ?? this.reach?.countdown.secondsLeft,
      terminal: cinematic?.terminal ?? false,
      frame: this.universe.current.starId,
      camera: { framePositionKm: this.camera.position.toArray(),
        worldPositionKm: this.universe.current.origin.clone().add(this.camera.position).toArray(),
        direction: new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).toArray(),
        targetKm: cinematic?.target.toArray()
          ?? binary.origin.clone().sub(this.universe.current.origin).toArray() },
      separationKm: a && b ? a.position.distanceTo(b.position) : null,
      angularSeparationDeg: toA && toB ? toA.angleTo(toB) / DEG : null,
      stars: a && b && toA && toB ? {
        a: { id: a.id, positionKm: a.position.toArray(),
          worldPositionKm: binary.origin.clone().add(a.position).toArray(), ...project(toA),
          meshVisible: this.bodies.byId.get(a.id)?.meshVisible ?? false },
        b: { id: b.id, positionKm: b.position.toArray(),
          worldPositionKm: binary.origin.clone().add(b.position).toArray(), ...project(toB),
          meshVisible: this.bodies.byId.get(b.id)?.meshVisible ?? false },
      } : null,
      landmarks, galaxies,
    };
  }

  private updateAlphaMarkers(): void {
    if (this.alphaDiagnostics) this.alphaDiagnostics.textContent = JSON.stringify(this.alphaPreviewStatus());
    const cinematic = this.reach?.alphaCinematic;
    const wide = !cinematic || ['establish', 'retract-a', 'cross-to-b', 'retract-b',
      'final-overview'].includes(cinematic.stage);
    const binary = this.universe.current.starId === ALPHA_SYSTEM_ID ? this.universe.current : null;
    for (const [i, id] of [`s${ALPHA_A_INDEX}-star`, `s${ALPHA_B_INDEX}-star`].entries()) {
      const marker = this.alphaMarkers[i];
      if (!marker) continue;
      const body = binary?.get(id);
      if (!body || !wide || (this.bodies.byId.get(id)?.apparentRadiusPx ?? 0) > 50) {
        marker.hidden = true;
        continue;
      }
      const direction = body.position.clone().sub(this.camera.position).normalize();
      const projected = direction.multiplyScalar(1e11).project(this.engine.camera);
      marker.hidden = projected.z < -1 || projected.z > 1
        || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1;
      if (!marker.hidden) {
        marker.style.left = `${(projected.x + 1) * this.engine.width / 2 + 13}px`;
        marker.style.top = `${(1 - projected.y) * this.engine.height / 2 - 9}px`;
      }
    }
  }

  /**
   * The planetary system out to Jupiter from ~40° above the ecliptic, leaning to Earth's side so the
   * inner planets sit in the foreground, slowly circling the Sun. Orbit lines are forced on while
   * it shows (the backdrop is meaningless without them). `fly` eases there instead of cutting.
   */
  showBackdrop(fly: boolean): void {
    const u = this.universe;
    if (u.current.catalogIndex !== 0) return; // only meaningful in the home system
    const sun = u.star;
    const earth = u.get('earth');
    if (!earth) return;
    const outer = u.get('jupiter') ?? earth;
    const span = outer.resolved?.a ?? outer.localPosition.length();
    const north = earth.orbitNormal.lengthSq() > 1e-6 ? earth.orbitNormal : sun.pole;
    const toEarth = new Vector3().copy(earth.position).sub(sun.position).normalize();
    const dir = north.clone().addScaledVector(toEarth, 0.85).normalize();
    this.select(null);
    this.selectedStar = null; this.selectedGalaxy = null; this.selectedLandmark = null;
    if (fly) {
      this.camera.goToVantage(sun, dir, span * 2.5, 4);
      this.backdropPending = true;
    } else {
      this.camera.placeAt(sun, dir.multiplyScalar(span * 2.5));
      this.camera.autoOrbit = BACKDROP_ORBIT;
      this.backdrop = true;
    }
  }
  /** the backdrop is on screen (cleared by any new flight, which also stops the auto-orbit) */
  private backdrop = false;
  private backdropPending = false;

  /** The 2D overlay always draws at device resolution (crisp text), whatever the 3D render scale. */
  private resizeOverlay(): void {
    this.overlay.resize(this.engine.width, this.engine.height, Math.min(window.devicePixelRatio || 1, 2));
  }

  /** (Re)build every per-system renderable when the current frame changes. */
  private loadSystemRenderables(sys: StarSystem): void {
    const started = this.arrivalTrace && sys.starId === 'c64548' ? performance.now() : 0;
    this.planetPreparation?.abort();
    this.planetPreparation = null;
    this.bodies.setSystem(sys);
    this.orbits.setSystem(sys);
    this.points.setViews(this.bodies.views);
    this.belts.setSystem(sys.belts, sys.star.gm, sys.catalogIndex === 0 ? IDENTITY : sys.star.poleBasis);
    const [r, g, b] = starLightColor(sys.starTemperature);
    this.sunColor.set(r, g, b);
    this.starLuminosity = sys.catalogIndex === 0 ? 1 : this.universe.starInfo(sys.starId).luminosity;
    if (started) this.arrivalTrace!.event('load-system-renderables', performance.now() - started);
    if (REACH_STAR_ENCOUNTER_ID === sys.starId && !REACH_HIDE_ENCOUNTER_PLANETS) {
      const preparation = new AbortController();
      this.planetPreparation = preparation;
      this.arrivalTrace?.event('planet-preparation-start');
      void preparePlanetResources(this.bodies.views, sys.star.id, this.engine.renderer, this.engine.scene,
        preparation.signal, (step) => this.arrivalTrace?.preparationStep(step)).then(() => {
        if (!preparation.signal.aborted) this.arrivalTrace?.event('planet-preparation-complete');
      }).catch((error) => {
        this.arrivalTrace?.event(`planet-preparation-error:${String(error)}`);
      });
    }
  }

  /* ---------------- UIHost ---------------- */
  select(b: CelestialBody | null): void {
    this.selected = b;
    if (b) { this.selectedStar = null; this.selectedGalaxy = null; this.selectedLandmark = null; }
  }

  selectStar(id: StarId | null): void {
    this.selectedStar = id;
    if (id !== null) { this.selected = null; this.selectedGalaxy = null; this.selectedLandmark = null; }
  }

  selectGalaxy(i: number | null): void {
    this.selectedGalaxy = i;
    if (i !== null) { this.selected = null; this.selectedStar = null; this.selectedLandmark = null; }
  }

  selectLandmark(i: number | null): void {
    // star-type landmarks are real systems: select them as stars
    const sysId = i !== null ? this.universe.landmarks[i].systemId : null;
    if (sysId !== null) { this.selectStar(sysId); return; }
    this.selectedLandmark = i;
    if (i !== null) { this.selected = null; this.selectedStar = null; this.selectedGalaxy = null; }
  }

  /** Fly to a nebula / cluster / remnant (or into a landmark star's system). */
  goToLandmark(i: number): void {
    const u = this.universe;
    const l = u.landmarks[i];
    if (l.systemId !== null) { this.goToStar(l.systemId); return; }
    this.selectLandmark(i);
    const centre = u.landmarkRelative(i, new Vector3(0, 0, 0));
    const R = l.def.radiusPc * PARSEC_KM;
    const fromCam = new Vector3().copy(this.camera.position).sub(centre).normalize();
    // stop where the object fills a good part of the view (sprites fade when we are inside)
    const arrive = l.def.kind === 'remnant' ? R * 5 : R * 3.2;
    this.camera.goToPoint(centre, arrive, fromCam, { radius: R * 0.3, name: _(l.def.name) });
    const dist = new Vector3().copy(centre).sub(this.camera.position).length();
    this.ui.showToast(_('{name} hedefine uçuluyor… ({dist})', { name: l.def.name, dist: fmtLightYears(dist) }), 2600);
  }

  centerLandmark(i: number): void {
    const l = this.universe.landmarks[i];
    if (l.systemId !== null) { this.centerStar(l.systemId); return; }
    this.selectLandmark(i);
    const dir = this.universe.landmarkRelative(i, this.camera.position).normalize();
    this.camera.centerOnDirection(dir);
  }

  goTo(b: CelestialBody): void {
    this.select(b);
    this.camera.goTo(b, this.universe.star.position);
    this.ui.showToast(_('{name} hedefine uçuluyor…', { name: b.name }));
  }

  /** Interstellar travel: switch the reference frame to the target system, then autopilot to its star. */
  goToStar(id: StarId): void {
    const u = this.universe;
    if (id === u.current.starId) {
      this.goTo(u.star);
      return;
    }
    const delta = u.switchTo(id, this.time.jd, this.time.t);
    this.camera.shiftFrame(delta, u.star);
    this.select(u.star);
    this.camera.goTo(u.star, u.star.position);
    this.ui.showToast(_('{name} sistemine uçuluyor… ({dist})', { name: u.star.name, dist: fmtLightYears(delta.length()) }), 2600);
  }

  /** Intergalactic travel: fly to a vantage point ~2.5 radii from the galaxy centre, above its disc. */
  goToGalaxy(i: number): void {
    const u = this.universe;
    this.selectGalaxy(i);
    const g = u.galaxies;
    const centre = u.galaxyRelative(i, new Vector3(0, 0, 0)); // km, current frame
    const R = g.radius[i] * PARSEC_KM;
    const fromCam = new Vector3().copy(this.camera.position).sub(centre).normalize();
    const normal = new Vector3(g.normal[i * 3], g.normal[i * 3 + 1], g.normal[i * 3 + 2]);
    if (fromCam.dot(normal) < 0) normal.negate();
    const approach = fromCam.lerp(normal, 0.55).normalize();
    // arrive in orbit around the centre; the wheel may descend deep into the galaxy
    this.camera.goToPoint(centre, R * 2.6, approach, { radius: R * 0.02, name: g.name(i) });
    const dist = new Vector3().copy(centre).sub(this.camera.position).length();
    this.ui.showToast(_('{name} galaksisine uçuluyor… ({dist})', { name: g.name(i), dist: fmtLightYears(dist) }), 2600);
  }

  center(b: CelestialBody): void {
    this.select(b);
    this.camera.centerOn(b);
  }

  centerStar(id: StarId): void {
    this.selectStar(id);
    const dir = this.universe.starRelative(id, this.camera.position).normalize();
    this.camera.centerOnDirection(dir);
  }

  centerGalaxy(i: number): void {
    this.selectGalaxy(i);
    const dir = this.universe.galaxyRelative(i, this.camera.position).normalize();
    this.camera.centerOnDirection(dir);
  }

  starApparentMag(id: StarId): number | null {
    const ci = catalogIndexOf(id);
    return ci >= 0 ? this.starPoints.apparentMag(ci) : this.procPoints.apparentMag(id);
  }

  get freeRoam(): boolean {
    return this.input.locked;
  }

  /**
   * Free roam: the pointer is captured so the mouse steers directly (no dragging), WASD/RF fly,
   * Q/E roll, wheel changes speed. Clicking selects whatever is under the crosshair.
   */
  toggleFreeRoam(): void {
    if (this.input.locked) {
      this.input.unlockPointer();
      return;
    }
    this.camera.autopilot = null;
    this.camera.setMode('free');
    this.input.lockPointer();
  }

  private onLockChange(locked: boolean): void {
    this.overlay.crosshair = locked;
    if (locked) {
      this.ui.showToast(_('Serbest dolaşım: fare ile bak · W A S D uç · R F yukarı/aşağı · Q E yatış · tekerlek hız · Esc çık'), 4200);
    } else {
      this.ui.showToast(_('Serbest dolaşım kapatıldı'));
    }
  }

  /** Fly to a black hole: switch to its system's frame first, then autopilot to the hole itself. */
  goToBlackHole(id: string): void {
    const u = this.universe;
    const bh = u.blackHole(id);
    if (!bh) { this.ui.showToast(_('Kara delik bulunamadı')); return; }
    if (bh.systemStarId !== u.current.starId) {
      const delta = u.switchTo(bh.systemStarId, this.time.jd, this.time.t);
      this.camera.shiftFrame(delta, u.star);
    }
    const body = u.get(bh.entry.bodyId);
    if (!body) { this.ui.showToast(_('Kara delik bulunamadı')); return; }
    this.select(body);
    this.camera.goTo(body, u.star.position);
    const dist = body.position.distanceTo(this.camera.position);
    this.ui.showToast(_('{name} kara deliğine uçuluyor… ({dist})', { name: body.name, dist: fmtLightYears(dist) }), 2600);
  }

  /** Point the camera at a black hole (no travel). */
  centerBlackHole(id: string): void {
    const u = this.universe;
    const bh = u.blackHole(id);
    if (!bh) return;
    const body = bh.systemStarId === u.current.starId ? u.get(bh.entry.bodyId) : null;
    if (body) { this.center(body); return; }
    this.selectStar(bh.systemStarId);
    const dir = u.starRelative(bh.systemStarId, this.camera.position).normalize();
    this.camera.centerOnDirection(dir);
  }

  goToBodyId(id: string): void {
    this.goToSystemBody('c0', id);
  }

  /* ---------------- tour cues ---------------- */

  /** Planets, moons and small bodies get the backlit tour composition (Sun over the limb). */
  private static backlitKind(b: CelestialBody): boolean {
    const t = b.data.type;
    return (t === 'planet' || t === 'dwarf' || t === 'moon' || t === 'asteroid' || t === 'comet') && b.data.orbit?.kind !== 'surface';
  }

  /** Tour step arrival: like goTo, but worlds are framed with the Sun in the sky behind them. */
  goToTourBody(id: string): void {
    const u = this.universe;
    if (u.current.starId !== 'c0') {
      const delta = u.switchTo('c0', this.time.jd, this.time.t);
      this.camera.shiftFrame(delta, u.star);
    }
    const b = u.get(id);
    if (!b) { this.ui.showToast(_('Hedef bulunamadı')); return; }
    this.select(b);
    if (App.backlitKind(b)) this.camera.goToBacklit(b, u.star.position);
    else this.camera.goTo(b, u.star.position);
    this.ui.showToast(_('{name} hedefine uçuluyor…', { name: b.name }));
  }

  /** Pull back above `bodyId`'s orbit around its parent so the whole orbit is in view. */
  goToOverview(bodyId: string): void {
    const b = this.universe.get(bodyId);
    const p = b?.parent;
    if (!b || !p) return;
    const a = b.resolved?.a ?? b.localPosition.length();
    // ~70° above the orbital plane, leaning to the body's side so it sits in the foreground;
    // 2.7 a keeps the whole orbit inside a ~50° field of view
    const toBody = new Vector3().copy(b.position).sub(p.position).normalize();
    const dir = new Vector3().copy(b.orbitNormal);
    if (dir.lengthSq() < 1e-6) dir.copy(p.pole);
    dir.addScaledVector(toBody, 0.35).normalize();
    this.select(b);
    this.camera.goToVantage(p, dir, Math.max(a * 2.7, p.radius * 6), TOUR_HOP_S);
  }

  /** Hop back to `bodyId` after an overview/pin cue (quick flight, no toast). */
  returnTo(bodyId: string): void {
    const b = this.universe.get(bodyId);
    if (!b) return;
    this.select(b);
    if (App.backlitKind(b)) this.camera.goToBacklit(b, this.universe.star.position, TOUR_HOP_S);
    else this.camera.goTo(b, this.universe.star.position, TOUR_HOP_S);
  }

  /** Camera `elev`° above the equator plane, `az`° around the pole from the noon meridian, `dist` radii out. */
  goToVantageOf(bodyId: string, elev: number, az: number, dist: number): void {
    const b = this.universe.get(bodyId);
    if (!b) return;
    const noon = this.noonDirection(b, new Vector3());
    const east = new Vector3().crossVectors(b.pole, noon).normalize();
    const ce = Math.cos(elev * DEG);
    const dir = new Vector3()
      .addScaledVector(noon, ce * Math.cos(az * DEG))
      .addScaledVector(east, ce * Math.sin(az * DEG))
      .addScaledVector(b.pole, Math.sin(elev * DEG))
      .normalize();
    const minD = b.data.rings ? Math.max(b.radius * dist, b.data.rings.outer * 1.15) : b.radius * dist;
    this.select(b);
    this.camera.goToVantage(b, dir, minD, TOUR_HOP_S * 1.5);
  }

  /** Unit vector from `b` toward the Sun, projected onto its equator plane (the sub-solar meridian). */
  private noonDirection(b: CelestialBody, out: Vector3): Vector3 {
    const star = this.universe.star;
    if (star === b) {
      const e = this.universe.get('earth');
      out.copy(e ? e.position : new Vector3(1, 0, 0)).sub(b.position);
    } else out.copy(star.position).sub(b.position);
    out.addScaledVector(b.pole, -out.dot(b.pole));
    if (out.lengthSq() < 1e-6) out.set(1, 0, 0).addScaledVector(b.pole, -b.pole.x);
    return out.normalize();
  }

  setComparison(refId: string | null, besideId?: string): void {
    if (this.ghost) {
      if (!refId) {
        // fade out; the body is removed once it has gone dark (see the frame loop)
        this.ghost.leaving = true;
        return;
      }
      this.dropGhost();
    }
    if (!refId || !besideId) return;
    const ref = this.universe.get(refId);
    const beside = this.universe.get(besideId);
    if (!ref || !beside || ref === beside) return;
    // a detached copy: same appearance and radius, no orbit, positioned by hand every frame
    const body = new CelestialBody({ ...ref.data, id: 'tour-ghost', orbit: undefined });
    body.pole.copy(ref.pole);
    body.rotation.copy(ref.rotation);
    this.ghost = { body, ref, beside, alpha: 0, leaving: false };
    this.placeGhost();
    this.bodies.addBody(body, this.universe.current);
    this.points.setViews(this.bodies.views);
    // back off until both fit side by side (≈ 60 % of a ~70° horizontal field)
    const width = 2 * this.ghostAnchorRadius(beside) + 2.7 * ref.radius;
    const need = width * 1.25;
    const ap = this.camera.autopilot;
    if (ap && ap.kind === 'goto' && ap.target === beside) {
      // still on the way in: just stop the approach further out
      ap.dist1 = Math.max(ap.dist1, need);
      return;
    }
    const cur = this.camera.position.distanceTo(beside.position);
    if (need > cur * 1.05) {
      const dir = new Vector3().copy(this.camera.position).sub(beside.position).normalize();
      this.camera.goToVantage(beside, dir, need, TOUR_HOP_S);
    }
  }

  private ghostAnchorRadius(b: CelestialBody): number {
    return b.data.rings ? Math.max(b.radius, b.data.rings.outer) : b.radius;
  }

  private dropGhost(): void {
    if (!this.ghost) return;
    this.bodies.removeBody(this.ghost.body.id);
    this.points.setViews(this.bodies.views);
    this.ghost = null;
  }

  /** Fade the comparison body in over ~1.2 s, out over ~0.8 s, and drop it once invisible. */
  private updateGhost(dt: number): void {
    const g = this.ghost;
    if (!g) return;
    if (g.leaving) {
      g.alpha -= dt / 0.8;
      if (g.alpha <= 0) { this.dropGhost(); return; }
    } else g.alpha = Math.min(1, g.alpha + dt / 1.2);
    this.placeGhost();
  }

  /** Keep the comparison body at the screen-right of its anchor, at the same depth, spinning like the original. */
  private placeGhost(): void {
    const g = this.ghost;
    if (!g) return;
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const gap = this.ghostAnchorRadius(g.beside) + g.ref.radius * 1.35;
    g.body.position.copy(g.beside.position).addScaledVector(right, gap);
    g.body.rotation.copy(g.ref.rotation);
    g.body.pole.copy(g.ref.pole);
    g.body.distanceToStar = g.body.position.distanceTo(this.universe.star.position);
  }

  setPulse(p: { from: string; to: string; seconds: number } | null): void {
    if (!p) { this.pulse?.stop(); return; }
    const a = this.universe.get(p.from);
    const b = this.universe.get(p.to);
    if (!a || !b) return;
    this.pulse ??= new LightPulse(this.engine.scene);
    this.pulse.start(a, b, p.seconds);
  }

  /** Fly in above a surface point (lat/lon, degrees) of `bodyId`, looking down at it. */
  goToSurface(bodyId: string, lat: number, lon: number, storm = false): void {
    const b = this.universe.get(bodyId);
    if (!b) return;
    const dir = this.pinDirection(b, lat, lon, storm, new Vector3());
    this.bringIntoDaylight(b, dir);
    // Stand a little south and screen-left of the feature so, looking at the body's centre, the pin
    // lands in the upper right of the screen, clear of the info panel and the tour bar.
    // (camera up ≈ pole, so screen-right = forward × pole = pole × camDir; we move the opposite way)
    const south = new Vector3().copy(b.pole).addScaledVector(dir, -b.pole.dot(dir)).multiplyScalar(-1);
    const left = new Vector3().crossVectors(dir, b.pole);
    if (left.lengthSq() < 1e-4) {
      // polar feature: any tangent will do — lean toward the Sun so the area is lit
      left.copy(this.universe.star.position).sub(b.position).normalize();
      left.addScaledVector(dir, -left.dot(dir)).normalize();
    } else left.normalize();
    const camDir = dir.clone().addScaledVector(south, 0.18).addScaledVector(left, 0.26).normalize();
    this.select(b);
    this.camera.goToVantage(b, camDir, b.radius * 1.9);
  }

  /**
   * If the surface point `dir` is in the dark, advance the clock by less than one rotation so the
   * Sun is high over it (tours already fast-forward time; a feature in the night is useless).
   * `dir` is rotated in place to where it will be after the jump.
   */
  private bringIntoDaylight(b: CelestialBody, dir: Vector3): void {
    // tidally locked moons spin once per orbit (prograde about the pole): the Sun sweeps their
    // surface once per orbital period, so the same jump logic applies with that period
    const spinS = b.data.rotationPeriod === 'sync' ? b.periodDays * DAY_S : b.rotationPeriodS;
    if (!spinS || !Number.isFinite(spinS) || this.universe.star === b) return;
    const toSun = new Vector3().copy(this.universe.star.position).sub(b.position).normalize();
    if (dir.dot(toSun) > 0.5) return; // Sun already more than 30° up
    const sunT = toSun.clone().addScaledVector(b.pole, -toSun.dot(b.pole));
    const dirT = dir.clone().addScaledVector(b.pole, -dir.dot(b.pole));
    if (sunT.lengthSq() < 1e-6 || dirT.lengthSq() < 1e-6) return; // polar: no rotation helps
    sunT.normalize(); dirT.normalize();
    // signed angle from the feature to the sub-solar meridian about the pole (spin is +about pole)
    const phi = Math.atan2(b.pole.dot(new Vector3().crossVectors(dirT, sunT)), dirT.dot(sunT));
    const omega = (2 * Math.PI) / spinS;
    let dt = phi / omega;
    const period = Math.abs(spinS);
    while (dt < 0) dt += period;
    this.time.jump(dt);
    dir.applyQuaternion(new Quaternion().setFromAxisAngle(b.pole, omega * dt));
  }

  /**
   * While a tour pin is shown and the camera has settled, keep the feature in the upper right of
   * the view — clear of the info panel, the tour bar and the corner card — whatever roll the
   * camera ended the flight with. Eased, and suspended while the user is dragging.
   */
  private aimAtPin(dt: number, fovRad: number, aspect: number): void {
    const pin = this.surfacePin;
    const cam = this.camera;
    if (!pin || cam.autopilot || this.input.dragging || !this.tours.state.tour || this.tours.state.paused) return;
    const b = this.universe.get(pin.bodyId);
    if (!b || cam.target !== b) return;
    // the feature's direction in camera space
    const d = this.pinDirection(b, pin.lat, pin.lon, pin.storm ?? false, this.aimDir).multiplyScalar(b.radius).add(b.position).sub(cam.position).normalize();
    d.applyQuaternion(this.aimQ.copy(cam.quaternion).invert());
    if (d.z > -0.3) return; // off to the side or behind: not ours to fix
    // where it should sit: a fixed fraction of the half-field to the right and up
    const th = Math.tan(fovRad / 2);
    const t = this.aimTarget.set(th * aspect * 0.2, th * 0.26, -1).normalize();
    if (d.distanceToSquared(t) < 1e-6) return;
    // rotating the camera by R (local) moves the feature from d to R⁻¹·d; we need R⁻¹·d = t
    this.aimQ.setFromUnitVectors(t, d);
    this.aimEase.identity().slerp(this.aimQ, Math.min(1, dt * 3.5));
    cam.quaternion.multiply(this.aimEase);
  }
  private readonly aimDir = new Vector3();
  private readonly aimTarget = new Vector3();

  /**
   * Tour work light: in tour close-ups the shadows go — the body in front of the camera, the
   * comparison copy beside it and any pinned body are lit up to near-noon over ~2 s (backlit
   * compositions and Mercury's / Venus's slow days would otherwise leave them black), and fade
   * back down when the close-up ends.
   */
  private updateFill(dt: number): void {
    const want = this.fillWant;
    want.clear();
    const tour = this.tours.state.tour;
    if (tour) {
      const cam = this.camera;
      const t = cam.target;
      if (t && t !== this.universe.star && cam.position.distanceTo(t.position) < t.radius * 9) want.add(t.id);
      if (this.ghost && !this.ghost.leaving) want.add(this.ghost.body.id);
      if (this.surfacePin && !this.pinLeaving) want.add(this.surfacePin.bodyId);
    }
    const step = dt / 2;
    for (const id of want) if (!this.fill.has(id)) this.fill.set(id, 0);
    for (const [id, v] of this.fill) {
      const nv = want.has(id) ? Math.min(1, v + step) : v - step;
      if (nv <= 0) this.fill.delete(id);
      else this.fill.set(id, nv);
    }
    this.fillOut.clear();
    for (const [id, v] of this.fill) this.fillOut.set(id, v * v * (3 - 2 * v));
  }
  private readonly fill = new Map<string, number>();
  private readonly fillWant = new Set<string>();
  private readonly fillOut = new Map<string, number>();
  private readonly aimQ = new Quaternion();
  private readonly aimEase = new Quaternion();

  /** Outward unit vector of a surface point; gas-giant storms follow the shader's drifting spot. */
  private pinDirection(b: CelestialBody, lat: number, lon: number, storm: boolean, out: Vector3): Vector3 {
    const app = b.data.appearance;
    if (storm && app.kind === 'gas' && app.storm) {
      // gasgiant.frag: lon = atan(z, x), storm at uStorm.y + hours * 0.004 rad — our east longitude is the negative
      const hours = this.time.t / 3600;
      lat = app.storm[0];
      lon = -(app.storm[1] + (hours * 0.004) / DEG);
    }
    return b.surfaceDirection(lat, lon, out);
  }

  setTourOverrides(o: TourOverrides): void {
    this.tourOverrides = o;
  }

  setSurfacePin(pin: SurfacePin | null): void {
    if (pin) {
      // a new pin fades in; replacing one mid-fade just continues from the current alpha
      if (!this.surfacePin || this.pinLeaving) this.pinAlpha = this.pinLeaving ? this.pinAlpha : 0;
      this.surfacePin = pin;
      this.pinLeaving = false;
    } else if (this.surfacePin) {
      // keep the pin for its fade-out; it is dropped when fully transparent (see the frame loop)
      this.pinLeaving = true;
    }
  }
  private pinAlpha = 0;
  private pinLeaving = false;

  /** Fly to a body of any system, switching the reference frame to that system first if needed. */
  goToSystemBody(starId: StarId, bodyId: string): void {
    const u = this.universe;
    if (starId !== u.current.starId) {
      const delta = u.switchTo(starId, this.time.jd, this.time.t);
      this.camera.shiftFrame(delta, u.star);
    }
    const b = u.get(bodyId);
    if (b) this.goTo(b);
    else this.ui.showToast(_('Hedef bulunamadı'));
  }

  toggleFollow(): void {
    const cam = this.camera;
    if (this.selected) {
      if (cam.mode === 'orbit' && cam.target === this.selected) {
        cam.setMode('free');
        this.ui.showToast(_('Serbest uçuş'));
      } else {
        cam.anchor = null;
        cam.target = this.selected;
        cam.setMode('orbit');
        this.ui.showToast(_('{name} takip ediliyor', { name: this.selected.name }));
      }
      return;
    }
    // galaxies / nebulae: orbit a fixed point of the current frame
    const u = this.universe;
    let centre: Vector3 | null = null, radius = 0, name = '';
    if (this.selectedGalaxy !== null) {
      const i = this.selectedGalaxy;
      centre = u.galaxyRelative(i, new Vector3());
      radius = u.galaxies.radius[i] * PARSEC_KM * 0.02;
      name = u.galaxies.name(i);
    } else if (this.selectedLandmark !== null) {
      const i = this.selectedLandmark;
      centre = u.landmarkRelative(i, new Vector3());
      radius = u.landmarks[i].def.radiusPc * PARSEC_KM * 0.3;
      name = _(u.landmarks[i].def.name);
    }
    if (!centre) return;
    if (cam.mode === 'orbit' && cam.anchor && cam.anchor.position.distanceToSquared(centre) < 1e-6 * Math.max(1, centre.lengthSq())) {
      cam.setMode('free');
      this.ui.showToast(_('Serbest uçuş'));
    } else {
      cam.orbitPoint(centre, radius, name);
      this.ui.showToast(_('{name} takip ediliyor', { name }));
    }
  }

  /* ---------------- Missions ---------------- */
  launchMission(plan: MissionPlan, follow: boolean, fitSeconds: number): ActiveMission {
    const t = this.time;
    const rate = fitSeconds > 0 ? Math.max(1, plan.durationS / fitSeconds) : 1;
    // start a few real seconds before departure so the launch is visible
    const preRoll = (3 * rate) / 86400;
    if (t.jd < plan.departureJd - preRoll || t.jd > plan.departureJd) t.jd = plan.departureJd - preRoll;
    if (rate > 1) t.setRate(rate); else t.setRate(1);
    const m = this.missions.launch(plan, t.jd, t.t);
    m.autoRate = rate > 1;
    this.trajectories.add(m);
    if (follow) this.followMission(m);
    this.ui.showToast(`${_('{name} fırlatıldı', { name: m.name })} · ${plan.originName} → ${plan.targetName} · ${fmtDuration(plan.durationS)}${rate > 1 ? ` · ${_('zaman')} ${t.rateLabel()}` : ''}`, 3200);
    return m;
  }

  followMission(m: ActiveMission): void {
    this.missions.followed = m;
    this.followOffsetValid = false;
    if (!m.body) {
      // vehicle lives in another system right now: go there
      const ph = m.phase;
      if (ph && 'system' in ph && ph.system !== this.universe.current.starId) {
        const delta = this.universe.switchTo(ph.system, this.time.jd, this.time.t);
        this.camera.shiftFrame(delta, this.universe.star);
      }
      this.missions.update(this.time.jd, this.time.t);
    }
    if (m.body) {
      this.select(m.body);
      this.camera.goTo(m.body, this.universe.star.position);
    }
  }

  cancelMission(m: ActiveMission): void {
    const b = m.body;
    if (this.missions.followed === m && m.autoRate) this.time.setRate(1);
    this.missions.cancel(m);
    this.trajectories.remove(m);
    if (b) {
      if (this.selected === b) this.select(null);
      if (this.camera.target === b) { this.camera.target = null; this.camera.setMode('free'); this.camera.setReference(null); }
    }
    this.ui.showToast(_('{name} görevi kaldırıldı', { name: m.name }));
  }

  showToast(msg: string, ms?: number): void { this.ui.showToast(msg, ms); }

  private onMissionSpawned(m: ActiveMission, b: CelestialBody): void {
    this.bodies.addBody(b, this.universe.current);
    this.points.setViews(this.bodies.views);
    if (this.missions.followed === m) {
      if (this.followOffsetValid) {
        this.camera.placeAt(b, this.followOffset);
        this.followOffsetValid = false;
      }
      if (this.selected === null || this.selected.id === b.id) this.select(b);
    }
  }

  private onMissionDespawned(m: ActiveMission, b: CelestialBody): void {
    this.bodies.removeBody(b.id);
    this.points.setViews(this.bodies.views);
    if (this.camera.target === b) {
      this.followOffset.copy(this.camera.position).sub(b.position);
      const d = this.followOffset.length();
      // keep a sensible viewing distance for the respawned vehicle
      if (!(d > b.radius * 1.2 && d < b.radius * 400)) this.followOffset.normalize().multiplyScalar(b.radius * 5);
      this.followOffsetValid = this.missions.followed === m;
      if (!this.followOffsetValid) { this.camera.target = null; this.camera.setMode('free'); this.camera.setReference(null); }
    }
    if (this.selected === b) this.selected = null;
  }

  private onMissionFrameSwitch(_m: ActiveMission, systemId: StarId): void {
    const u = this.universe;
    if (systemId === u.current.starId) return;
    try {
      const delta = u.switchTo(systemId, this.time.jd, this.time.t);
      this.camera.shiftFrame(delta, u.star);
      this.selectStar(null); this.selectGalaxy(null); this.selectLandmark(null);
      this.ui.showToast(_('Referans çerçevesi: {name} sistemi', { name: u.star.name }), 2600);
    } catch (e) {
      console.error(e);
    }
  }

  private onMissionArrived(m: ActiveMission): void {
    if (m.autoRate && this.missions.followed === m) {
      this.time.setRate(1);
      m.autoRate = false;
    }
    this.ui.showToast(`${m.name}: ${_('{name} hedefine varıldı', { name: m.plan.targetName })}`, 3200);
  }

  applySettings(): void {
    const s = this.settings;
    if (!REACH_MODE) saveSettings(s);
    this.engine.setFov(s.fov);
    this.engine.bloom.enabled = s.bloom;
    this.engine.setRenderScale(s.renderScale);
    this.resizeOverlay();
    this.engine.renderer.toneMappingExposure = s.exposure;
    this.overlay.showLabels = s.labels;
    this.overlay.showMarkers = s.markers;
    this.overlay.showStarNames = s.starNames;
    this.overlay.showGalaxyNames = s.galaxyNames;
    this.grid.setVisible(s.eclipticGrid, s.equatorialGrid);
    this.galaxySprites.setVisible(s.galaxies);
    for (const sp of this.farSprites) sp.setVisible(s.galaxies);
    // "what is real?" view: generated stars & galaxies in green
    this.procPoints.setHighlight(s.highlightProcedural);
    this.galaxySprites.setHighlight(s.highlightProcedural);
    for (const sp of this.farSprites) sp.setHighlight(s.highlightProcedural);
    for (const c of this.clouds.values()) c.setHighlight(s.highlightProcedural);
    this.overlay.highlightProcedural = s.highlightProcedural;
    this.camera.mouseSensitivity = 0.0032 * s.mouseSensitivity;
    this.camera.invertY = s.invertY;
    this.ui.syncSettings();
  }

  screenshot(): void {
    this.wantScreenshot = true;
  }

  toggleUI(): void {
    this.uiVisible = !this.uiVisible;
    document.getElementById('ui')?.classList.toggle('hidden', !this.uiVisible);
  }

  /* ---------------- Input ---------------- */
  private onClick(x: number, y: number, dbl: boolean): void {
    // fingers are less precise than a mouse pointer
    const tol = this.input.coarse ? 2 : 1;
    const b = this.overlay.pick(x, y, 22 * tol);
    if (b) {
      this.select(b);
      if (dbl) this.goTo(b);
      return;
    }
    const eng = this.engine;
    const u = this.universe;
    const star = this.starPoints.pick(x, y, eng.camera, eng.width, eng.height, u.current.catalogIndex, 14 * tol);
    if (star !== null) {
      this.selectStar(`c${star}`);
      if (dbl) this.goToStar(`c${star}`);
      return;
    }
    const proc = this.procPoints.pick(x, y, eng.camera, eng.width, eng.height, u.current.starId, 14 * tol);
    if (proc !== null) {
      this.selectStar(proc);
      if (dbl) this.goToStar(proc);
      return;
    }
    const lm = this.landmarkSprites.pick(x, y, eng.camera, eng.width, eng.height, 14 * tol);
    if (lm !== null) {
      this.selectLandmark(lm);
      if (dbl) this.goToLandmark(lm);
      return;
    }
    const fovRad = eng.camera.fov * DEG;
    const pxPerRad = eng.height / 2 / Math.tan(fovRad / 2);
    const gal = this.galaxySprites.pick(x, y, eng.camera, eng.width, eng.height, pxPerRad, this.galaxyBoost, u.currentGalaxy ?? -1, 14 * tol);
    if (gal !== null) {
      this.selectGalaxy(gal);
      if (dbl) this.goToGalaxy(gal);
    }
  }

  private onKey(code: string, e: KeyboardEvent): void {
    const s = this.settings;
    const sel = this.selected;
    switch (code) {
      case 'KeyG':
        if (sel) this.goTo(sel);
        else if (this.selectedStar !== null) this.goToStar(this.selectedStar);
        else if (this.selectedGalaxy !== null) this.goToGalaxy(this.selectedGalaxy);
        else if (this.selectedLandmark !== null) this.goToLandmark(this.selectedLandmark);
        break;
      case 'KeyC':
        if (sel) this.center(sel);
        else if (this.selectedStar !== null) this.centerStar(this.selectedStar);
        else if (this.selectedGalaxy !== null) this.centerGalaxy(this.selectedGalaxy);
        else if (this.selectedLandmark !== null) this.centerLandmark(this.selectedLandmark);
        break;
      case 'KeyT': this.toggleFollow(); break;
      case 'KeyV': this.toggleFreeRoam(); break;
      case 'KeyH': case 'Home': {
        e.preventDefault();
        if (this.universe.current.catalogIndex === 0) this.goTo(this.universe.get('earth')!);
        else this.goToStar('c0');
        break;
      }
      case 'KeyU': this.ui.toggleMission(); break;
      case 'KeyM':
        // Milky Way overview
        this.goToGalaxy(0);
        break;
      case 'Escape':
        if (this.tours.active) { this.tours.stop(); this.ui.showToast(_('Tur bitirildi')); }
        else if (this.camera.autopilot) this.camera.autopilot = null;
        else { this.select(null); this.selectStar(null); this.selectGalaxy(null); this.selectLandmark(null); }
        this.ui.toggleHelp(false);
        break;
      case 'KeyJ': this.time.reverseWarp(); break;
      case 'KeyK': this.time.togglePause(); break;
      case 'KeyL': this.time.forwardWarp(); break;
      case 'Backslash': this.time.setNow(); this.ui.showToast(_('Gerçek zaman')); break;
      case 'KeyO': s.orbits = !s.orbits; this.applySettings(); this.ui.showToast(`${_('Yörüngeler')}: ${s.orbits ? _('açık') : _('kapalı')}`); break;
      case 'KeyN': s.labels = !s.labels; s.markers = s.labels; this.applySettings(); this.ui.showToast(`${_('Etiketler')}: ${s.labels ? _('açık') : _('kapalı')}`); break;
      case 'Semicolon': s.eclipticGrid = !s.eclipticGrid; this.applySettings(); break;
      case 'Quote': s.equatorialGrid = !s.equatorialGrid; this.applySettings(); break;
      case 'KeyB': s.bloom = !s.bloom; this.applySettings(); break;
      case 'KeyP': this.screenshot(); break;
      case 'Tab': e.preventDefault(); this.toggleUI(); break;
      case 'F1': e.preventDefault(); this.ui.toggleHelp(); break;
      case 'Slash': e.preventDefault(); (document.getElementById('search-input') as HTMLInputElement).focus(); break;
      case 'Equal': case 'NumpadAdd': this.time.faster(); break;
      case 'Minus': case 'NumpadSubtract': this.time.slower(); break;
      case 'BracketLeft': s.fov = Math.max(20, s.fov - 5); this.applySettings(); break;
      case 'BracketRight': s.fov = Math.min(110, s.fov + 5); this.applySettings(); break;
      default: {
        const m = /^Digit(\d)$/.exec(code);
        if (m) {
          const ids = this.universe.current.planetIds;
          const idx = m[1] === '0' ? 9 : parseInt(m[1], 10) - 1;
          const id = idx === 9 && this.universe.current.catalogIndex !== 0 ? this.universe.star.id : ids[idx];
          const b = id && this.universe.get(id);
          if (b) this.goTo(b);
        }
      }
    }
  }

  /**
   * Free flight between systems: when another star becomes clearly the nearest one,
   * hand the camera over to that system's frame.
   */
  private checkFrameSwitch(dt: number): void {
    this.frameCheckAcc += dt;
    if (this.frameCheckAcc < 0.5 || this.camera.autopilot || this.camera.mode !== 'free') return;
    this.frameCheckAcc = 0;
    const u = this.universe;
    const curDistPc = this.camera.position.length() / PARSEC_KM;
    if (curDistPc < 0.02) return; // still deep inside the current system
    const n = u.nearestStar(this.camera.position);
    // Only re-anchor when we are actually close to another star (a few pc): switching on every
    // nearest-neighbour change while cruising through a galaxy would reset velocity constantly.
    if (n.id === u.current.starId || n.distPc > 3 || n.distPc > curDistPc * 0.7) return;
    // …and not while flying past it at cruising speed (re-anchoring would throttle the flight
    // speed to the new star's altitude); switch once we linger (< ~0.5 s to cross the gap)
    if (this.camera.speed > n.distPc * PARSEC_KM * 2) return;
    const delta = u.switchTo(n.id, this.time.jd, this.time.t);
    this.camera.shiftFrame(delta, u.star);
    this.select(null);
    this.selectStar(null);
    this.selectGalaxy(null);
    this.ui.showToast(_('Referans çerçevesi: {name} sistemi', { name: u.star.name }));
  }

  /**
   * Galaxy-scale bookkeeping (a few times per second): which galaxy are we in, which clouds
   * to keep alive, procedural star cells, speed hint, sprite boost.
   */
  private updateGalaxyScale(force: boolean): void {
    const u = this.universe;
    const g = u.galaxies;
    const camPc = this.camPc;
    const scene = this.engine.scene;

    // containing galaxy (score < 1 ⇒ inside 3 radii)
    const inside = g.containing(camPc, 3);
    u.currentGalaxy = inside;

    // clouds for every galaxy within 18 radii (sprite ↔ cloud crossfade range)
    const wanted = new Set<number>();
    for (let i = 0; i < g.count; i++) {
      const dx = g.positions[i * 3] - camPc.x, dy = g.positions[i * 3 + 1] - camPc.y, dz = g.positions[i * 3 + 2] - camPc.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < g.radius[i] * 18) wanted.add(i);
    }
    for (const [i, c] of this.clouds) if (!wanted.has(i)) { c.dispose(scene); this.clouds.delete(i); }
    for (const i of wanted) {
      if (this.clouds.has(i) || this.clouds.size >= 3) continue;
      const n = i === 0 ? 260_000 : Math.round(Math.min(160_000, 40_000 + g.radius[i] * 6));
      const cloud = new GalaxyCloud(i, g.model(i), scene, n, this.maxPointPx);
      cloud.setHighlight(this.settings.highlightProcedural);
      this.clouds.set(i, cloud);
    }

    // procedural stars for the galaxy we're in
    u.procStars.update(camPc, inside);

    // sprite exaggeration: physical inside a galaxy, boosted in intergalactic space
    let nearestRatio = Infinity;
    for (let i = 0; i < g.count; i++) {
      const dx = g.positions[i * 3] - camPc.x, dy = g.positions[i * 3 + 1] - camPc.y, dz = g.positions[i * 3 + 2] - camPc.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz) / g.radius[i];
      if (r < nearestRatio) nearestRatio = r;
    }
    const targetBoost = Math.min(1, Math.max(0, (nearestRatio - 4) / 8));
    this.galaxyBoost = force ? targetBoost : this.galaxyBoost + (targetBoost - this.galaxyBoost) * 0.35;

    // speed hint: galaxy scale while cruising; a nearby generated star only matters when we are
    // practically on top of it (< 1 pc) – otherwise every passing star would yank the speed around
    let hintPc = Infinity;
    const near = u.procStars.nearest(camPc);
    if (near && near.distPc < 1) hintPc = Math.min(hintPc, Math.max(near.distPc, 0.01));
    if (inside !== null) hintPc = Math.min(hintPc, g.radius[inside] * 0.08);
    else hintPc = Math.min(hintPc, Math.max(g.nearestSurfaceDistance(camPc), 1000));
    const targetKm = hintPc * PARSEC_KM;
    // smooth in log space so the free-flight speed never jumps
    const cur = this.camera.speedHintKm;
    this.camera.speedHintKm = force || !Number.isFinite(cur) || !Number.isFinite(targetKm)
      ? targetKm
      : Math.exp(Math.log(cur) + (Math.log(targetKm) - Math.log(cur)) * 0.4);
  }

  /* ---------------- Frame ---------------- */
  private frame = (now: number): void => {
    if (!REACH_FLICKER) requestAnimationFrame(this.frame);
    const frameStarted = this.arrivalTrace ? performance.now() : 0;
    const intervalMs = now - this.last;
    if (REACH_SGRA_PREVIEW && intervalMs > 0 && intervalMs < 1000) {
      this.sgraFrameIntervals.push(intervalMs);
      if (this.sgraFrameIntervals.length > 180) this.sgraFrameIntervals.shift();
    }
    const dt = Math.min(0.1, Math.max(0.0001, (now - this.last) / 1000));
    this.last = now;
    const follower = this.panorama?.isPrimaryDisplay === false;
    const shared = follower ? this.panoramaSync?.latest : null;
    if (follower && (!shared || shared.sequence === this.lastPanoramaSequence)) return;
    if (shared) {
      this.lastPanoramaSequence = shared.sequence;
      this.time.jd = shared.jd;
      this.time.rate = shared.rate;
      this.time.paused = shared.paused;
      if (shared.starId !== this.universe.current.starId)
        this.universe.switchTo(shared.starId, this.time.jd, this.time.t);
    }

    // Simulation
    if (!follower) this.time.advance(dt);
    this.missions.update(this.time.jd, this.time.t);
    this.universe.update(this.time.jd, this.time.t);
    this.tours.update(dt);

    // Camera
    const eng = this.engine;
    const fovRad = eng.localVerticalFovRad;
    const cameraStarted = this.arrivalTrace ? performance.now() : 0;
    if (shared) {
      const reference = this.universe.get(shared.referenceId);
      const target = this.universe.get(shared.targetId);
      const landmark = target ? null : this.universe.landmark(shared.targetId);
      if (!reference || (!target && !landmark)) return;
      this.camera.position.fromArray(shared.position);
      this.camera.quaternion.fromArray(shared.orientation);
      if (this.camera.reference !== reference) this.camera.setReference(reference);
      this.camera.target = target ?? null;
      this.camera.anchor = landmark ? {
        position: this.universe.landmarkRelative(this.universe.landmarks.indexOf(landmark), new Vector3()),
        radius: landmark.def.radiusPc * PARSEC_KM * 0.3, name: landmark.def.name,
      } : null;
      this.camera.mode = 'orbit';
    } else if (this.surfacePreview) {
      this.surfacePreview.update(dt, this.time.paused);
    } else if (this.reach?.directing) {
      this.reach.update(dt, this.time.paused);
    } else {
      this.camera.update(this.reach && this.time.paused ? 0 : dt, this.input, eng.width, eng.height, fovRad);
      this.reach?.update(dt, this.time.paused);
    }
    const cameraMs = cameraStarted ? performance.now() - cameraStarted : 0;
    if (this.reach || shared) {
      if (shared) this.compositionShiftX = shared.compositionShiftX;
      else {
        const view = this.panorama;
        const primaryWidth = view?.viewportWidth ?? eng.width;
        const primaryCenter = view
          ? view.viewportOffsetX + primaryWidth / 2 : eng.width / 2;
        const target = reachCompositionTarget(this.reach!.countdown.destinationId,
          primaryWidth, primaryCenter, view?.totalPanoramaWidth ?? eng.width);
        this.compositionShiftX = this.compositionInitialized
          ? this.compositionShiftX + (target - this.compositionShiftX) * (1 - Math.exp(-dt / 2))
          : target;
      }
      this.compositionInitialized = true;
      eng.setCompositionShift(this.compositionShiftX);
    }
    if (this.reach && this.panoramaSync) {
      const countdown = this.reach.countdown;
      const position = this.camera.position;
      const orientation = this.camera.quaternion;
      this.panoramaSync.publish({
        jd: this.time.jd, rate: this.time.rate, paused: this.time.paused,
        starId: this.universe.current.starId,
        position: [position.x, position.y, position.z],
        orientation: [orientation.x, orientation.y, orientation.z, orientation.w],
        referenceId: this.camera.reference!.id, targetId: this.reach.cameraTargetId,
        destinationId: countdown.destinationId, phase: countdown.phase, secondsLeft: countdown.secondsLeft,
        compositionShiftX: this.compositionShiftX,
      });
    }
    if (this.reach && now - this.lastReachSave >= 30_000) this.checkpointReach();
    this.reachCountdown?.update(now);
    this.reachOdometer?.update(now);
    this.aimAtPin(dt, fovRad, eng.width / Math.max(1, eng.height));
    // backdrop bookkeeping: start circling once the return flight has arrived; any other flight
    // (or re-targeting) stops the auto-orbit, which ends the backdrop
    if (this.backdropPending && !this.camera.autopilot) {
      this.backdropPending = false;
      this.camera.autoOrbit = BACKDROP_ORBIT;
      this.backdrop = true;
    }
    if (this.backdrop && this.camera.autoOrbit === 0) this.backdrop = false;
    this.checkFrameSwitch(dt);
    eng.camera.quaternion.copy(this.camera.quaternion);
    eng.camera.position.set(0, 0, 0);
    eng.camera.updateMatrixWorld();

    const camPos = this.camPosTmp.copy(this.camera.position);
    const star = this.universe.star;
    const sunRel = new Vector3().copy(star.position).sub(camPos);
    const pxPerRad = eng.height / 2 / Math.tan(fovRad / 2);
    const s = this.settings;
    this.universe.toParsecs(camPos, this.camPc);

    // Galaxy-scale bookkeeping
    this.galaxyCheckAcc += dt;
    const galaxyStarted = this.arrivalTrace ? performance.now() : 0;
    if (this.galaxyCheckAcc >= 0.12) {
      this.galaxyCheckAcc = 0;
      this.updateGalaxyScale(false);
    }
    const galaxyMs = galaxyStarted ? performance.now() - galaxyStarted : 0;

    // Renderables
    const ov = this.tourOverrides;
    this.updateGhost(dt);
    if (this.pulse?.active) this.pulse.update(dt, camPos, pxPerRad);
    this.updateFill(dt);
    const g = this.ghost;
    const bodiesStarted = this.arrivalTrace ? performance.now() : 0;
    this.bodies.update(camPos, this.camera.quaternion, eng.camera, eng.height, fovRad, star.position, star.radius, this.sunColor, this.time.t / 3600, {
      atmospheres: s.atmospheres, clouds: ov.clouds ?? s.clouds, rings: s.rings, shadows: s.shadows, imagery: s.imagery,
      fill: this.fillOut.size ? this.fillOut : null,
      ghost: g ? { id: g.body.id, alpha: g.alpha * g.alpha * (3 - 2 * g.alpha) } : null,
    });
    this.surfacePreview?.render(this.bodies.byId.get('mars'), this.bodies.byId.get('perseverance'));
    const eligibleMeshes = this.arrivalTrace && this.universe.current.starId === 'c64548'
      ? this.bodies.views.filter((view) => view.meshVisible).map((view) => view.body.id).join(',') : '';
    const visualDestinationId = shared?.destinationId ?? this.reach?.countdown.destinationId;
    const visualPhase = shared?.phase ?? this.reach?.countdown.phase;
    const activeStop = REACH_ROUTE.stops.find((stop) => stop.id === visualDestinationId)
      ?? REACH_ROUTE.stops[0];
    const activeRef = activeStop ? destinationRef(activeStop) : null;
    const productionSingleStar = REACH_MODE && !REACH_PREVIEW_ROUTE && !REACH_PILOT
      && activeRef?.kind === 'star' && this.universe.current.starId === activeRef.starId;
    const hideGeneratedBodies = (REACH_HIDE_ENCOUNTER_PLANETS
      && this.universe.current.starId === REACH_STAR_ENCOUNTER_ID) || productionSingleStar;
    if (hideGeneratedBodies && this.universe.current.starId !== ALPHA_SYSTEM_ID) {
      suppressProximaPlanetMeshes(this.bodies.views, star.id);
    }
    const bodiesMs = bodiesStarted ? performance.now() - bodiesStarted : 0;
    this.updateLensing(fovRad);
    this.points.setPixelRatio(eng.pixelRatio);
    this.points.update(star.position, camPos, this.starLuminosity, hideGeneratedBodies);
    this.starPoints.setPixelRatio(eng.pixelRatio);
    const nextStop = activeStop;
    const nextRef = nextStop ? destinationRef(nextStop) : null;
    const starCruise = nextStop?.profile === 'star'
      && visualPhase === 'NEXT'
      && nextRef?.kind === 'star'
      && this.universe.current.starId === nextRef.starId;
    const starView = this.bodies.byId.get(star.id);
    const starRadiusPx = starView?.apparentRadiusPx ?? 0;
    const starAppearance = reachPilotStarAppearance(this.universe.current.catalogIndex,
      starRadiusPx, !!starCruise, REACH_NO_CORONA_BLEND);
    const presentation = nextRef?.kind === 'star' && this.universe.current.starId === nextRef.starId
      ? nextStop?.starPresentation : undefined;
    // Wall-clock phase stays smooth when simulation time accelerates and agrees across panorama windows.
    const [driftX, driftY, driftZ] = presentation ? reachStarVisualDrift(Date.now() / 1000) : [0, 0, 0];
    if (star.data.appearance.kind === 'star' && starView?.surfaceMat) {
      starView.surfaceMat.uniforms.uIntensity.value = 0.75 * starAppearance.discScale;
      starView.surfaceMat.uniforms.uDrift.value.set(driftX, driftY, driftZ);
      starView.surfaceMat.uniforms.uMotionStrength.value = presentation?.surfaceMotion ?? 0;
      starView.surfaceMat.uniforms.uColorWarmth.value = presentation?.colorWarmth ?? 0;
    }
    if (starView?.coronaMat) {
      starView.coronaMat.uniforms.uDrift.value.set(driftX, driftY, driftZ);
      starView.coronaMat.uniforms.uMotionStrength.value = presentation?.coronaMotion ?? 0;
      starView.coronaMat.uniforms.uColorWarmth.value = presentation?.colorWarmth ?? 0;
    }
    if (starCruise && !REACH_NO_CORONA_BLEND && starView?.coronaMat)
      starView.coronaMat.uniforms.uIntensity.value *= starAppearance.coronaScale;
    const alphaEncounter = REACH_MODE && (REACH_ALPHA_PREVIEW
      || this.universe.current.starId === ALPHA_SYSTEM_ID
      || visualDestinationId === REACH_ALPHA_DESTINATION_ID);
    if (alphaEncounter && this.universe.current.starId === ALPHA_SYSTEM_ID) {
      const aView = this.bodies.byId.get(`s${ALPHA_A_INDEX}-star`);
      const bView = this.bodies.byId.get(`s${ALPHA_B_INDEX}-star`);
      if (!aView || !bView) throw new Error('Alpha Centauri preview is missing a stellar renderer');
      const aAppearance = reachPilotStarAppearance(ALPHA_A_INDEX, aView.apparentRadiusPx, true, false);
      const bAppearance = reachPilotStarAppearance(ALPHA_B_INDEX, bView.apparentRadiusPx, true, false);
      const [x, y, z] = reachStarVisualDrift(Date.now() / 1000);
      for (const [view, appearance] of [[aView, aAppearance], [bView, bAppearance]] as const) {
        const isB = view === bView;
        if (view.surfaceMat) {
          view.surfaceMat.uniforms.uIntensity.value = (isB ? 0.62 : 0.75) * appearance.discScale;
          view.surfaceMat.uniforms.uDrift.value.set(x, y, z);
          view.surfaceMat.uniforms.uMotionStrength.value = 0.6;
          view.surfaceMat.uniforms.uColorWarmth.value = isB ? 0.27 : 0;
        }
        if (view.coronaMat) {
          view.coronaMat.uniforms.uIntensity.value *= appearance.coronaScale;
          view.coronaMat.uniforms.uDrift.value.set(x, y, z);
          view.coronaMat.uniforms.uMotionStrength.value = 0.2;
          view.coronaMat.uniforms.uColorWarmth.value = isB ? 0.18 : 0;
        }
      }
      this.starPoints.update(this.camPc, -1, ALPHA_A_INDEX, aAppearance.pointOpacity, aView.relPos,
        { index: ALPHA_B_INDEX, opacity: bAppearance.pointOpacity, direction: bView.relPos });
    } else if (alphaEncounter) {
      const binary = this.universe.system(ALPHA_SYSTEM_ID);
      binary.update(this.time.jd, this.time.t);
      const a = binary.get(`s${ALPHA_A_INDEX}-star`)!;
      const b = binary.get(`s${ALPHA_B_INDEX}-star`)!;
      this.starPoints.update(this.camPc, -1, ALPHA_A_INDEX, 1,
        alphaPointDirection(binary, a, this.universe.current.origin, camPos),
        { index: ALPHA_B_INDEX, opacity: 1,
          direction: alphaPointDirection(binary, b, this.universe.current.origin, camPos) });
    } else {
      this.starPoints.update(this.camPc, starAppearance.hideIndex,
        starAppearance.targetIndex, starAppearance.pointOpacity,
        starCruise ? starView?.relPos ?? null : null);
    }
    this.procPoints.update(this.camPc, eng.pixelRatio, this.universe.current.starId, dt);
    for (const c of this.clouds.values()) c.update(this.camPc, pxPerRad, eng.pixelRatio, s.milkyWay);
    this.galaxySprites.update(this.camPc, pxPerRad, eng.pixelRatio, this.galaxyBoost, this.universe.currentGalaxy ?? -1);
    this.landmarkSprites.update(this.camPc, pxPerRad, this.universe.current.starId, (gi) => this.galaxySprites.apparent(gi).ratio);
    this.nebulaClouds.update(this.camPc, pxPerRad, eng.pixelRatio, this.landmarkSprites.k, this.landmarkSprites.mesh.visible);
    if (REACH_MODE) this.updateAlphaMarkers();
    // bottom-left credit: streamed planetary imagery first, otherwise a resolved landmark photograph
    if (this.bodies.imageryCredit) this.ui.setImageryCredit(this.bodies.imageryCredit);
    else {
      this.camForward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const photo = this.landmarkSprites.photoCredit(this.camForward);
      this.ui.setImageryCredit(photo ? _('Fotoğraf: {source}', { source: photo }) : null, true);
    }
    // LOD hand-over between the detailed local volume and the aggregated far-universe tiers
    const dSunPc = this.camPc.length();
    this.galaxySprites.setFade(localFade(dSunPc));
    this.farSprites.forEach((sp, k) => {
      sp.setFade(this.farUniverse.tiers[k].fade(dSunPc));
      sp.update(this.camPc, pxPerRad, eng.pixelRatio, this.galaxyBoost, -1);
    });
    const orbitStarted = this.arrivalTrace ? performance.now() : 0;
    this.orbits.update(camPos, !(REACH_MODE && this.universe.current.starId === ALPHA_SYSTEM_ID)
      && !hideGeneratedBodies
      && (ov.orbits ?? (s.orbits || this.backdrop || this.backdropPending)),
      ov.moonOrbits ?? s.moonOrbits, pxPerRad, (id) => this.bodies.byId.get(id)?.apparentRadiusPx ?? 0,
      this.selected?.id ?? null, REACH_MODE && this.universe.current.starId === 'c0');
    const orbitMs = orbitStarted ? performance.now() - orbitStarted : 0;
    this.trajectories.update(camPos, this.time.jd, this.missions.lookup, s.orbits, eng.width * eng.pixelRatio, eng.height * eng.pixelRatio);
    this.belts.update(this.time.t, sunRel, eng.pixelRatio, s.belts && !hideGeneratedBodies);

    // Render
    const renderStarted = this.arrivalTrace ? performance.now() : 0;
    eng.render();
    const renderMs = renderStarted ? performance.now() - renderStarted : 0;

    if (this.wantScreenshot) {
      this.wantScreenshot = false;
      this.saveScreenshot();
    }

    // Overlay & UI
    let starSel: StarSelectionScreen | null = null;
    if (this.selectedStar !== null) {
      this.starSel.name = this.universe.starName(this.selectedStar);
      this.universe.starRelative(this.selectedStar, camPos, this.starSel.dir).normalize();
      this.starSel.kind = 'star';
      this.starSel.radiusPx = 0;
      starSel = this.starSel;
    } else if (this.selectedGalaxy !== null) {
      const i = this.selectedGalaxy;
      this.starSel.name = this.universe.galaxies.name(i);
      this.galaxySprites.direction(i, this.starSel.dir);
      this.starSel.kind = 'galaxy';
      this.starSel.radiusPx = Math.min(this.galaxySprites.apparent(i).angRad * pxPerRad, eng.height);
      starSel = this.starSel;
    } else if (this.selectedLandmark !== null) {
      const i = this.selectedLandmark;
      this.starSel.name = this.universe.landmarks[i].def.name;
      this.landmarkSprites.direction(i, this.starSel.dir);
      this.starSel.kind = 'landmark';
      this.starSel.radiusPx = Math.min(this.landmarkSprites.angularRadius(i) * pxPerRad, eng.height);
      starSel = this.starSel;
    }
    const namedStars = this.procPoints.namedStars.length
      ? this.starPoints.namedStars.concat(this.procPoints.namedStars)
      : this.starPoints.namedStars;
    // tour surface pin: world point on the body, hidden when it faces away from us
    const pin = this.pinScreen;
    pin.visible = false;
    if (this.surfacePin) {
      // fade in over 0.6 s, out over 0.5 s
      this.pinAlpha = this.pinLeaving ? this.pinAlpha - dt / 0.5 : Math.min(1, this.pinAlpha + dt / 0.6);
      if (this.pinAlpha <= 0) { this.surfacePin = null; this.pinLeaving = false; this.pinAlpha = 0; }
    }
    if (this.surfacePin) {
      const b = this.universe.get(this.surfacePin.bodyId);
      if (b) {
        const sp = this.surfacePin;
        const n = this.pinDirection(b, sp.lat, sp.lon, !!sp.storm, this.camForward);
        const toCam = new Vector3().copy(camPos).sub(b.position).addScaledVector(n, -b.radius);
        pin.visible = n.dot(toCam) > 0;
        pin.dir.copy(b.position).addScaledVector(n, b.radius).sub(camPos);
        pin.label = _(sp.label);
        pin.alpha = this.pinAlpha;
      }
    }
    this.overlay.draw(this.bodies.views, eng.camera, this.selected, namedStars, starSel, this.uiVisible, s.galaxies ? this.galaxySprites.named : [], this.blackHoleMarkers(camPos), this.landmarkSprites.named, pin.visible ? pin : null);
    if (this.reachScale && this.reach?.terminalObservation
      && visualDestinationId === REACH_PREVIEW_ROUTE?.stops[1]?.id && starView)
      this.reachScale.draw(starView, eng.camera, eng.width, eng.height, this.overlay.dpr);
    const selDist = this.selected ? this.bodies.byId.get(this.selected.id)?.distance ?? 0 : 0;
    if (!REACH_MODE) this.ui.update(now, dt, selDist);
    else if (this.reach) {
      const observation = this.reach.observation;
      const target = reachInfoTarget(observation, this.panorama?.isPrimaryDisplay !== false, destinationRef);
      const targetSystem = target?.kind === 'star' ? target.starId
        : target?.kind === 'landmark' ? 'c0' : target?.systemId;
      const landmarkIndex = target?.kind === 'landmark'
        ? this.universe.landmarks.findIndex((entry) => entry.def.id === target.landmarkId) : -1;
      const body = targetSystem === this.universe.current.starId
        ? target?.kind === 'star' ? this.universe.current.star
          : target?.kind === 'body' ? this.universe.get(target.bodyId) : null
        : null;
      const placement = body || landmarkIndex >= 0 ? (() => {
        const landmark = landmarkIndex >= 0 ? this.universe.landmarks[landmarkIndex] : null;
        const relative = landmark ? this.universe.landmarkRelative(landmarkIndex, camPos)
          : new Vector3().subVectors(body!.position, camPos);
        const projected = relative.project(eng.camera);
        const radius = landmark ? this.landmarkSprites.angularRadius(landmarkIndex) * pxPerRad
          : this.bodies.byId.get(body!.id)?.apparentRadiusPx
            ?? Math.atan2(body!.radius, body!.position.distanceTo(camPos)) * pxPerRad;
        return reachInfoPlacement(projected.x, projected.y, radius,
          eng.width, eng.height, this.reachInfoSide);
      })() : null;
      if (placement) this.reachInfoSide = placement.side;
      this.ui.updateReachInfo(body ?? null, target?.kind === 'star' && body ? target.starId : null,
        placement, reachInfoOpacity(observation), landmarkIndex >= 0 ? landmarkIndex : null);
    }
    if (this.arrivalTrace && this.universe.current.starId === 'c64548') {
      const view = this.bodies.byId.get(star.id);
      const flight = this.camera.autopilot;
      this.arrivalTrace.frame({ ms: performance.now(), intervalMs, frameMs: performance.now() - frameStarted,
        cameraMs, bodiesMs, galaxyMs, orbitMs,
        visibleOrbits: this.orbits.lines.filter((line) => line.line.visible).length,
        visibleMeshes: this.bodies.views.filter((view) => view.meshVisible)
          .map((view) => view.body.id).join(','),
        eligibleMeshes,
        visiblePlanetMeshes: this.bodies.views.filter((view) => view.meshVisible && view.body.id !== star.id)
          .map((view) => view.body.id).join(','),
        geometries: eng.renderer.info.memory.geometries,
        textures: eng.renderer.info.memory.textures,
        programs: eng.renderer.info.programs?.length ?? 0,
        drawCalls: eng.renderer.info.render.calls,
        renderMs, distanceKm: view?.distance ?? 0, radiusPx: starRadiusPx,
        point: starAppearance.targetIndex !== -1,
        pointOpacity: starAppearance.targetIndex !== -1 ? starAppearance.pointOpacity : 0,
        corona: view?.corona?.visible ?? false,
        coronaIntensity: view?.coronaMat?.uniforms.uIntensity.value ?? 0,
        mesh: view?.meshVisible ?? false,
        phase: this.reach?.countdown.phase ?? 'none', flightS: flight ? flight.duration - flight.t : null,
        visibility: document.visibilityState },
      this.camera.position, this.camera.quaternion);
    }
    if (this.sgraDiagnostics && now - this.sgraLastDiagnostic >= 1000) {
      this.sgraLastDiagnostic = now;
      this.sgraDiagnostics.textContent = JSON.stringify({ ...this.reach?.sagittariusPreviewStatus,
        fps: this.sgraFrameIntervals.length
          ? 1000 * this.sgraFrameIntervals.length
            / this.sgraFrameIntervals.reduce((sum, interval) => sum + interval, 0) : null,
        viewport: [eng.width, eng.height],
        drawingBuffer: [eng.renderer.domElement.width, eng.renderer.domElement.height],
        quality: eng.blackHole.quality, lensing: eng.blackHole.enabled,
      });
    }
  };

  /** Hand the most prominent black hole in the current system to the lensing pass. */
  private updateLensing(fovRad: number): void {
    const eng = this.engine;
    let best: BodyView | null = null;
    let bestScore = 0;
    for (const v of this.bodies.views) {
      if (v.body.data.type !== 'blackhole') continue;
      // Einstein angle ∝ sqrt(r_s / D)
      const score = Math.sqrt(v.body.radius / Math.max(v.distance, 1e-3));
      if (score > bestScore) { bestScore = score; best = v; }
    }
    if (!best) { eng.blackHole.enabled = false; return; }
    eng.blackHole.target(best.body, best.relPos, this.camera.quaternion, fovRad, eng.camera.aspect, eng.height, this.time.t / 3600);
  }

  /** Sky markers for black holes that live in other systems (the current one is a body). */
  private blackHoleMarkers(camPos: Vector3): NamedStarScreen[] {
    const u = this.universe;
    const out = this.bhMarkers;
    out.length = 0;
    for (let i = 0; i < u.blackHoles.length; i++) {
      const bh = u.blackHoles[i];
      if (bh.systemStarId === u.current.starId) continue;
      let m = this.bhMarkerPool[i];
      if (!m) { m = { index: -1, name: bh.entry.name, dir: new Vector3(), mag: 0 }; this.bhMarkerPool[i] = m; }
      u.starRelative(bh.systemStarId, camPos, m.dir).normalize();
      out.push(m);
    }
    return out;
  }

  private readonly bhMarkers: NamedStarScreen[] = [];
  private readonly bhMarkerPool: NamedStarScreen[] = [];

  private saveScreenshot(): void {
    try {
      const url = this.engine.renderer.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      const stamp = this.time.formatDate().replace(/[: ]/g, '-');
      a.download = `yeits-${stamp}.png`;
      a.href = url;
      a.click();
      this.ui.showToast(_('Ekran görüntüsü kaydedildi'));
    } catch {
      this.ui.showToast(_('Ekran görüntüsü alınamadı'));
    }
  }
}

async function boot(): Promise<void> {
  if (REACH_MODE) {
    document.body.classList.add('reach-mode');
    const ui = document.getElementById('ui');
    if (ui) ui.inert = true;
  }
  const loaderText = document.querySelector('#loader .loader-text');
  try {
    await initI18n();
    applyDom();
    document.title = REACH_MODE ? 'The Reach Screensaver' : _('Your Eyes In Space — Gözlemlenebilir evreni tarayıcıda gez');
    if (loaderText && !REACH_MODE) loaderText.textContent = _('Yıldız kataloğu yükleniyor…');
    const catalog = await StarCatalog.load(import.meta.env.BASE_URL);
    if (loaderText && !REACH_MODE) loaderText.textContent = _('Evren hazırlanıyor…');
    const diagnosticJourney = REACH_INSPECT_ID
      ? await fetch(`/validation/reach-v4/${REACH_INSPECT_ID}.json`).then((response) => {
        if (!response.ok) throw new Error(`Reach inspection checkpoint HTTP ${response.status}`);
        return response.json() as Promise<ReachJourneyState>;
      })
      : REACH_FLICKER
      ? await fetch('/validation/flicker/halley-to-sun-110s.json').then((response) => {
        if (!response.ok) throw new Error(`Diagnostic checkpoint HTTP ${response.status}`);
        return response.json() as Promise<ReachJourneyState>;
      }) : null;
    const app = new App(catalog, diagnosticJourney);
    if (REACH_FLICKER) void import('./dev/reach-flicker').then(({ runReachFlicker }) => runReachFlicker(app));
    // Keep the interactive debug handle out of passive Reach mode.
    if (!REACH_MODE) (window as unknown as { yeits: App }).yeits = app;
  } catch (err) {
    console.error(err);
    if (REACH_MODE) document.documentElement.classList.add('reach-load-error');
    if (loaderText) loaderText.textContent = REACH_MODE
      ? `The Reach could not start: ${err instanceof Error ? err.message : String(err)}`
      : `${_('Yükleme hatası')}: ${(err as Error).message}`;
  }
}

void boot();
