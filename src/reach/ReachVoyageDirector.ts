import { Matrix4, Quaternion, Vector3 } from 'three';
import type { CameraController } from '../camera/CameraController';
import type { CelestialBody } from '../core/CelestialBody';
import { DAY_S } from '../core/constants';
import { StarSystem } from '../core/StarSystem';
import type { TimeSystem } from '../core/TimeSystem';
import type { Universe } from '../core/Universe';
import { SOLAR_SYSTEM } from '../data/solarSystem';
import {
  REACH_ITINERARY_ID, REACH_ITINERARY_VERSION,
  type JourneyPhase, type Quat, type ReachFlightState, type ReachJourneyState, type Vec3,
} from './JourneyState';
import { ReachTiming, type ReachTimingDestination } from './ReachTiming';
import { geometricLegKm, type ReachDistanceLeg } from './ReachOdometer';

type Stop = ReachTimingDestination;

// Route order and presentation profile only. Durations come from ReachTiming.
export const REACH_ITINERARY: readonly Stop[] = [
  { id: 'earth', profile: 'planet' },
  { id: 'moon', profile: 'moon' },
  { id: 'mars', profile: 'planet' },
  { id: 'phobos', profile: 'moon' },
  { id: 'deimos', profile: 'moon' },
  { id: 'vesta', profile: 'small' },
  { id: 'ceres', profile: 'planet' },
  { id: 'jupiter', profile: 'planet' },
  { id: 'io', profile: 'moon' },
  { id: 'europa', profile: 'moon' },
  { id: 'ganymede', profile: 'moon' },
  { id: 'callisto', profile: 'moon' },
  { id: 'saturn', profile: 'planet' },
  { id: 'mimas', profile: 'moon' },
  { id: 'enceladus', profile: 'moon' },
  { id: 'tethys', profile: 'moon' },
  { id: 'dione', profile: 'moon' },
  { id: 'rhea', profile: 'moon' },
  { id: 'titan', profile: 'moon' },
  { id: 'iapetus', profile: 'moon' },
  { id: 'uranus', profile: 'planet' },
  { id: 'miranda', profile: 'moon' },
  { id: 'ariel', profile: 'moon' },
  { id: 'umbriel', profile: 'moon' },
  { id: 'titania', profile: 'moon' },
  { id: 'oberon', profile: 'moon' },
  { id: 'neptune', profile: 'planet' },
  { id: 'triton', profile: 'moon' },
  { id: 'pluto', profile: 'planet' },
  { id: 'charon', profile: 'moon' },
  { id: 'haumea', profile: 'planet' },
  { id: 'makemake', profile: 'planet' },
  { id: 'eris', profile: 'planet' },
  { id: 'pioneer11', profile: 'probe' },
  { id: 'pioneer10', profile: 'probe' },
  { id: 'voyager2', profile: 'probe' },
  { id: 'voyager1', profile: 'probe' },
  { id: 'halley', profile: 'small' },
  { id: 'sun', profile: 'sun' },
  { id: 'mercury', profile: 'planet' },
  { id: 'venus', profile: 'planet' },
];

const OBSERVATION_ORBIT = 0.012;
const MOON_FLYBY_RATE = 0.025;
const MIN_SUNLIT_DOT = 0.2; // correct views with less than 60% of the disk visible
const TARGET_SUNLIT_DOT = 0.6; // 80% of the disk visible
function smoothstep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}
const vec = (v: Vector3): Vec3 => [v.x, v.y, v.z];
const quat = (q: Quaternion): Quat => [q.x, q.y, q.z, q.w];

/** A passive, repeating Solar System voyage, independent of missions and tours. */
export class ReachVoyageDirector {
  private readonly arrivalSystem = new StarSystem('reach-arrival', 'c0', 0, new Vector3(), SOLAR_SYSTEM, [], []);
  private stop = 0;
  private stage: 'observe' | 'flyby' | 'departure' | 'cruise' = 'observe';
  private observeLeft = 0;
  private observeDuration = 0;
  private completedKm = 0;
  private roundTripCount = 0;
  private leg: ReachDistanceLeg | null = null;
  private flyby: {
    body: CelestialBody; offset: Vector3; orientation: Quaternion; up: Vector3;
    elapsed: number; duration: number;
  } | null = null;
  private departure: {
    source: CelestialBody; next: number; offset: Vector3; orientation: Quaternion; up: Vector3;
    orbitRate: number; radialSpeed: number; endRadius: number; duration: number; elapsed: number;
  } | null = null;

