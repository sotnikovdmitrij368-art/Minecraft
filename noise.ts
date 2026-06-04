// Improved noise implementation (Perlin Noise)
export class ImprovedNoise {
  private p: Int32Array;

  constructor(seed: number = 12345) {
    this.p = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }
    // Shuffle using seed-based pseudo-randomness
    let random = this.splitMix32(seed);
    for (let i = 255; i > 0; i--) {
      const r = Math.floor(random() * (i + 1));
      const temp = this.p[i];
      this.p[i] = this.p[r];
      this.p[r] = temp;
    }
  }

  private splitMix32(a: number) {
    return () => {
      a |= 0;
      a = (a + 0x9e3779b9) | 0;
      let t = a ^ (a >>> 16);
      t = Math.imul(t, 0x21f0aa7d);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise2D(x: number, y: number): number {
    return this.noise(x, y, 0);
  }

  public noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y;
    const AA = this.p[A & 255] + Z;
    const AB = this.p[(A + 1) & 255] + Z;
    const B = this.p[(X + 1) & 255] + Y;
    const BA = this.p[B & 255] + Z;
    const BB = this.p[(B + 1) & 255] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(this.p[AA & 255], x, y, z), this.grad(this.p[BA & 255], x - 1, y, z)),
        this.lerp(u, this.grad(this.p[AB & 255], x, y - 1, z), this.grad(this.p[BB & 255], x - 1, y - 1, z))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(this.p[(AA + 1) & 255], x, y, z - 1), this.grad(this.p[(BA + 1) & 255], x - 1, y, z - 1)),
        this.lerp(
          u,
          this.grad(this.p[(AB + 1) & 255], x, y - 1, z - 1),
          this.grad(this.p[(BB + 1) & 255], x - 1, y - 1, z - 1)
        )
      )
    );
  }

  // Fractional Brownian Motion for complex landscapes
  public fbm2D(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value / maxValue;
  }
}
