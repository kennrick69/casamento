'use client';

// variant: 4 = 4 cadeiras (2+2), 6 = 6 cadeiras (3+2), imperial = mesa dos noivos longa
type Variant = 'rect4' | 'rect6' | 'imperial16';

interface Props {
  posX: number; posZ: number; rotation: number;
  variant?: Variant; color?: string; chairColor?: string;
}

const SIZES: Record<Variant, [number, number, number]> = {
  rect4:      [1.8, 0.08, 0.9],
  rect6:      [2.4, 0.08, 0.9],
  imperial16: [5.0, 0.08, 1.1],
};
const SEAT_COUNTS: Record<Variant, number[]> = {
  rect4:      [2, 2],  // [lado longo A, lado longo B]
  rect6:      [3, 3],
  imperial16: [7, 7],
};

export function TableRect({ posX, posZ, rotation, variant = 'rect6', color = '#C8A96A', chairColor = '#7B4F2E' }: Props) {
  const [lx, ly, lz] = SIZES[variant];
  const [nA, nB] = SEAT_COUNTS[variant];
  const tableHeight = 0.74;

  const sideChairs = (n: number, side: number) =>
    Array.from({ length: n }, (_, i) => {
      const step = lx / (n + 1);
      return { x: -lx / 2 + step * (i + 1), z: side * (lz / 2 + 0.55) };
    });

  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Tampo */}
      <mesh position={[0, tableHeight, 0]}>
        <boxGeometry args={[lx, ly, lz]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Pernas */}
      {[[-lx / 2 + 0.15, -lz / 2 + 0.15], [lx / 2 - 0.15, -lz / 2 + 0.15],
        [-lx / 2 + 0.15, lz / 2 - 0.15], [lx / 2 - 0.15, lz / 2 - 0.15]].map(([px, pz], i) => (
        <mesh key={i} position={[px, tableHeight / 2, pz]}>
          <boxGeometry args={[0.1, tableHeight, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {/* Cadeiras lado -Z */}
      {sideChairs(nA, -1).map((c, i) => (
        <mesh key={`a${i}`} position={[c.x, 0.22, c.z]}>
          <boxGeometry args={[0.4, 0.07, 0.4]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
      ))}
      {/* Cadeiras lado +Z */}
      {sideChairs(nB, 1).map((c, i) => (
        <mesh key={`b${i}`} position={[c.x, 0.22, c.z]}>
          <boxGeometry args={[0.4, 0.07, 0.4]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
      ))}
    </group>
  );
}