  get directing(): boolean { return this.stage === 'departure' || this.stage === 'flyby'; }
  get roundTrips(): number { return this.roundTripCount; }
  get distanceTravelledKm(): number {
    const flight = this.stage === 'cruise' ? this.camera.autopilot : null;
    const progress = flight && flight.duration > 0 ? Math.min(1, Math.max(0, flight.t / flight.duration)) : 0;
    return this.completedKm + (this.leg?.distanceKm ?? 0) * progress;
  }

  get countdown(): { phase: 'NEXT' | 'DEPART' | 'CRUISE'; destinationId: string; routeIndex: number; secondsLeft: number } {
    if (this.stage === 'departure') {
      const d = this.departure!;
      return { phase: 'CRUISE', destinationId: REACH_ITINERARY[d.next].id,
        routeIndex: d.next, secondsLeft: d.duration - d.elapsed };
    }
    const destinationId = REACH_ITINERARY[this.stop].id;
    if (this.stage === 'flyby') return { phase: 'DEPART', destinationId,
      routeIndex: this.stop, secondsLeft: this.flyby!.duration - this.flyby!.elapsed };
    if (this.stage === 'observe') return { phase: 'DEPART', destinationId,
      routeIndex: this.stop, secondsLeft: this.observeLeft };
    const flight = this.camera.autopilot;
    return { phase: 'NEXT', destinationId, routeIndex: this.stop,
      secondsLeft: flight ? flight.duration - flight.t : 0 };
  }

  constructor(
    private readonly universe: Universe, private readonly camera: CameraController, private readonly time: TimeSystem,
    private readonly timing: ReachTiming,
    saved?: ReachJourneyState | null, private readonly onPhaseChange?: () => void,
  ) {
    for (const stop of REACH_ITINERARY) this.body(stop.id);
    if (saved) { this.restore(saved); return; }
    const earth = this.body('earth');
    const sunward = new Vector3().subVectors(universe.star.position, earth.position).normalize();
    const view = sunward.addScaledVector(earth.pole, 0.25).normalize();
    camera.placeAt(earth, view.multiplyScalar(earth.radius * 4));
    camera.autoOrbit = OBSERVATION_ORBIT;
    this.observeDuration = this.timing.observe(REACH_ITINERARY[0]);
    this.observeLeft = this.observeDuration;
  }

  capture(): ReachJourneyState {
    const current = REACH_ITINERARY[this.stop];
    const c = this.camera;
    if (!c.reference || !c.target) throw new Error('Reach camera has no reference or target');
    let phase: JourneyPhase;
    let flight: ReachFlightState | null = null;
    if (this.stage === 'observe') {
      phase = { kind: 'observe', elapsed: this.observeDuration - this.observeLeft, duration: this.observeDuration };
    } else if (this.stage === 'flyby') {
      const f = this.flyby!;
      phase = { kind: 'flyby', bodyId: f.body.id, offset: vec(f.offset), orientation: quat(f.orientation),
        up: vec(f.up), elapsed: f.elapsed, duration: f.duration };
    } else if (this.stage === 'departure') {
      const d = this.departure!;
      phase = { kind: 'departure', sourceId: d.source.id, nextId: REACH_ITINERARY[d.next].id,
        offset: vec(d.offset), orientation: quat(d.orientation), up: vec(d.up),
        orbitRate: d.orbitRate, radialSpeed: d.radialSpeed, endRadius: d.endRadius,
        elapsed: d.elapsed, duration: d.duration };
    } else {
      const ap = c.autopilot;
      if (!ap || ap.kind !== 'goto' || !ap.target) throw new Error('Reach cruise has no body flight');
      phase = { kind: 'cruise', elapsed: ap.t, duration: ap.duration };
      flight = { targetId: ap.target.id, elapsed: ap.t, duration: ap.duration,
        startOffset: vec(ap.r0), endDirection: vec(ap.dir1), endDistance: ap.dist1,
        startOrientation: quat(ap.q0), up: ap.up1 ? vec(ap.up1) : null,
        gentleStart: ap.gentleStart ?? false };
    }
    return {
      schema: 1, itinerary: { id: REACH_ITINERARY_ID, version: REACH_ITINERARY_VERSION },
      destinationId: current.id, routeIndex: this.stop, phase,
      simulation: { jd: this.time.jd, rate: this.time.rate },
      frame: { starId: this.universe.current.starId },
      odometer: { completedKm: this.completedKm, roundTrips: this.roundTripCount,
        leg: this.leg ? { ...this.leg } : null },
      camera: { position: vec(c.position), orientation: quat(c.quaternion),
        referenceId: c.reference.id, targetId: c.target.id, autoOrbit: c.autoOrbit, flight },
    };
  }

