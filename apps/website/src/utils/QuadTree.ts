/**
 * QuadTree implementation for efficient spatial partitioning
 * Used to optimize particle connection calculations in canvas animations
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

export class QuadTree<T extends Point> {
  private boundary: Rectangle;
  private capacity: number;
  private points: T[] = [];
  private divided = false;
  private northeast?: QuadTree<T>;
  private northwest?: QuadTree<T>;
  private southeast?: QuadTree<T>;
  private southwest?: QuadTree<T>;

  constructor(boundary: Rectangle, capacity = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
  }

  insert(point: T): boolean {
    if (!this.contains(this.boundary, point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northeast!.insert(point) ||
      this.northwest!.insert(point) ||
      this.southeast!.insert(point) ||
      this.southwest!.insert(point)
    );
  }

  query(range: Rectangle, found: T[] = []): T[] {
    if (!this.intersects(this.boundary, range)) {
      return found;
    }

    for (const point of this.points) {
      if (this.contains(range, point)) {
        found.push(point);
      }
    }

    if (this.divided) {
      this.northeast!.query(range, found);
      this.northwest!.query(range, found);
      this.southeast!.query(range, found);
      this.southwest!.query(range, found);
    }

    return found;
  }

  queryRadius(x: number, y: number, radius: number): T[] {
    const range: Rectangle = {
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2
    };

    const candidates = this.query(range);

    // Filter to actual circle radius
    return candidates.filter(point => {
      const dx = point.x - x;
      const dy = point.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  private subdivide(): void {
    const { x, y, width, height } = this.boundary;
    const hw = width / 2;
    const hh = height / 2;

    this.northeast = new QuadTree<T>({ x: x + hw, y, width: hw, height: hh }, this.capacity);
    this.northwest = new QuadTree<T>({ x, y, width: hw, height: hh }, this.capacity);
    this.southeast = new QuadTree<T>({ x: x + hw, y: y + hh, width: hw, height: hh }, this.capacity);
    this.southwest = new QuadTree<T>({ x, y: y + hh, width: hw, height: hh }, this.capacity);

    this.divided = true;
  }

  private contains(boundary: Rectangle, point: Point): boolean {
    return (
      point.x >= boundary.x &&
      point.x < boundary.x + boundary.width &&
      point.y >= boundary.y &&
      point.y < boundary.y + boundary.height
    );
  }

  private intersects(a: Rectangle, b: Rectangle): boolean {
    return !(
      b.x > a.x + a.width ||
      b.x + b.width < a.x ||
      b.y > a.y + a.height ||
      b.y + b.height < a.y
    );
  }

  clear(): void {
    this.points = [];
    this.divided = false;
    this.northeast = undefined;
    this.northwest = undefined;
    this.southeast = undefined;
    this.southwest = undefined;
  }
}
