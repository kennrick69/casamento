'use client';

interface Props {
  posX: number; posZ: number; rotation: number;
  seats?: number; color?: string; chairColor?: string;
}

export function TableRound({ posX, posZ, rotation, seats = 8, color = '#C8A96A', chairColor = '#7B4F2E' }: Props) {
  const radius = seats <= 6 ? 0.9 : seats <= 8 ? 1.05 : 1.25;
  const chairs = Array.from({ length: seats }, (_, i) => {
    const a = (i / seats) * Math.PI * 2;
    return { x: Math.sin(a) * (radius + 0.55), z: Math.cos(a) * (radius + 0.55), a };
  });

  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Tampo */}
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[radius * 1.9, 0.08, radius * 1.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Pé central */}
      <mesh position={[0, 0.37, 0]}>
        <boxGeometry args={[0.18, 0.74, 0.18]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cadeiras */}
      {chairs.map((c, i) => (
        <mesh key={i} position={[c.x, 0.22, c.z]}>
          <boxGeometry args={[0.42, 0.07, 0.42]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
      ))}
    </group>
  );
}