  private restore(saved: ReachJourneyState): void {
    this.stop = REACH_ITINERARY.findIndex((stop) => stop.id === saved.destinationId);
    this.completedKm = saved.odometer?.completedKm ?? 0;
    this.roundTripCount = saved.odometer?.roundTrips ?? 0;
    this.leg = saved.odometer?.leg ? { ...saved.odometer.leg } : null;
    if (!saved.odometer && (saved.phase.kind === 'departure' || saved.phase.kind === 'cruise')) {
      const fromId = saved.phase.kind === 'departure' ? saved.destinationId
        : REACH_ITINERARY[(this.stop - 1 + REACH_ITINERARY.length) % REACH_ITINERARY.length].id;
      const toId = saved.phase.kind === 'departure' ? saved.phase.nextId : saved.destinationId;
      this.leg = this.makeLeg(fromId, toId);
    }
    const c = this.camera;
    c.position.fromArray(saved.camera.position);
    c.quaternion.fromArray(saved.camera.orientation);
    c.setReference(this.body(saved.camera.referenceId));
    c.target = this.body(saved.camera.targetId);
    c.anchor = null;
    c.mode = 'orbit';
    c.autoOrbit = saved.camera.autoOrbit;
    const flight = saved.camera.flight;
    c.autopilot = flight ? {
      kind: 'goto', target: this.body(flight.targetId), point: null,
      t: flight.elapsed, duration: flight.duration,
      r0: new Vector3().fromArray(flight.startOffset),
      dir1: new Vector3().fromArray(flight.endDirection), dist1: flight.endDistance,
      q0: new Quaternion().fromArray(flight.startOrientation),
      up1: flight.up ? new Vector3().fromArray(flight.up) : undefined,
      gentleStart: flight.gentleStart,
    } : null;

    const phase = saved.phase;
    this.stage = phase.kind;
    if (phase.kind === 'observe') {
      this.observeDuration = phase.duration;
      this.observeLeft = phase.duration - phase.elapsed;
    } else if (phase.kind === 'flyby') {
      this.flyby = { body: this.body(phase.bodyId), offset: new Vector3().fromArray(phase.offset),
        orientation: new Quaternion().fromArray(phase.orientation), up: new Vector3().fromArray(phase.up),
        elapsed: phase.elapsed, duration: phase.duration };
    } else if (phase.kind === 'departure') {
      this.departure = { source: this.body(phase.sourceId),
        next: REACH_ITINERARY.findIndex((stop) => stop.id === phase.nextId),
        offset: new Vector3().fromArray(phase.offset),
        orientation: new Quaternion().fromArray(phase.orientation), up: new Vector3().fromArray(phase.up),
        orbitRate: phase.orbitRate, radialSpeed: phase.radialSpeed, endRadius: phase.endRadius,
        elapsed: phase.elapsed, duration: phase.duration };
    }
  }

  update(dt: number, paused: boolean): void {
    if (paused) return;
    if (this.stage === 'departure') { this.updateDeparture(dt); return; }
    if (this.stage === 'flyby') { this.updateFlyby(dt); return; }
    if (this.stage === 'cruise') {
      if (this.camera.autopilot) return;
      if (this.leg && this.leg.toId === REACH_ITINERARY[this.stop].id) {
        this.completedKm += this.leg.distanceKm;
        this.leg = null;
      }
      const stop = REACH_ITINERARY[this.stop];
      if (stop.profile === 'moon') {
        const body = this.body(stop.id);
        this.flyby = {
          body, offset: new Vector3().subVectors(this.camera.position, body.position),
          orientation: this.camera.quaternion.clone(),
          up: new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize(),
          elapsed: 0, duration: this.timing.observe(stop),
        };
        this.stage = 'flyby';
      } else {
        this.stage = 'observe';
        this.observeDuration = this.timing.observe(stop);
        this.observeLeft = this.observeDuration;
        this.camera.autoOrbit = stop.profile === 'probe' ? OBSERVATION_ORBIT * 0.5 : OBSERVATION_ORBIT;
      }
      this.onPhaseChange?.();
      return;
    }
    this.observeLeft -= dt;
    if (this.observeLeft <= 0) this.beginDeparture(0, this.camera.autoOrbit);
  }

  private updateFlyby(dt: number): void {
    const f = this.flyby!;
    f.elapsed = Math.min(f.duration, f.elapsed + dt);
    const orbit = new Quaternion().setFromAxisAngle(f.up, MOON_FLYBY_RATE * f.elapsed);
    const radius = f.offset.length() * (1 + 0.45 * f.elapsed / f.duration);
    this.camera.position.copy(f.body.position).add(f.offset.clone().applyQuaternion(orbit).setLength(radius));
    this.camera.quaternion.copy(f.orientation).premultiply(orbit);
    if (f.elapsed < f.duration) return;
    const radialSpeed = f.offset.length() * 0.45 / f.duration;
    this.flyby = null;
    this.beginDeparture(radialSpeed, MOON_FLYBY_RATE);
  }

  private beginDeparture(radialSpeed: number, orbitRate: number): void {
    const source = this.body(REACH_ITINERARY[this.stop].id);
    const next = (this.stop + 1) % REACH_ITINERARY.length;
    this.leg = this.makeLeg(source.id, REACH_ITINERARY[next].id);
    const offset = new Vector3().subVectors(this.camera.position, source.position);
    const isMoon = REACH_ITINERARY[this.stop].profile === 'moon';
    const duration = this.timing.departure(REACH_ITINERARY[this.stop]);
    this.departure = {
      source, next, offset,
      orientation: this.camera.quaternion.clone(),
      up: new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize(),
      orbitRate, radialSpeed,
      endRadius: Math.max(offset.length() * (isMoon ? 4 : 6), source.radius * 20),
      duration, elapsed: 0,
    };
    this.camera.autoOrbit = 0;
    this.stage = 'departure';
    this.onPhaseChange?.();
  }

  private updateDeparture(dt: number): void {
    const d = this.departure!;
    d.elapsed = Math.min(d.duration, d.elapsed + dt);
    const u = d.elapsed / d.duration;
    const orbitAngle = d.orbitRate * d.duration * (u - u * u + u * u * u / 3);
    const orbit = new Quaternion().setFromAxisAngle(d.up, orbitAngle);
    // Cubic Hermite radius inherits flyby speed and finishes with zero radial speed.
    const startRadius = d.offset.length();
    const radius = startRadius + d.radialSpeed * d.duration * (u - 2 * u * u + u * u * u)
      + (d.endRadius - startRadius) * smoothstep(u);
    const offset = d.offset.clone().applyQuaternion(orbit).setLength(radius);
    this.camera.position.copy(d.source.position).add(offset);

    const orbitOrientation = d.orientation.clone().premultiply(orbit);
    const destination = this.body(REACH_ITINERARY[d.next].id);
    const direction = new Vector3().subVectors(destination.position, this.camera.position);
    const up = new Vector3(0, 1, 0).applyQuaternion(orbitOrientation);
    const facing = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(), direction, up));
    this.camera.quaternion.copy(orbitOrientation).slerp(facing, 0.3 * smoothstep((u - 0.2) / 0.8));

    if (u < 1) return;
    this.departure = null;
    this.stop = d.next;
    const stop = REACH_ITINERARY[this.stop];
    const fromDestination = new Vector3().subVectors(this.camera.position, destination.position).normalize();
    // Moon approach is on the outside of its parent orbit, with the planet behind the subject.
    const approach = stop.profile === 'moon' && destination.parent
      ? new Vector3().subVectors(destination.position, destination.parent.position).normalize()
      : fromDestination;
    const distance = stop.profile === 'sun' ? destination.radius * 40
      : stop.profile === 'probe' ? destination.radius * 4.5
      : stop.profile === 'moon' ? destination.radius * 5
      : Math.max(destination.radius * 3.6, (destination.data.rings?.outer ?? 0) * 2.2);
    const flightDuration = this.timing.travel(stop);
    const arrival = this.sunlitArrivalDirection(stop, approach, fromDestination, distance, flightDuration);
    this.camera.goToVantage(destination, arrival, distance, flightDuration, undefined, true);
    this.stage = 'cruise';
    this.onPhaseChange?.();
  }

  private sunlitArrivalDirection(stop: Stop, proposed: Vector3, incoming: Vector3, distance: number, flightDuration: number): Vector3 {
    if (stop.profile === 'probe' || stop.profile === 'sun') return proposed;

    // Predict once at departure. Keep the chosen endpoint fixed throughout the flight.
    const advance = flightDuration * this.time.effectiveRate;
    this.arrivalSystem.update(this.time.jd + advance / DAY_S, this.time.t + advance);
    const body = this.arrivalSystem.get(stop.id)!;
    const toSun = new Vector3().subVectors(this.arrivalSystem.star.position, body.position).normalize();
    if (proposed.dot(toSun) >= MIN_SUNLIT_DOT) return proposed;

    // Closest three-quarter direction to the existing composition. An incoming
    // tangent resolves the rare case where the original direction is anti-solar.
    const tangent = proposed.clone().addScaledVector(toSun, -proposed.dot(toSun));
    if (tangent.lengthSq() < 1e-6) tangent.copy(incoming).addScaledVector(toSun, -incoming.dot(toSun));
    if (tangent.lengthSq() < 1e-6) tangent.copy(body.pole).addScaledVector(toSun, -body.pole.dot(toSun));
    if (tangent.lengthSq() < 1e-6) tangent.crossVectors(Math.abs(toSun.x) < 0.9
      ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0), toSun);
    tangent.normalize();
    const vantage = (side: Vector3) => toSun.clone().multiplyScalar(TARGET_SUNLIT_DOT)
      .addScaledVector(side, Math.sqrt(1 - TARGET_SUNLIT_DOT ** 2)).normalize();
    const preferred = vantage(tangent);
    if (stop.profile !== 'moon' || this.moonArrivalClear(stop, preferred, distance, flightDuration)) return preferred;

    // Keep the same phase angle while looking for a parent-safe side of the moon.
    for (let step = 1; step <= 12; step++) {
      for (const sign of [1, -1]) {
        const side = tangent.clone().applyAxisAngle(toSun, sign * step * Math.PI / 12);
        const alternative = vantage(side);
        if (this.moonArrivalClear(stop, alternative, distance, flightDuration)) return alternative;
      }
    }
    return proposed;
  }

  private moonArrivalClear(stop: Stop, direction: Vector3, distance: number, flightDuration: number): boolean {
    const current = this.body(stop.id);
    const offset = this.camera.position.clone().sub(current.position);
    const startDirection = offset.clone().normalize();
    const angle = Math.acos(Math.min(1, Math.max(-1, startDirection.dot(direction))));
    const sine = Math.sin(angle);
    const advance = flightDuration * this.time.effectiveRate;

    // Sample the same radial and angular easing as CameraController's fixed
    // vantage flight, using the moon and parent at each predicted time.
    for (let i = 0; i <= 32; i++) {
      const raw = i / 32;
      const progress = raw < 0.25 ? raw * smoothstep(raw / 0.25) : raw;
      const s = smoothstep(progress);
      const radius = Math.exp((1 - s) * Math.log(Math.max(offset.length(), 1e-3)) + s * Math.log(distance));
      const flightDirection = angle < 1e-4 ? startDirection.clone()
        : startDirection.clone().multiplyScalar(Math.sin((1 - s) * angle) / sine)
          .addScaledVector(direction, Math.sin(s * angle) / sine);
      this.arrivalSystem.update(this.time.jd + advance * raw / DAY_S, this.time.t + advance * raw);
      const moon = this.arrivalSystem.get(stop.id)!;
      const parent = moon.parent!;
      const camera = moon.position.clone().addScaledVector(flightDirection, radius);
      if (camera.distanceTo(parent.position) <= parent.radius * 1.1) return false;

      if (i === 32) {
        const toMoon = moon.position.clone().sub(camera);
        const toParent = parent.position.clone().sub(camera);
        if (toParent.length() < toMoon.length()) {
          const separation = toMoon.angleTo(toParent);
          const apparentRadii = Math.asin(Math.min(1, moon.radius / toMoon.length()))
            + Math.asin(Math.min(1, parent.radius / toParent.length()));
          if (separation < apparentRadii) return false;
        }
      }
    }
    return true;
  }

  private body(id: string): CelestialBody {
    const body = this.universe.get(id);
    if (!body) throw new Error(`Reach destination missing: ${id}`);
    return body;
  }

  private makeLeg(fromId: string, toId: string): ReachDistanceLeg {
    return { fromId, toId, departureJd: this.time.jd,
      distanceKm: geometricLegKm(this.universe.current.origin, this.body(fromId).position, this.body(toId).position) };
  }
}
